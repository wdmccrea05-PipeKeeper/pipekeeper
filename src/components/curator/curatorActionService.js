const BASE_ACTION_TIMEOUT_MS = 30000;
const FIND_SIMILAR_TIMEOUT_MS = 15000;

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
    : BASE_ACTION_TIMEOUT_MS;

  console.log("[Curator] runCuratorAction", {
    actionType,
    requestId,
    timeoutMs,
    anchorOverrides,
    anchorCount: anchorList.length,
  });

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
        items: [],
        error: null,
      };
    }

    const normalized = normalizer(raw, { actionId: actionType });

    if (!normalized) {
      return {
        requestId,
        actionType,
        status: "error",
        summary: "",
        items: [],
        error: "Curator could not produce usable results. Please try again.",
      };
    }

    const flatItems = Array.isArray(normalized.items)
      ? normalized.items
      : Array.isArray(normalized.groups)
      ? normalized.groups.flatMap((group) => group.items || [])
      : [];

    if (flatItems.length === 0) {
      return {
        requestId,
        actionType,
        status: "empty",
        summary:
          normalized.summary ||
          "Curator reviewed your collection but found no actionable recommendations right now.",
        items: [],
        error: null,
      };
    }

    return {
      requestId,
      actionType,
      status: "success",
      summary:
        normalized.summary || `${flatItems.length} recommendations found`,
      items: flatItems,
      error: null,
    };
  } catch (error) {
    const isTimeout = String(error?.message || "")
      .toLowerCase()
      .includes("timed out");

    console.error("[Curator] runCuratorAction failed", {
      actionType,
      requestId,
      error,
      anchorCount: anchorList.length,
    });

    return {
      requestId,
      actionType,
      status: isTimeout ? "timeout" : "error",
      summary: "",
      items: [],
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