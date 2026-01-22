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
    // Pro tier gets everything
    if (tier === "pro") return true;
    
    // Trial users (free tier but in 7-day window) cannot use Pro-only features
    if (input.isOnTrial && tier === "free") {
      return false;
    }
    
    // Legacy Premium (subscribed before Feb 1, 2026) gets ALL features
    if (tier === "premium" && isPremiumLegacy) {
      return true;
    }
    
    // New Premium (post Feb 1, 2026) gets only core Premium features
    // Pro-only features: BULK_EDIT, AI_IDENTIFY, AI_VALUE_LOOKUP, EXPORT_REPORTS, etc.
    if (tier === "premium") {
      return ["UNLIMITED_COLLECTION", "PAIRING_BASIC", "MATCHING_ENGINE", "MESSAGING"].includes(featureKey);
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