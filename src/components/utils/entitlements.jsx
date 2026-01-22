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

  const canUse = (feature) => {
    // Free - very limited features
    if (tier === "free") {
      // Free users get nothing except basic collection with limits
      return false;
    }

    // Premium
    if (tier === "premium") {
      if (feature === "UNLIMITED_COLLECTION") return true;
      if (feature === "PAIRING_BASIC") return true;

      // These are future-Pro features; allow if legacy premium user.
      const legacyProFeatures = [
        "AI_UPDATES",
        "PAIRING_ADVANCED",
        "PAIRING_REGEN",
        "ANALYTICS_STATS",
        "ANALYTICS_INSIGHTS",
        "BULK_EDIT",
        "EXPORT_REPORTS",
        "AI_IDENTIFY",
      ];

      if (legacyProFeatures.includes(feature)) return isPremiumLegacy;

      // Messaging can be Premium (your choice)
      if (feature === "MESSAGING") return true;

      return false;
    }

    // Pro
    if (tier === "pro") return true;

    return false;
  };

  return { tier, isPremiumLegacy, limits, canUse };
}