function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeItem(item, actionType, index) {
  if (!item || !item.recordId || !item.title || !item.type) {
    return null;
  }

  return {
    id: item.id || `${actionType}_${index + 1}`,
    type: item.type,
    title: item.title,
    explanation: item.explanation || "",
    rationale: item.rationale || "",
    confidence:
      typeof item.confidence === "number" ? item.confidence : null,
    recordType: item.recordType || null,
    recordId: item.recordId,
    recordName: item.recordName || "",
    proposedChanges: item.proposedChanges || {},
    followUpPrompt:
      item.followUpPrompt ||
      `Explain why this recommendation is appropriate: ${item.title}`,
  };
}

export default function normalizeCuratorActionResult(raw, actionType) {
  const inputItems =
    asArray(raw?.items).length > 0
      ? asArray(raw.items)
      : asArray(raw?.recommendations);

  const cleanItems = inputItems
    .map((item, index) => normalizeItem(item, actionType, index))
    .filter(Boolean);

  return {
    actionType,
    summary: raw?.summary || `${cleanItems.length} recommendations found`,
    items: cleanItems,
  };
}
