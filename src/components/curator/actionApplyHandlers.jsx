// Thin re-export — canonical apply handler is applyCuratorRecommendation in curatorApplyHandlers.js
import { applyCuratorRecommendation } from "./curatorApplyHandlers.js";

export { applyCuratorRecommendation };

// Adapter: applyRecommendation → applyCuratorRecommendation (for any legacy callers)
export async function applyRecommendation(item, user) {
  return applyCuratorRecommendation(item);
}

// Adapter: applyRecommendations — apply an array sequentially
export async function applyRecommendations(items, user) {
  const results = { applied: [], failed: [] };
  for (const item of (items || [])) {
    try {
      const result = await applyCuratorRecommendation(item);
      results.applied.push({ itemId: item.id, recordId: item.recordId, recordType: item.recordType, ...result });
    } catch (err) {
      results.failed.push({ itemId: item.id, recordId: item.recordId, error: err?.message || "Unknown error" });
    }
  }
  return results;
}