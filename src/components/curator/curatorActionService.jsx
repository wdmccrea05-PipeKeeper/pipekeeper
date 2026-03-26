const BASE_ACTION_TIMEOUT_MS = 30000;
const FIND_SIMILAR_TIMEOUT_MS = 15000;

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Action timed out")), ms);
    promise
      .then((value) => { clearTimeout(timer); resolve(value); })
      .catch((error) => { clearTimeout(timer); reject(error); });
  });
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

  const timeoutMs = actionType.startsWith("find_similar")
    ? FIND_SIMILAR_TIMEOUT_MS
    : BASE_ACTION_TIMEOUT_MS;

  // Debug: confirm anchorOverrides reached the service layer
  const anchorList = Array.isArray(anchorOverrides)
    ? anchorOverrides
    : (anchorOverrides?.anchors || []);
  console.log("[Curator] runCuratorAction", {
    actionType,
    anchorOverrides,
    hasAnchors: anchorList.length > 0,
    anchorCount: anchorList.length,
  });
  console.log("[Curator] executor payload", {
    actionType,
    hasAnchors: !!(anchorOverrides && (Array.isArray(anchorOverrides) ? anchorOverrides.length : anchorOverrides?.anchors?.length)),
  });

  try {
    Promise.resolve(
      onAudit?.({ requestId, actionType, phase: "started", context })
    ).catch(() => {});

    console.log("[Curator] forwarding to executor", { actionType, anchorOverrides });
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

    const normalized = normalizer(raw, actionType);

    if (!normalized || !Array.isArray(normalized.items)) {
      return {
        requestId,
        actionType,
        status: "error",
        summary: "",
        items: [],
        error: "Curator could not produce usable results. Please try again.",
      };
    }

    if (normalized.items.length === 0) {
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
        normalized.summary ||
        `${normalized.items.length} recommendations found`,
      items: normalized.items,
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
      items: [],
      error: isTimeout
        ? "Curator took too long to respond. Please try again."
        : "Curator could not complete this action. Please try again.",
    };
  } finally {
    Promise.resolve(
      onAudit?.({ requestId, actionType, phase: "finished" })
    ).catch(() => {});
  }
}