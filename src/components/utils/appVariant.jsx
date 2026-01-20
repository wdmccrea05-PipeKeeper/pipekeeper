// src/components/utils/appVariant.jsx
import { isIOSCompanion } from "./companion";

/**
 * App Variant / Feature Flags
 *
 * Apple build policy (recommended):
 * - iOS companion build should not include:
 *   - Stripe purchase flows
 *   - “tobacco recommendation / pairing encouragement” AI that could be interpreted as promotion
 * - Keep iOS build focused on cataloging, inventory, exports, and organization tools.
 *
 * You can force Apple build using an env var:
 *   VITE_APPLE_BUILD=true
 *
 * Otherwise, we infer it from iOS companion detection (?platform=ios)
 */

function readBoolEnv(key) {
  try {
    // Vite-style envs
    const v = (import.meta?.env?.[key] || "").toString().toLowerCase();
    return v === "true" || v === "1" || v === "yes";
  } catch {
    return false;
  }
}

export const isAppleBuild = (() => {
  // Hard override first (useful for testing)
  if (readBoolEnv("VITE_APPLE_BUILD")) return true;

  // Otherwise infer from iOS wrapper
  return isIOSCompanion();
})();

/**
 * Feature gates used across the UI.
 * Keep keys stable—your code already references FEATURES.community, etc.
 */
export const FEATURES = {
  // Community / social
  community: !isAppleBuild,     // disable for iOS build unless you intentionally add moderation & policy work
  messaging: !isAppleBuild,

  // AI features
  ai_tobacconist_chat: !isAppleBuild,
  ai_pairing_matrix: !isAppleBuild,
  ai_optimizer: !isAppleBuild,
  ai_web_autofill: !isAppleBuild,

  // Safe / “utility” features that should be fine for iOS
  csv_import_export: true,
  pdf_exports: true,
  inventory_tools: true,
  pipe_photos: true,
  pipe_identification: true, // pipe-centric ID ok; if it touches tobacco recommendations, gate separately above
};