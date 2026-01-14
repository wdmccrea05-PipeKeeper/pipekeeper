// components/utils/appVariant.js

export const APP_VARIANT = (import.meta?.env?.VITE_APP_VARIANT || "full").toLowerCase();

/**
 * Base44 note:
 * - VITE_APP_VARIANT is set in Base44 Environment/Build settings (not package.json scripts).
 * - For iOS builds, set: VITE_APP_VARIANT=apple
 */
export const isAppleBuild = APP_VARIANT === "apple";

/**
 * Single source of truth for what the Apple build is allowed to include.
 * Anything false MUST be unreachable and MUST not render.
 */
export const FEATURES = {
  recommendations: !isAppleBuild,   // pairings, match scores, "best" results, "what to smoke"
  optimization: !isAppleBuild,      // collection optimizer, what-if scenario analysis
  breakInSchedules: !isAppleBuild,  // break-in instructions
  smokingLogs: !isAppleBuild,       // smoking sessions/streaks/inventory reduction based on smoking
  community: !isAppleBuild,         // social features: profiles/comments/chat around smoking
};