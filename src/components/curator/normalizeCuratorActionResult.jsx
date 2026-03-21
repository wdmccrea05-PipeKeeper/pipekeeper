/**
 * NORMALIZE CURATOR ACTION RESULT
 * 
 * Transforms ANY AI output format into the canonical action result structure.
 * Handles:
 * - Correct JSON schema
 * - Legacy "recommendations" format
 * - "underexploredOpportunities" format
 * - Broken/incomplete responses
 * 
 * FAILSAFE: if data exists but groups is empty → throw error
 */

export function normalizeCuratorActionResult(rawResult, context = {}) {
  if (!rawResult || typeof rawResult !== "object") {
    console.error("[normalizer] Invalid result type:", typeof rawResult);
    throw new Error("AI returned invalid response format");
  }

  const { actionId, executionId, collectionContext } = context;

  // CASE 1: Correct schema — groups present
  if (Array.isArray(rawResult.groups) && rawResult.groups.length > 0) {
    console.log("[normalizer] Using correct schema (groups found)");
    return buildCanonicalResult(rawResult, { actionId, executionId });
  }

  // CASE 2: Legacy format — "recommendations" array
  if (Array.isArray(rawResult.recommendations) && rawResult.recommendations.length > 0) {
    console.log("[normalizer] Transforming legacy 'recommendations' format");
    const transformed = transformRecommendationsFormat(rawResult, actionId);
    return buildCanonicalResult(transformed, { actionId, executionId });
  }

  // CASE 3: Opportunities format — "underexploredOpportunities"
  if (Array.isArray(rawResult.underexploredOpportunities) && rawResult.underexploredOpportunities.length > 0) {
    console.log("[normalizer] Transforming 'underexploredOpportunities' format");
    const transformed = transformOpportunitiesFormat(rawResult, actionId);
    return buildCanonicalResult(transformed, { actionId, executionId });
  }

  // CASE 4: Mixed data present but not mapped
  if (
    (Array.isArray(rawResult.recommendations) && rawResult.recommendations.length > 0) ||
    (Array.isArray(rawResult.underexploredOpportunities) && rawResult.underexploredOpportunities.length > 0) ||
    (rawResult.gaps && typeof rawResult.gaps === "object") ||
    (rawResult.analysis && typeof rawResult.analysis === "object")
  ) {
    console.error("[normalizer] Data present but cannot map to groups structure:", Object.keys(rawResult));
    throw new Error("Normalization failure: data exists but could not be mapped to canonical format");
  }

  // CASE 5: No data — return safe empty state
  console.log("[normalizer] No data found, returning empty state");
  return buildCanonicalResult(
    {
      actionId: actionId || "unknown",
      title: "Analysis Complete",
      summary: "No optimization opportunities found at this time.",
      groups: [],
    },
    { actionId, executionId }
  );
}

/**
 * Build canonical result structure
 */
function buildCanonicalResult(data, { actionId, executionId }) {
  return {
    actionId: data.actionId || actionId,
    title: String(data.title || "Collection Analysis").trim(),
    summary: String(data.summary || "").trim(),
    status: data.status || "completed",
    executionId,
    groups: normalizeGroups(data.groups || []),
    // Preserve coverage audit metadata if present (attached by executor)
    _audit: data._audit || undefined,
    _coverage: data._coverage || undefined,
    _contextMode: data._contextMode || undefined,
  };
}

/**
 * Transform legacy "recommendations" format to groups
 * 
 * INPUT:
 * {
 *   "recommendations": [
 *     {
 *       "specialization": "Virginia/Burley",
 *       "tobaccoTypes": ["Haunted Bookshop"]
 *     }
 *   ]
 * }
 * 
 * OUTPUT: groups structure
 */
function transformRecommendationsFormat(raw, actionId) {
  const groups = [];
  const recommendations = raw.recommendations || [];

  // Group by type if possible, otherwise create generic group
  const groupedByType = {};

  recommendations.forEach((rec, idx) => {
    let groupKey = "general_recommendations";
    let itemType = "tobacco"; // default
    let itemName = "Recommendation";

    // Try to detect type from fields
    if (rec.specialization) {
      groupKey = "specialization_opportunities";
      itemType = "tobacco";
      itemName = `${rec.specialization} Opportunity`;
    } else if (rec.pipeName || rec.pipe_name) {
      groupKey = "pipe_recommendations";
      itemType = "pipe";
      itemName = rec.pipeName || rec.pipe_name;
    } else if (rec.blendName || rec.blend_name) {
      groupKey = "tobacco_recommendations";
      itemType = "tobacco";
      itemName = rec.blendName || rec.blend_name;
    } else if (rec.bottleName || rec.bottle_name) {
      groupKey = "bottle_recommendations";
      itemType = "bottle";
      itemName = rec.bottleName || rec.bottle_name;
    }

    if (!groupedByType[groupKey]) {
      groupedByType[groupKey] = [];
    }

    const item = {
      id: `rec-${idx}`,
      type: itemType,
      itemId: rec.itemId || rec.item_id || null,
      itemName,
      issue: rec.issue || rec.problem || "Identified opportunity",
      recommendation: rec.recommendation || buildRecommendationText(rec),
      proposedChange: {
        type: rec.changeType || buildChangeType(rec, itemType),
        payload: rec.payload || buildChangePayload(rec, itemType),
      },
      confidence: normalizeConfidence(rec.confidence),
    };

    groupedByType[groupKey].push(item);
  });

  // Convert grouped items to groups structure
  Object.entries(groupedByType).forEach(([groupKey, items]) => {
    groups.push({
      groupKey,
      groupTitle: groupKey
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
      priority: "medium",
      itemCount: items.length,
      items,
    });
  });

  return {
    actionId,
    title: raw.title || "Collection Recommendations",
    summary: raw.summary || `Found ${recommendations.length} recommendations`,
    groups,
  };
}

/**
 * Transform "underexploredOpportunities" format to groups
 */
function transformOpportunitiesFormat(raw, actionId) {
  const groups = [];
  const opportunities = raw.underexploredOpportunities || [];

  const items = opportunities.map((opp, idx) => ({
    id: `opp-${idx}`,
    type: opp.type || "collection",
    itemId: opp.itemId || opp.item_id || null,
    itemName: opp.name || opp.title || "Opportunity",
    issue: opp.gap || opp.issue || "Collection gap identified",
    recommendation: opp.recommendation || opp.suggestion || "Consider this opportunity",
    proposedChange: {
      type: opp.changeType || "collection_gap_analysis",
      payload: opp.payload || { opportunity: opp.name },
    },
    confidence: normalizeConfidence(opp.confidence),
  }));

  if (items.length > 0) {
    groups.push({
      groupKey: "collection_opportunities",
      groupTitle: "Collection Opportunities",
      priority: "medium",
      itemCount: items.length,
      items,
    });
  }

  return {
    actionId,
    title: raw.title || "Collection Opportunities",
    summary: raw.summary || `Identified ${items.length} opportunities`,
    groups,
  };
}

/**
 * Normalize groups array
 */
function normalizeGroups(groups) {
  if (!Array.isArray(groups)) {
    return [];
  }

  return groups
    .map((group, idx) => normalizeGroup(group, idx))
    .filter((g) => g && g.items && g.items.length > 0);
}

/**
 * Normalize single group
 */
function normalizeGroup(group, idx) {
  if (!group || typeof group !== "object") {
    return null;
  }

  const items = normalizeItems(group.items || []);

  if (items.length === 0) {
    return null;
  }

  return {
    groupKey: String(group.groupKey || `group_${idx}`).trim(),
    groupTitle: String(group.groupTitle || `Group ${idx + 1}`).trim(),
    priority: normalizePriority(group.priority),
    itemCount: items.length,
    items,
  };
}

/**
 * Normalize items array
 */
function normalizeItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item, idx) => normalizeItem(item, idx))
    .filter((i) => i !== null);
}

/**
 * Normalize single item
 */
function normalizeItem(item, idx) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const normalized = {
    id: String(item.id || `rec_${idx}`).trim(),
    type: normalizeItemType(String(item.type || "").toLowerCase()),
    itemId: String(item.itemId || item.item_id || "").trim() || null,
    itemName: String(item.itemName || item.item_name || "Unknown Item").trim(),
    issue: String(item.issue || "").trim(),
    recommendation: String(item.recommendation || "").trim(),
    proposedChange: normalizeProposedChange(item.proposedChange),
    confidence: normalizeConfidence(item.confidence),
  };

  // Validate required fields
  if (!normalized.issue || !normalized.recommendation) {
    console.warn(
      `[normalizer] Item ${normalized.id} missing issue or recommendation, skipping`
    );
    return null;
  }

  return normalized;
}

/**
 * Normalize item type
 */
function normalizeItemType(type) {
  const valid = ["pipe", "tobacco", "bottle", "collection"];
  return valid.includes(type) ? type : "collection";
}

/**
 * Normalize proposed change
 */
function normalizeProposedChange(change) {
  if (!change || typeof change !== "object") {
    return { type: "unknown", payload: {} };
  }

  return {
    type: String(change.type || "unknown").trim(),
    payload: change.payload && typeof change.payload === "object" ? change.payload : {},
  };
}

/**
 * Normalize priority
 */
function normalizePriority(priority) {
  const valid = ["high", "medium", "low", "info"];
  const p = String(priority || "medium").toLowerCase().trim();
  return valid.includes(p) ? p : "medium";
}

/**
 * Normalize confidence
 */
function normalizeConfidence(confidence) {
  const valid = ["high", "medium", "low"];
  const c = String(confidence || "medium").toLowerCase().trim();
  return valid.includes(c) ? c : "medium";
}

/**
 * Helper: build recommendation text from record fields
 */
function buildRecommendationText(rec) {
  const parts = [];
  if (rec.specialization) parts.push(`Add blends such as: ${rec.tobaccoTypes?.join(", ") || rec.specialization}`);
  if (rec.reason) parts.push(rec.reason);
  if (rec.suggestion) parts.push(rec.suggestion);
  return parts.join(". ") || "Consider this recommendation";
}

/**
 * Helper: build change type from record
 */
function buildChangeType(rec, itemType) {
  if (rec.changeType) return rec.changeType;
  if (rec.specialization) return "tobacco_addition";
  if (itemType === "pipe") return "pipe_update";
  if (itemType === "tobacco") return "tobacco_classification";
  if (itemType === "bottle") return "bottle_update";
  return "collection_analysis";
}

/**
 * Helper: build change payload from record
 */
function buildChangePayload(rec, itemType) {
  if (rec.payload) return rec.payload;

  const payload = {};

  if (rec.specialization) {
    payload.category = rec.specialization;
    payload.suggestions = rec.tobaccoTypes || [];
  } else if (rec.pipeName || rec.pipe_name) {
    payload.pipeName = rec.pipeName || rec.pipe_name;
    payload.update = rec.update || {};
  } else if (rec.blendName || rec.blend_name) {
    payload.blendName = rec.blendName || rec.blend_name;
    payload.classification = rec.classification || {};
  } else if (rec.bottleName || rec.bottle_name) {
    payload.bottleName = rec.bottleName || rec.bottle_name;
    payload.update = rec.update || {};
  }

  return Object.keys(payload).length > 0 ? payload : {};
}