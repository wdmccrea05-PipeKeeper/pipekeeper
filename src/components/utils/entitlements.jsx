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
    
    // MUST MATCH functions/_auth/entitlements.ts — keep these lists in sync
    // Premium tier gets core Premium features only (post Feb 1, 2026 subscribers)
    // Pro-only features: PAIRING_ADVANCED, COLLECTION_OPTIMIZATION, BREAK_IN_SCHEDULE,
    //                    AI_UPDATES, AI_IDENTIFY, ANALYTICS_INSIGHTS, BULK_EDIT, EXPORT_REPORTS
    if (tier === "premium") {
      return [
        "UNLIMITED_COLLECTION",
        "SMOKING_LOG",
        "CELLAR_LOG",
        "PAIRING_MANUAL",
        "ADVANCED_FILTERS",
        "TOBACCO_LIBRARY_SYNC",
        "MESSAGING",
        "SHARE_CARDS",
        "COMMUNITY_SAFETY",
        "CONDITION_TRACKING",
        "MAINTENANCE_LOGS",
        "ROTATION_PLANNER",
        "CELLAR_AGING",
        "INVENTORY_FORECAST",
        "BLEND_JOURNAL",
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
