/**
 * Subscription State Engine
 *
 * Normalizes a user's active subscriptions, entitlements, and user flags
 * into a single canonical state object used by the billing UI.
 *
 * This is the single source of truth for what a user currently has.
 */

import { SUBSCRIPTION_PLANS } from './subscriptionPlans';
import { isModuleLaunched } from '@/components/utils/moduleReleaseState';

const MODULE_KEYS = ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];

const BUNDLE_PLAN_KEYS = new Set(
  Object.values(SUBSCRIPTION_PLANS)
    .filter((p) => p.type === 'bundle')
    .map((p) => p.key)
);

const PIPEKEEPER_PLAN_KEYS = new Set(
  Object.values(SUBSCRIPTION_PLANS)
    .filter((p) => p.module === 'pipekeeper')
    .map((p) => p.key)
);

const WHISKEYKEEPER_PLAN_KEYS = new Set(
  Object.values(SUBSCRIPTION_PLANS)
    .filter((p) => p.module === 'whiskeykeeper')
    .map((p) => p.key)
);
const CIGARKEEPER_PLAN_KEYS = new Set(
  Object.values(SUBSCRIPTION_PLANS)
    .filter((p) => p.module === 'cigarkeeper')
    .map((p) => p.key)
);
const WINEKEEPER_PLAN_KEYS = new Set(
  Object.values(SUBSCRIPTION_PLANS)
    .filter((p) => p.module === 'winekeeper')
    .map((p) => p.key)
);

const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);
const PUBLIC_PURCHASABLE_MODULES = ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper']
  .filter((moduleKey) => isModuleLaunched(moduleKey));

function isActiveSubscription(sub) {
  const status = String(sub?.status || '').toLowerCase();
  return ACTIVE_STATUSES.has(status);
}

function normalizePlanKey(sub) {
  return (
    sub?.plan_key ||
    sub?.planKey ||
    sub?.plan ||
    null
  );
}

function csvToValidModules(csv) {
  const modules = String(csv || '')
    .split(',')
    .map((m) => m.trim().toLowerCase())
    .filter((m) => MODULE_KEYS.includes(m));
  return [...new Set(modules)];
}

/**
 * Returns the canonical subscription state for a user.
 *
 * @param {object} params
 * @param {Array}  params.activeSubscriptions - Subscription entity rows (may be empty)
 * @param {object} params.entitlements - Entitlement flags (optional)
 * @param {object} params.user - User entity (optional, used for legacy fallback)
 * @returns {object} Normalized state
 */
export function getUserSubscriptionState({
  activeSubscriptions = [],
  entitlements = {},
  user = null,
}) {
  // Collect active plan keys from subscription records
  const activeSubs = Array.isArray(activeSubscriptions)
    ? activeSubscriptions.filter(isActiveSubscription)
    : [];

  const activePlanKeys = activeSubs
    .map(normalizePlanKey)
    .filter(Boolean)
    .filter((k) => SUBSCRIPTION_PLANS[k] != null);

  // Determine which modules are covered by active plans
  const modulesFromActivePlans = [...new Set(
    activePlanKeys.flatMap((k) => SUBSCRIPTION_PLANS[k]?.modules || [])
  )];

  let hasPipekeeperPro = activePlanKeys.some((k) => PIPEKEEPER_PLAN_KEYS.has(k));
  let hasWhiskeykeeperPro = activePlanKeys.some((k) => WHISKEYKEEPER_PLAN_KEYS.has(k));
  let hasCigarkeeperPro = activePlanKeys.some((k) => CIGARKEEPER_PLAN_KEYS.has(k));
  let hasWinekeeperPro = activePlanKeys.some((k) => WINEKEEPER_PLAN_KEYS.has(k));
  let hasBundle = activePlanKeys.some((k) => BUNDLE_PLAN_KEYS.has(k));
  let paidModules = [...modulesFromActivePlans];

  // Legacy fallback: if no active subscription modules, use user-level canonical fields.
  if (paidModules.length === 0 && user) {
    const csvModules = csvToValidModules(user?.paid_modules_csv);
    paidModules = [...csvModules];

    // Detect bundle from user flags or entitlements
    const isFoundingMember = user?.isFoundingMember === true;
    const planKey = user?.plan_key || user?.planKey || null;
    const hasBundlePlanKey = planKey && BUNDLE_PLAN_KEYS.has(planKey);
    const hasFounderEntitlement =
      entitlements?.pro_founders_pipe_whiskey === true ||
      (Array.isArray(user?.entitlements) && user.entitlements.includes('pro_founders_pipe_whiskey'));

    if (isFoundingMember || hasBundlePlanKey || hasFounderEntitlement) {
      hasBundle = true;
      paidModules = [...new Set(['pipekeeper', 'whiskeykeeper', ...paidModules])];
      if (planKey && !activePlanKeys.includes(planKey)) {
        activePlanKeys.push(planKey);
      }
    }

    // Final fallback to explicit per-module booleans
    if (paidModules.length === 0) {
      if (user?.pipekeeper_paid) paidModules.push('pipekeeper');
      if (user?.whiskeykeeper_paid) paidModules.push('whiskeykeeper');
      if (user?.cigarkeeper_paid) paidModules.push('cigarkeeper');
      if (user?.winekeeper_paid) paidModules.push('winekeeper');
    }
  }

  hasPipekeeperPro = hasPipekeeperPro || paidModules.includes('pipekeeper');
  hasWhiskeykeeperPro = hasWhiskeykeeperPro || paidModules.includes('whiskeykeeper');
  hasCigarkeeperPro = hasCigarkeeperPro || paidModules.includes('cigarkeeper');
  hasWinekeeperPro = hasWinekeeperPro || paidModules.includes('winekeeper');

  // Determine whether this is a "full" bundle (all 3 public modules) or partial (Founders only)
  const isThreeModuleBundle = activePlanKeys.some((k) => String(k).includes('three_module_bundle'));
  const isFourModuleBundle = activePlanKeys.some((k) => String(k).includes('four_module_bundle'));
  const isFoundersOnlyBundle = hasBundle && !isThreeModuleBundle && !isFourModuleBundle;
  const hasAllThree = hasPipekeeperPro && hasWhiskeykeeperPro && hasCigarkeeperPro;
  const hasAllFour = hasAllThree && hasWinekeeperPro;
  // Full coverage depends on whether WineKeeper is launched:
  // - WineKeeper launched: requires all 4 modules (or 4-module bundle)
  // - WineKeeper not launched: requires all 3 core modules (or 3-module bundle)
  // Note: a 4-module bundle holder when WineKeeper is not yet launched is treated as
  // having full coverage (hasAllThree = true) — they are not shown additional upgrade
  // options since they already own all publicly available modules.
  const isWinekeeperLaunched = isModuleLaunched('winekeeper');
  const hasFullCoverage = isWinekeeperLaunched
    ? (isFourModuleBundle || hasAllFour)
    : (isThreeModuleBundle || hasAllThree);

  // Determine eligible upgrade actions
  const eligibleActions = [];

  const hasAnyPaidModule = hasPipekeeperPro || hasWhiskeykeeperPro || hasCigarkeeperPro || hasWinekeeperPro;

  // Full coverage users have nothing left to upgrade to
  if (!hasFullCoverage && hasAnyPaidModule) {
    const paidModuleMap = {
      pipekeeper: hasPipekeeperPro,
      whiskeykeeper: hasWhiskeykeeperPro,
      cigarkeeper: hasCigarkeeperPro,
      winekeeper: hasWinekeeperPro,
    };

    for (const moduleKey of PUBLIC_PURCHASABLE_MODULES) {
      if (!paidModuleMap[moduleKey]) {
        eligibleActions.push(`add_${moduleKey}_module`);
      }
    }

    // Offer Founders bundle upgrade to individual PK or WK subscribers (not already on any bundle)
    if (!hasBundle && (hasPipekeeperPro || hasWhiskeykeeperPro)) {
      eligibleActions.push('upgrade_to_bundle');
    }

    // Offer 3-module bundle upgrade if user doesn't already have all 3 core modules
    if (!isThreeModuleBundle && !isFourModuleBundle) {
      eligibleActions.push('upgrade_to_three_module_bundle');
    }

    // Offer 4-module bundle upgrade when WineKeeper is launched and user lacks all 4
    if (isWinekeeperLaunched && !isFourModuleBundle) {
      eligibleActions.push('upgrade_to_four_module_bundle');
    }
  }
  // Free users have no eligible upgrade actions in this list;
  // they see the full plan menu instead.

  return {
    hasPipekeeperPro,
    hasWhiskeykeeperPro,
    hasCigarkeeperPro,
    hasWinekeeperPro,
    hasBundle,
    isFoundersOnlyBundle,
    isThreeModuleBundle,
    isFourModuleBundle,
    hasFullCoverage,
    paidModules,
    moduleFlags: {
      pipekeeper: hasPipekeeperPro,
      whiskeykeeper: hasWhiskeykeeperPro,
      cigarkeeper: hasCigarkeeperPro,
      winekeeper: hasWinekeeperPro,
    },
    activePlanKeys,
    eligibleActions,
  };
}

/**
 * Returns true if the user is a free/unpaid subscriber (no active plan).
 */
export function isFreeUser(subscriptionState) {
  if (!subscriptionState) return true;
  const paidCount = Array.isArray(subscriptionState.paidModules)
    ? subscriptionState.paidModules.length
    : 0;
  return paidCount === 0;
}

/**
 * Returns a display-safe label for the user's current plan.
 */
export function getCurrentPlanLabel(subscriptionState) {
  const {
    hasPipekeeperPro,
    hasWhiskeykeeperPro,
    hasCigarkeeperPro,
    hasWinekeeperPro,
    hasBundle,
    activePlanKeys = [],
    paidModules = [],
  } = subscriptionState || {};

  if (hasBundle) {
    if (activePlanKeys.some((k) => String(k).includes('four_module'))) return '4-Module Bundle';
    if (activePlanKeys.some((k) => String(k).includes('three_module'))) return '3-Module Bundle';
    // Founders bundle + separately purchased CigarKeeper
    if (hasCigarkeeperPro) return 'Founders Bundle + CigarKeeper';
    return 'Founders Bundle';
  }

  if (paidModules.length > 1) {
    return paidModules
      .map((m) =>
        m === 'pipekeeper' ? 'PipeKeeper' :
        m === 'whiskeykeeper' ? 'WhiskeyKeeper' :
        m === 'cigarkeeper' ? 'CigarKeeper' :
        m === 'winekeeper' ? 'WineKeeper' : m
      )
      .join(' + ') + ' Pro';
  }

  if (hasPipekeeperPro) return 'PipeKeeper Pro';
  if (hasWhiskeykeeperPro) return 'WhiskeyKeeper Pro';
  if (hasCigarkeeperPro) return 'CigarKeeper Pro';
  if (hasWinekeeperPro) return 'WineKeeper Pro';
  return null;
}