/**
 * Thin re-export — canonical aiEligibility lives at @/platform/aiEligibility.
 * All new imports must use @/platform/aiEligibility directly.
 */
export {
  isItemAiEligible,
  filterAiEligibleItems,
  filterAiExcludedItems,
  getAiEligibilityStats,
} from "@/platform/aiEligibility";
