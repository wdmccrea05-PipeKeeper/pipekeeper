const ACTION_TIMEOUT_MS = 90000;

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Action timed out")), ms);

    promise
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

  try {
    Promise.resolve(
      onAudit?.({ requestId, actionType, phase: "started", context })
    ).catch(() => {});

    const raw = await withTimeout(
      executor({ actionType, context, requestId, anchorOverrides }),
      ACTION_TIMEOUT_MS
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