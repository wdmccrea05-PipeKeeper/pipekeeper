// functions/_platform/aiEligibility.ts
// Shared AI eligibility service (backend) — mirrors src/platform/aiEligibility.js.
//
// The ai_excluded flag is treated as a PLATFORM-LEVEL rule. Any backend function
// that generates AI-driven output must filter items through this service before
// processing them.
//
// Items excluded from AI STILL count toward:
//   - collection value
//   - inventory counts
//   - report inclusion
//   - public/private collection totals

import type { PlatformItem } from "./itemModel.ts";

type ItemLike = Partial<PlatformItem> & Record<string, unknown>;

/**
 * Returns true if the item is eligible for AI recommendations.
 */
export function isItemAiEligible(item: ItemLike): boolean {
  if (!item) return false;
  return !item.ai_excluded;
}

/**
 * Filter an array of items to only those eligible for AI processing.
 */
export function filterAiEligibleItems<T extends ItemLike>(items: T[]): T[] {
  if (!Array.isArray(items)) return [];
  return items.filter(isItemAiEligible);
}

/**
 * Filter an array of items to only those explicitly excluded from AI.
 */
export function filterAiExcludedItems<T extends ItemLike>(items: T[]): T[] {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => item && Boolean(item.ai_excluded));
}

/**
 * Compute AI eligibility statistics for a collection of items.
 */
export function getAiEligibilityStats(items: ItemLike[]): {
  total: number;
  eligible: number;
  excluded: number;
} {
  if (!Array.isArray(items)) return { total: 0, eligible: 0, excluded: 0 };
  const eligible = items.filter(isItemAiEligible).length;
  return {
    total: items.length,
    eligible,
    excluded: items.length - eligible,
  };
}
