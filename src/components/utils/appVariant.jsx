// src/utils/appVariant.js

export const APP_VARIANT = (import.meta?.env?.VITE_APP_VARIANT || "full").toLowerCase();
export const isAppleBuild = APP_VARIANT === "apple";

/**
 * FEATURES set to false are *not allowed* in the Apple build.
 * This is your single source of truth.
 */
export const FEATURES = {
  recommendations: !isAppleBuild,   // Pairings / scoring / "top matches"
  optimization: !isAppleBuild,      // CollectionOptimizer / what-if
  breakInSchedules: !isAppleBuild,  // BreakInSchedule instructions
  smokingLogs: !isAppleBuild,       // SmokingLogPanel/Editor
  community: !isAppleBuild,         // Community social content
};