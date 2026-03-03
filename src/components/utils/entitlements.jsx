// utils/entitlements.js
export const PRO_LAUNCH_CUTOFF_ISO = "2026-02-01T00:00:00.000Z";

function isBeforeProCutoff(iso) {
  if (!iso) return false;
  return new Date(iso).getTime() < new Date(PRO_LAUNCH_CUTOFF_ISO).getTime();
}

export function buildEntitlements(input) {
  const tier = input.isProSubscriber
    ? "pro"
    : input.isPaidSubscriber
      ? "premium"
      : "free";

  const isPremiumLegacy =
    tier === "premium" && isBeforeProCutoff(input.subscriptionStartedAt);

  const limits =
    tier === "free"
      ? { pipes: 5, tobaccos: 10, photosPerItem: 3, smokingLogs: 50 }
      : { pipes: Infinity, tobaccos: Infinity, photosPerItem: Infinity, smokingLogs: Infinity };

  // Helper to check if feature is available for current tier + legacy status
  const featureAvailable = (featureKey) => {
    // Pro tier gets everything
    if (tier === "pro") return true;
    
    // Legacy Premium (subscribed before Feb 1, 2026) gets ALL features
    if (tier === "premium" && isPremiumLegacy) {
      return true;
    }
    
    // Premium tier gets core Premium features
    // Pro-only features: BULK_EDIT, AI_IDENTIFY, AI_VALUE_LOOKUP, EXPORT_REPORTS, etc.
    if (tier === "premium") {
      return [
        "UNLIMITED_COLLECTION",
        "SMOKING_LOG",
        "CELLAR_LOG",
        "PAIRING_MANUAL",
        "PAIRING_BASIC",
        "PAIRING_ADVANCED",
        "PAIRING_MATRIX_AI",
        "MATCHING_ENGINE",
        "ADVANCED_FILTERS",
        "MESSAGING",
        "TOBACCO_LIBRARY_SYNC",
        "SHARE_CARDS",
        "COMMUNITY_SAFETY",
        "CONDITION_TRACKING",
        "MAINTENANCE_LOGS",
        "ROTATION_PLANNER",
        "CELLAR_AGING",
        "INVENTORY_FORECAST",
        "BLEND_JOURNAL",
        "COLLECTION_OPTIMIZATION",
        "AI_UPDATES",
      ].includes(featureKey);
    }
    
    // Free tier gets nothing special
    return false;
  };

  const canUse = (feature) => {
    return featureAvailable(feature);
  };

  return { 
    tier, 
    isPremiumLegacy, 
    isFreeGrandfathered: !!input.isFreeGrandfathered,
    limits, 
    canUse 
  };
}
