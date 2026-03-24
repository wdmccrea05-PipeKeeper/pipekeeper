/**
 * NORMALIZE CURATOR ACTION RESULT
 * 
 * Takes raw AI response and normalizes to standard result schema.
 * Validates item structure and filters invalid items.
 * Handles empty results gracefully.
 */

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeItem(item, executorResult, index) {
  if (!item || !item.recordId || !item.title || !item.type) {
    return null;
  }

  return {
    id: item.id || `rec_${index}`,
    type: item.type,
    title: item.title,
    explanation: item.explanation || "",
    rationale: item.rationale || "",
    confidence:
      typeof item.confidence === "number" ? item.confidence : null,
    recordType: item.recordType || "unknown",
    recordId: item.recordId,
    recordName: item.recordName || "",
    proposedChanges: item.proposedChanges || {},
  };
}

export default function normalizeCuratorActionResult(raw, { actionId, executionId, title }) {
  // Handle case where result is already normalized (from executor)
  if (raw && raw.items && Array.isArray(raw.items) && !raw.actionType) {
    // Already a normalized structure
    return raw;
  }

  const inputItems = asArray(raw?.items).length > 0 ? asArray(raw.items) : asArray(raw?.recommendations);

  const cleanItems = inputItems
    .map((item, index) => normalizeItem(item, raw, index))
    .filter(Boolean);

  return {
    actionType: actionId || raw?.actionType || "unknown",
    summary: raw?.summary || (cleanItems.length === 0 ? "No recommendations found" : `${cleanItems.length} recommendations found`),
    items: cleanItems,
    executionId,
    title,
  };
}