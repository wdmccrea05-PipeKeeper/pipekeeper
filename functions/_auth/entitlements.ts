// Pro launch cutoff - users who subscribed before this date keep AI features
const PRO_LAUNCH_CUTOFF_ISO = "2026-02-01T00:00:00Z";

function isBeforeProLaunch(isoDate) {
  if (!isoDate) return false;
  return new Date(isoDate) < new Date(PRO_LAUNCH_CUTOFF_ISO);
}

export function buildEntitlements({ isPaidSubscriber, isProSubscriber, subscriptionStartedAt, isFreeGrandfathered = false }) {
  // Determine tier
  let tier = 'free';
  let hasLegacyPremiumAI = false;

  if (isProSubscriber) {
    tier = 'pro';
  } else if (isPaidSubscriber) {
    tier = 'premium';
    // Legacy Premium users (subscribed before Feb 1, 2026) keep AI features
    hasLegacyPremiumAI = isBeforeProLaunch(subscriptionStartedAt);
  }

  // Define limits
  const limits = {
    pipes: tier === 'free' && !isFreeGrandfathered ? 5 : Infinity,
    blends: tier === 'free' && !isFreeGrandfathered ? 10 : Infinity,
  };

  // Legacy Pro features for Premium subscribers before Feb 1, 2026
  const legacyProFeatures = ['AI_UPDATES', 'AI_IDENTIFY', 'BULK_EDIT', 'EXPORT_REPORTS'];

  const canUse = (feature) => {
    const featureTiers = {
      // Free tier features
      BASIC_COLLECTION: ['free', 'premium', 'pro'],
      SEARCH: ['free', 'premium', 'pro'],
      COMMUNITY_BROWSE: ['free', 'premium', 'pro'],
      MULTILINGUAL: ['free', 'premium', 'pro'],

      // Premium tier features
      UNLIMITED_COLLECTION: ['premium', 'pro'],
      SMOKING_LOG: ['premium', 'pro'],
      CELLAR_LOG: ['premium', 'pro'],
      PAIRING_MANUAL: ['premium', 'pro'],
      ADVANCED_FILTERS: ['premium', 'pro'],
      TOBACCO_LIBRARY_SYNC: ['premium', 'pro'],
      MESSAGING: ['premium', 'pro'],
      SHARE_CARDS: ['premium', 'pro'],
      COMMUNITY_SAFETY: ['premium', 'pro'],
      CONDITION_TRACKING: ['premium', 'pro'],
      MAINTENANCE_LOGS: ['premium', 'pro'],
      ROTATION_PLANNER: ['premium', 'pro'],
      CELLAR_AGING: ['premium', 'pro'],
      INVENTORY_FORECAST: ['premium', 'pro'],
      BLEND_JOURNAL: ['premium', 'pro'],

      // Pro tier features
      PAIRING_ADVANCED: ['pro'],
      COLLECTION_OPTIMIZATION: ['pro'],
      BREAK_IN_SCHEDULE: ['pro'],
      AI_UPDATES: ['pro'],
      AI_IDENTIFY: ['pro'],
      ANALYTICS_INSIGHTS: ['pro'],
      BULK_EDIT: ['pro'],
      EXPORT_REPORTS: ['pro'],
    };

    const allowedTiers = featureTiers[feature] || [];

    // Check if user's tier includes this feature
    if (allowedTiers.includes(tier)) return true;

    // Legacy Premium AI access (grandfathered)
    if (tier === 'premium' && hasLegacyPremiumAI && legacyProFeatures.includes(feature)) {
      return true;
    }

    return false;
  };

  return {
    tier,
    hasLegacyPremiumAI,
    limits,
    canUse,
  };
}