// utils/entitlements.ts
export type Tier = "free" | "premium" | "pro";

export type FeatureKey =
  | "UNLIMITED_COLLECTION"
  | "AI_UPDATES"
  | "AI_IDENTIFY"
  | "PAIRING_BASIC"
  | "PAIRING_ADVANCED"
  | "PAIRING_REGEN"
  | "ANALYTICS_STATS"
  | "ANALYTICS_INSIGHTS"
  | "EXPORT_REPORTS"
  | "BULK_EDIT"
  | "MESSAGING";

export type Entitlements = {
  tier: Tier;
  isPremiumLegacy: boolean; // grandfathered access to legacy-pro features
  limits: {
    pipes: number;
    tobaccos: number;
    photosPerItem: number;
    smokingLogs: number;
  };
  canUse: (feature: FeatureKey) => boolean;
};

const PRO_LAUNCH_CUTOFF_ISO = "2026-02-01T00:00:00.000Z"; 
// Set to the date/time you decide Pro "starts".
// Premium subscribers created before this date get legacy access.

function isBeforeProCutoff(iso?: string | null) {
  if (!iso) return false;
  return new Date(iso).getTime() < new Date(PRO_LAUNCH_CUTOFF_ISO).getTime();
}

export function buildEntitlements(input: {
  // These fields should come from your Subscription entity / subscriptionManagement
  isPaidSubscriber: boolean;
  isProSubscriber: boolean; // new
  subscriptionStartedAt?: string | null; // when user first became paid
}): Entitlements {
  const tier: Tier = input.isProSubscriber
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

  const canUse = (feature: FeatureKey) => {
    // Free
    if (tier === "free") {
      if (feature === "PAIRING_BASIC") return true;
      if (feature === "ANALYTICS_STATS") return false;
      if (feature === "AI_UPDATES") return false;
      if (feature === "AI_IDENTIFY") return false;
      if (feature === "EXPORT_REPORTS") return false;
      if (feature === "BULK_EDIT") return false;
      if (feature === "MESSAGING") return false;
      if (feature === "UNLIMITED_COLLECTION") return false;
      return false;
    }

    // Premium
    if (tier === "premium") {
      if (feature === "UNLIMITED_COLLECTION") return true;
      if (feature === "PAIRING_BASIC") return true;

      // These are future-Pro features; allow if legacy premium user.
      const legacyProFeatures: FeatureKey[] = [
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