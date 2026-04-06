const BASE_ACTION_TIMEOUT_MS = 30000;
const FIND_SIMILAR_TIMEOUT_MS = 15000;
const PAIRING_TIMEOUT_MS = 45000;

// Pairing actions are more complex (cross-module analysis) and need extra time
const PAIRING_ACTION_TYPES = new Set([
  'cigar_pairing_suggestions',
  'session_builder',
]);

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Action timed out")), ms);

    Promise.resolve(promise)
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function getAnchorList(anchorOverrides) {
  if (Array.isArray(anchorOverrides)) return anchorOverrides.filter(Boolean);
  if (Array.isArray(anchorOverrides?.anchors)) {
    return anchorOverrides.anchors.filter(Boolean);
  }
  return [];
}

function flattenGroups(groups) {
  if (!Array.isArray(groups)) return [];
  return groups.flatMap((group) =>
    Array.isArray(group?.items) ? group.items : []
  );
}

export async function runCuratorAction({
  actionType,
  executor,
  normalizer,
  context,
  onAudit,
  anchorOverrides,
}) {
  const requestId =
    globalThis.crypto?.randomUUID?.() ||
    `curator_${actionType}_${Date.now()}`;

  const anchorList = getAnchorList(anchorOverrides);
  const timeoutMs = String(actionType || "").startsWith("find_similar")
    ? FIND_SIMILAR_TIMEOUT_MS
    : PAIRING_ACTION_TYPES.has(actionType)
    ? PAIRING_TIMEOUT_MS
    : BASE_ACTION_TIMEOUT_MS;

  try {
    Promise.resolve(
      onAudit?.({
        requestId,
        actionType,
        phase: "started",
        context,
        anchorOverrides,
      })
    ).catch(() => {});

    const raw = await withTimeout(
      executor({ actionType, context, requestId, anchorOverrides }),
      timeoutMs
    );

    if (!raw) {
      return {
        requestId,
        actionType,
        status: "empty",
        summary: "No actionable recommendations returned.",
        groups: [],
        items: [],
        metadata: {
          anchorCount: anchorList.length,
        },
        error: null,
      };
    }

    const normalized = normalizer(raw, {
      actionId: actionType,
      context,
    });

    if (!normalized) {
      return {
        requestId,
        actionType,
        status: "error",
        summary: "",
        groups: [],
        items: [],
        metadata: {
          anchorCount: anchorList.length,
        },
        error: "Curator could not produce usable results. Please try again.",
      };
    }

    const groups = Array.isArray(normalized.groups)
      ? normalized.groups.filter(Boolean)
      : [];

    const items = Array.isArray(normalized.items)
      ? normalized.items.filter(Boolean)
      : flattenGroups(groups);

    if (groups.length === 0 && items.length === 0) {
      return {
        requestId,
        actionType,
        status: "empty",
        summary:
          normalized.summary ||
          "Curator reviewed your collection but found no actionable recommendations right now.",
        groups: [],
        items: [],
        metadata: {
          anchorCount: anchorList.length,
        },
        error: null,
      };
    }

    return {
      requestId,
      actionType,
      status: "success",
      summary:
        normalized.summary ||
        `${items.length} recommendation${items.length === 1 ? "" : "s"} found`,
      groups,
      items,
      metadata: {
        anchorCount: anchorList.length,
        groupCount: groups.length,
        itemCount: items.length,
        ...(normalized.metadata || {}),
      },
      error: null,
    };
  } catch (error) {
    const isTimeout = String(error?.message || "")
      .toLowerCase()
      .includes("timed out");

    return {
      requestId,
      actionType,
      status: isTimeout ? "timeout" : "error",
      summary: "",
      groups: [],
      items: [],
      metadata: {
        anchorCount: anchorList.length,
      },
      error: isTimeout
        ? "Curator took too long to respond. Please try again."
        : "Curator could not complete this action. Please try again.",
    };
  } finally {
    Promise.resolve(
      onAudit?.({
        requestId,
        actionType,
        phase: "finished",
        anchorOverrides,
      })
    ).catch(() => {});
  }
}

export default runCuratorAction;