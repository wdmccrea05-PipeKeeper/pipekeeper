// Pro launch cutoff - must match frontend exactly
const PRO_LAUNCH_CUTOFF_ISO = "2026-02-01T00:00:00.000Z";

// Platform module keys — must match functions/_platform/entitlements.ts
// and src/platform/entitlements.js
const PLATFORM_MODULES = {
  PIPE: "pipes",
  TOBACCO: "tobacco",
  WHISKEY: "whiskey",
  CIGAR: "cigars",
  COFFEE: "coffee",
} as const;

// Modules enabled for all current PipeKeeper subscribers.
// Extend this list when future modules are launched.
const PIPEKEEPER_ENABLED_MODULES = [PLATFORM_MODULES.PIPE, PLATFORM_MODULES.TOBACCO];

function isBeforeProLaunch(isoDate) {
  if (!isoDate) return false;
  return new Date(isoDate) < new Date(PRO_LAUNCH_CUTOFF_ISO);
}

// FIX BUG-01: Accept isOnTrial and return it in the result object
export function buildEntitlements({ isPaidSubscriber, isProSubscriber, subscriptionStartedAt, isFreeGrandfathered = false, isOnTrial = false }) {
  // Determine tier
  let tier = 'free';
  let isLegacyPremium = false;

  if (isProSubscriber) {
    tier = 'pro';
  } else if (isPaidSubscriber) {
    tier = 'premium';
    // Legacy Premium users (subscribed before Feb 1, 2026) get ALL features
    isLegacyPremium = isBeforeProLaunch(subscriptionStartedAt);
  }

  // Define limits
  const limits = {
    pipes: tier === 'free' && !isFreeGrandfathered ? 5 : Infinity,
    blends: tier === 'free' && !isFreeGrandfathered ? 10 : Infinity,
  };

  // MUST MATCH src/components/utils/entitlements.jsx — keep these lists in sync
  // Core Premium features (new premium users post Feb 1, 2026)
  const corePremiumFeatures = [
    'UNLIMITED_COLLECTION',
    'SMOKING_LOG',
    'CELLAR_LOG',
    'PAIRING_MANUAL',
    'ADVANCED_FILTERS',
    'TOBACCO_LIBRARY_SYNC',
    'MESSAGING',
    'SHARE_CARDS',
    'COMMUNITY_SAFETY',
    'CONDITION_TRACKING',
    'MAINTENANCE_LOGS',
    'ROTATION_PLANNER',
    'CELLAR_AGING',
    'INVENTORY_FORECAST',
    'BLEND_JOURNAL',
  ];

  // Free tier features
  const freeTierFeatures = [
    'BASIC_COLLECTION',
    'SEARCH',
    'COMMUNITY_BROWSE',
    'MULTILINGUAL',
  ];

  // Pro-only features
  const proOnlyFeatures = [
    'PAIRING_ADVANCED',
    'COLLECTION_OPTIMIZATION',
    'BREAK_IN_SCHEDULE',
    'AI_UPDATES',
    'AI_IDENTIFY',
    'ANALYTICS_INSIGHTS',
    'BULK_EDIT',
    'EXPORT_REPORTS',
  ];

  const canUse = (feature) => {
    // Pro tier gets everything
    if (tier === 'pro') return true;

    // Legacy Premium (subscribed before Feb 1, 2026) gets ALL features
    if (tier === 'premium' && isLegacyPremium) return true;

    // New Premium (post Feb 1, 2026) gets only core premium features
    if (tier === 'premium' && !isLegacyPremium) {
      return corePremiumFeatures.includes(feature);
    }

    // Free tier gets free-tier features
    if (tier === 'free') {
      return freeTierFeatures.includes(feature);
    }

    return false;
  };

  // Module entitlements — current PipeKeeper build enables pipes and tobacco for all tiers.
  // Future modules (whiskey, cigars, coffee) will be added here when launched.
  const enabledModules = PIPEKEEPER_ENABLED_MODULES;
  const moduleEntitlements = Object.fromEntries(
    Object.values(PLATFORM_MODULES).map((m) => [m, { enabled: enabledModules.includes(m) }])
  );

  return {
    tier,
    isLegacyPremium,
    // FIX ISSUE-09: Include isFreeGrandfathered so FeatureGate can reference it via useEntitlements()
    isFreeGrandfathered: !!isFreeGrandfathered,
    // FIX BUG-01: Include isOnTrial so callers can display/use trial state
    isOnTrial: !!isOnTrial,
    limits,
    canUse,
    // Platform module entitlements — pipes and tobacco are always enabled in this build.
    modules: moduleEntitlements,
  };
}