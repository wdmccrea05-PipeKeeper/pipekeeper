/**
 * CURATOR ACTION SERVICE
 *
 * Orchestrates a full curator action run:
 * 1. Calls the executor (LLM call)
 * 2. Normalizes the result
 * 3. Fires the audit callback
 * 4. Returns a structured actionRun object
 */

export async function runCuratorAction({
  actionType,
  executor,
  normalizer,
  context,
  onAudit,
  anchorOverrides,
}) {
  const requestId =
    globalThis.crypto?.randomUUID?.() || `${actionType}_${Date.now()}`;

  const raw = await executor({ actionType, context, requestId, anchorOverrides });

  const normalized = normalizer(raw, actionType);

  const result = {
    requestId,
    actionType,
    status: "complete",
    summary: normalized?.summary || "",
    items: normalized?.items || [],
    error: null,
    completedAt: Date.now(),
  };

  if (onAudit) {
    try {
      await onAudit({
        event_type: "action_complete",
        action_type: actionType,
        item_count: result.items.length,
        summary: result.summary,
      });
    } catch (e) {
      // non-blocking
    }
  }

  return result;
}