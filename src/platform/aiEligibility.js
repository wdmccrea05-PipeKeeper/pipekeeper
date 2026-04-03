// platform/aiEligibility.js
// Shared platform-level AI eligibility service.
//
// The `ai_excluded` flag is treated as a PLATFORM-LEVEL rule, not a per-module
// UI toggle. Any service that generates AI-driven output — pairing recommendations,
// rotation suggestions, collection optimization, usage suggestions, or future
// cross-module recommendations — must respect this rule by filtering items through
// this service before processing them.
//
// Items excluded from AI STILL count toward:
//   - collection value
//   - inventory counts
//   - export/report inclusion
//   - public/private collection totals
//
// Only the AI recommendation pipeline excludes them.

/**
 * Returns true if the item is eligible to be included in AI recommendations.
 * Works with both raw records (ai_excluded field) and normalized platform items.
 *
 * @param {object} item - Raw or normalized item record.
 * @returns {boolean}
 */
export function isItemAiEligible(item) {
  if (!item) return false;
  if (item.ai_excluded) return false;
  if (item.scope === "collector_only") return false;
  return true;
}

/**
 * Filter an array of items to only those eligible for AI processing.
 *
 * @param {object[]} items
 * @returns {object[]}
 */
export function filterAiEligibleItems(items) {
  if (!Array.isArray(items)) return [];
  return items.filter(isItemAiEligible);
}

/**
 * Filter an array of items to only those explicitly excluded from AI.
 *
 * @param {object[]} items
 * @returns {object[]}
 */
export function filterAiExcludedItems(items) {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => item && item.ai_excluded);
}

/**
 * Compute AI eligibility statistics for a collection of items.
 * Useful for dashboard summary cards.
 *
 * @param {object[]} items
 * @returns {{ total: number, eligible: number, excluded: number }}
 */
export function getAiEligibilityStats(items) {
  if (!Array.isArray(items)) {
    return { total: 0, eligible: 0, excluded: 0 };
  }
  const eligible = items.filter(isItemAiEligible).length;
  return {
    total: items.length,
    eligible,
    excluded: items.length - eligible,
  };
}
