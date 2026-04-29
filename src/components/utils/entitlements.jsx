/**
 * Compatibility entitlements shim.
 *
 * Legacy parts of the app still expect a three-state conceptual model:
 * free / premium / pro, with pre-cutoff premium users receiving pro-level
 * features. Runtime billing is still rendered as Free / Pro elsewhere.
 */

import { PRO_LAUNCH_CUTOFF_ISO, isLegacyPremium as resolveLegacyPremium } from './premiumAccess';

const FREE_LIMITS = {
  pipes: 5,
  tobaccos: 10,
  bottles: 10,
  photosPerItem: 20,
  smokingLogs: 100,
};

const UNLIMITED_LIMITS = {
  pipes: Infinity,
  tobaccos: Infinity,
  bottles: Infinity,
  photosPerItem: Infinity,
  smokingLogs: Infinity,
};

const PREMIUM_FEATURES = new Set([
  'UNLIMITED_COLLECTION',
  'SMOKING_LOG',
  'CELLAR_LOG',
  'SHARE_CARDS',
]);

const PRO_ONLY_FEATURES = new Set([
  'PAIRING_ADVANCED',
  'BULK_EDIT',
  'AI_IDENTIFY',
]);

function normalizeCompatInput(input = {}) {
  const tier = input?.tier;
  if (tier === 'pro' || input?.isProSubscriber) return 'pro';
  if (tier === 'premium' || input?.isPaidSubscriber) return 'premium';
  return 'free';
}

export function buildEntitlements(input = {}) {
  const tier = normalizeCompatInput(input);
  const legacyCheckInput = {
    tier,
    subscriptionStartedAt: input?.subscriptionStartedAt,
    started_at: input?.started_at,
    created_at: input?.created_at,
  };
  const legacyPremium = tier === 'premium' && resolveLegacyPremium(legacyCheckInput);
  const elevatedToPro = tier === 'pro' || legacyPremium;

  const canUse = (featureKey) => {
    if (elevatedToPro) return true;
    if (tier === 'premium') return PREMIUM_FEATURES.has(featureKey);
    return false;
  };

  return {
    tier,
    hasPro: elevatedToPro,
    isFree: tier === 'free',
    limits: tier === 'free' ? FREE_LIMITS : UNLIMITED_LIMITS,
    canUse,
    isLegacyPremium: legacyPremium,
    isFreeGrandfathered: Boolean(input?.isFreeGrandfathered),
    isOnTrial: Boolean(input?.isOnTrial),
  };
}

export { PRO_LAUNCH_CUTOFF_ISO };