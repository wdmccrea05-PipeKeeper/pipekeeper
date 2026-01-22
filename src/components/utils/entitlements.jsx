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
      ? { pipes: 5, tobaccos: 10, photosPerItem: 1, smokingLogs: 10 }
      : { pipes: Infinity, tobaccos: Infinity, photosPerItem: Infinity, smokingLogs: Infinity };

  // Helper to check if feature is available for current tier + legacy status
  const featureAvailable = (featureKey) => {
    if (tier === "pro") return true;
    if (tier === "premium" && isPremiumLegacy) {
      // Legacy premium gets Pro features
      const legacyProFeatures = [
        "AI_UPDATES",
        "AI_IDENTIFY",
        "PAIRING_ADVANCED",
        "PAIRING_REGEN",
        "ANALYTICS_STATS",
        "ANALYTICS_INSIGHTS",
        "BULK_EDIT",
        "EXPORT_REPORTS",
        "COLLECTION_OPTIMIZATION",
        "BREAK_IN_SCHEDULE",
      ];
      return legacyProFeatures.includes(featureKey);
    }
    if (tier === "premium") {
      // New premium users get basic features only
      return ["UNLIMITED_COLLECTION", "PAIRING_BASIC", "ANALYTICS_STATS", "MESSAGING"].includes(featureKey);
    }
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