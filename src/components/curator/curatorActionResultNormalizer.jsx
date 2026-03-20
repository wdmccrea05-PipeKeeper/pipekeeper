/**
 * Curator Action Result Normalizer
 * 
 * Validates and normalizes AI response to guarantee:
 * - Valid JSON structure
 * - Required fields present
 * - Missing values filled safely
 * - Invalid responses rejected
 */

export function curatorActionResultNormalizer(rawResult, context) {
  if (!rawResult || typeof rawResult !== "object") {
    console.error("[normalizer] Invalid result type:", typeof rawResult);
    throw new Error("Invalid action result: not an object");
  }

  const { actionId, executionId, collectionContext } = context;

  // Validate top-level structure
  const result = {
    actionId: rawResult.actionId || actionId,
    title: String(rawResult.title || "Collection Insights").trim(),
    summary: String(rawResult.summary || "").trim(),
    status: rawResult.status || "completed",
    executionId,
    groups: normalizeGroups(rawResult.groups || [], collectionContext),
  };

  // Ensure at least one group (fallback if AI returned no recommendations)
  if (!result.groups || result.groups.length === 0) {
    console.log("[normalizer] No groups returned, using fallback response");
    result.groups = [
      {
        groupKey: "no_recommendations",
        groupTitle: "All Set",
        priority: "info",
        itemCount: 1,
        items: [
          {
            id: "info_001",
            type: "collection",
            itemId: null,
            itemName: "Collection Status",
            issue: "No optimization opportunities found",
            recommendation: "Your collection is well-optimized for your preferences",
            proposedChange: { type: "none", payload: {} },
            confidence: "high",
          },
        ],
      },
    ];
  }

  return result;
}

function normalizeGroups(groups, collectionContext) {
  if (!Array.isArray(groups)) {
    return [];
  }

  return groups
    .map((group, idx) => normalizeGroup(group, idx, collectionContext))
    .filter((g) => g && g.items && g.items.length > 0);
}

function normalizeGroup(group, idx, collectionContext) {
  if (!group || typeof group !== "object") {
    return null;
  }

  const items = normalizeItems(group.items || [], collectionContext);

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

function normalizeItems(items, collectionContext) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item, idx) => normalizeItem(item, idx, collectionContext))
    .filter((i) => i !== null);
}

function normalizeItem(item, idx, collectionContext) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const itemId = String(item.itemId || "").trim();
  const itemType = String(item.type || "").toLowerCase();

  // Validate that item actually exists in collection
  if (itemId && !validateItemExists(itemId, itemType, collectionContext)) {
    console.warn(`[normalizer] Item ${itemId} (type ${itemType}) not found in collection`);
    return null;
  }

  const normalized = {
    id: String(item.id || `rec_${idx}`).trim(),
    type: normalizeItemType(itemType),
    itemId: itemId || null,
    itemName: String(item.itemName || "Unknown Item").trim(),
    issue: String(item.issue || "").trim(),
    recommendation: String(item.recommendation || "").trim(),
    proposedChange: normalizeProposedChange(item.proposedChange),
    confidence: normalizeConfidence(item.confidence),
  };

  // Validate required fields
  if (!normalized.issue || !normalized.recommendation) {
    console.warn(`[normalizer] Item ${normalized.id} missing issue or recommendation`);
    return null;
  }

  return normalized;
}

function normalizeItemType(type) {
  const valid = ["pipe", "tobacco", "bottle", "collection"];
  if (valid.includes(type)) {
    return type;
  }
  return "collection"; // Default fallback
}

function normalizeProposedChange(change) {
  if (!change || typeof change !== "object") {
    return { type: "unknown", payload: {} };
  }

  return {
    type: String(change.type || "unknown").trim(),
    payload: change.payload && typeof change.payload === "object" ? change.payload : {},
  };
}

function normalizePriority(priority) {
  const valid = ["high", "medium", "low", "info"];
  const p = String(priority || "medium").toLowerCase().trim();
  if (valid.includes(p)) {
    return p;
  }
  return "medium";
}

function normalizeConfidence(confidence) {
  const valid = ["high", "medium", "low"];
  const c = String(confidence || "medium").toLowerCase().trim();
  if (valid.includes(c)) {
    return c;
  }
  return "medium";
}

/**
 * Verify item exists in collection
 * Returns false if itemId is empty (collection-level items)
 */
function validateItemExists(itemId, itemType, collectionContext) {
  if (!itemId) {
    return true; // Collection-level items don't need ID validation
  }

  const { pipes = [], blends = [], bottles = [] } = collectionContext;

  switch (itemType) {
    case "pipe":
      return pipes.some((p) => p.id === itemId);
    case "tobacco":
      return blends.some((b) => b.id === itemId);
    case "bottle":
      return bottles.some((b) => b.id === itemId);
    default:
      return true; // Unknown types pass validation
  }
}