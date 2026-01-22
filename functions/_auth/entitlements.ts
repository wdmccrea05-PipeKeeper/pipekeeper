// Pro launch cutoff - must match frontend exactly
const PRO_LAUNCH_CUTOFF_ISO = "2026-02-01T00:00:00.000Z";

function isBeforeProLaunch(isoDate) {
  if (!isoDate) return false;
  return new Date(isoDate) < new Date(PRO_LAUNCH_CUTOFF_ISO);
}

export function buildEntitlements({ isPaidSubscriber, isProSubscriber, subscriptionStartedAt, isFreeGrandfathered = false }) {
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

  return {
    tier,
    isLegacyPremium,
    limits,
    canUse,
  };
}