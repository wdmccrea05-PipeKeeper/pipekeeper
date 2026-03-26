// ─── Helper utilities ──────────────────────────────────────────────────────

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

// ─── Item normalization ─────────────────────────────────────────────────────

function normalizeItem(rawItem, isExternalItem = false) {
  if (!rawItem || typeof rawItem !== "object") return null;

  const id = rawItem.id || `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const type = rawItem.type || "pairing_recommendation";
  const recordType = rawItem.recordType || rawItem.type;

  if (isExternalItem) {
    return {
      id,
      type: rawItem.type || "similar_item",
      recordType: rawItem.recordType || "unknown",
      title: rawItem.title || "Untitled",
      category: rawItem.category || "",
      explanation: rawItem.explanation || "",
      characteristics: ensureArray(rawItem.characteristics),
      whyFitsYou: rawItem.whyFitsYou || "",
      anchorRef: rawItem.anchorRef || "",
      group: rawItem.group || "default",
    };
  }

  return {
    id,
    type,
    recordType,
    title: rawItem.title || "Untitled Recommendation",
    explanation: rawItem.explanation || "",
    rationale: rawItem.rationale || "",
    confidence: typeof rawItem.confidence === "number" ? rawItem.confidence : 0.5,
    recordId: rawItem.recordId || "",
    recordName: rawItem.recordName || "",
    blendId: rawItem.blendId || "",
    blendName: rawItem.blendName || "",
    bottleId: rawItem.bottleId || "",
    bottleName: rawItem.bottleName || "",
    proposedChanges: rawItem.proposedChanges || {},
    followUpPrompt: rawItem.followUpPrompt || "",
  };
}

// ─── Result normalization ───────────────────────────────────────────────────

export default function normalizeCuratorActionResult(raw, actionType) {
  if (!raw) {
    return { summary: "Curator could not produce recommendations.", items: [] };
  }

  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { summary: "Curator could not process the response.", items: [] };
    }
  }

  if (!parsed || typeof parsed !== "object") {
    return { summary: "Curator response was malformed.", items: [] };
  }

  const summary = String(parsed.summary || "").trim() || "Recommendations found";
  const rawItems = ensureArray(parsed.items);

  const items = rawItems
    .map(item => {
      const isExternal = item.type === "similar_item";
      return normalizeItem(item, isExternal);
    })
    .filter(Boolean);

  // Explicit type map — no string-replace hacks
  if (actionType?.startsWith("find_similar") && items.length === 0) {
    const typeMap = {
      find_similar_blends: "blend",
      find_similar_pipes: "pipe",
      find_similar_bottles: "bottle",
    };
    const recordType = typeMap[actionType] || "item";
    return {
      summary: "We couldn't generate strong recommendations right now. Please try again.",
      items: [],
      emptyReason: `no_results_for_${recordType}`,
    };
  }

  // Build final summary anchored to actual results for similar actions
  let finalSummary = summary;
  if (actionType?.startsWith("find_similar")) {
    const anchorRefs = items
      .filter(item => item.anchorRef)
      .map(item => item.anchorRef)
      .filter((v, i, a) => a.indexOf(v) === i);
    if (anchorRefs.length === 1) {
      finalSummary = `Recommendations similar to "${anchorRefs[0]}"`;
    } else if (anchorRefs.length > 1) {
      finalSummary = `Recommendations based on: ${anchorRefs.join(", ")}`;
    }
  }

  return { summary: finalSummary, items };
}