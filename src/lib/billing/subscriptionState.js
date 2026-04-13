/**
 * Subscription State Engine
 *
 * Normalizes a user's active subscriptions, entitlements, and user flags
 * into a single canonical state object used by the billing UI.
 *
 * This is the single source of truth for what a user currently has.
 */

import { SUBSCRIPTION_PLANS } from './subscriptionPlans';

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

const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);

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

function csvToModules(csv) {
  return String(csv || '')
    .split(',')
    .map((m) => m.trim().toLowerCase())
    .filter(Boolean);
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
  let hasPipekeeperPro = activePlanKeys.some((k) => PIPEKEEPER_PLAN_KEYS.has(k));
  let hasWhiskeykeeperPro = activePlanKeys.some((k) => WHISKEYKEEPER_PLAN_KEYS.has(k));
  let hasBundle = activePlanKeys.some((k) => BUNDLE_PLAN_KEYS.has(k));

  // Bundle also grants both module entitlements
  if (hasBundle) {
    hasPipekeeperPro = true;
    hasWhiskeykeeperPro = true;
  }

  // Legacy fallback: if no subscription records but user entity has paid_modules_csv
  if (!hasPipekeeperPro && !hasWhiskeykeeperPro && !hasBundle && user) {
    const csvModules = csvToModules(user?.paid_modules_csv);

    if (csvModules.includes('pipekeeper')) hasPipekeeperPro = true;
    if (csvModules.includes('whiskeykeeper')) hasWhiskeykeeperPro = true;

    // Detect bundle from user flags or entitlements
    const isFoundingMember = user?.isFoundingMember === true;
    const planKey = user?.plan_key || user?.planKey || null;
    const hasBundlePlanKey = planKey && BUNDLE_PLAN_KEYS.has(planKey);
    const hasFounderEntitlement =
      entitlements?.pro_founders_pipe_whiskey === true ||
      Array.isArray(user?.entitlements)
        ? user?.entitlements?.includes?.('pro_founders_pipe_whiskey')
        : false;

    if (isFoundingMember || hasBundlePlanKey || hasFounderEntitlement) {
      hasBundle = true;
      hasPipekeeperPro = true;
      hasWhiskeykeeperPro = true;
      if (planKey && !activePlanKeys.includes(planKey)) {
        activePlanKeys.push(planKey);
      }
    }
  }

  // Determine eligible upgrade actions
  const eligibleActions = [];

  if (hasBundle) {
    // Bundle users: no upgrade needed
  } else if (hasPipekeeperPro && hasWhiskeykeeperPro) {
    // Has both modules separately — can consolidate to bundle
    eligibleActions.push('upgrade_to_bundle');
  } else if (hasPipekeeperPro) {
    eligibleActions.push('upgrade_to_bundle');
    eligibleActions.push('add_whiskeykeeper_module');
  } else if (hasWhiskeykeeperPro) {
    eligibleActions.push('upgrade_to_bundle');
    eligibleActions.push('add_pipekeeper_module');
  }
  // Free users have no eligible upgrade actions in this list;
  // they see the full plan menu instead.

  return {
    hasPipekeeperPro,
    hasWhiskeykeeperPro,
    hasBundle,
    activePlanKeys,
    eligibleActions,
  };
}

/**
 * Returns true if the user is a free/unpaid subscriber (no active plan).
 */
export function isFreeUser(subscriptionState) {
  const { hasPipekeeperPro, hasWhiskeykeeperPro, hasBundle } = subscriptionState;
  return !hasPipekeeperPro && !hasWhiskeykeeperPro && !hasBundle;
}

/**
 * Returns a display-safe label for the user's current plan.
 */
export function getCurrentPlanLabel(subscriptionState) {
  const { hasPipekeeperPro, hasWhiskeykeeperPro, hasBundle } = subscriptionState;
  if (hasBundle) return 'Founders Bundle';
  if (hasPipekeeperPro && hasWhiskeykeeperPro) return 'PipeKeeper Pro + WhiskeyKeeper Pro';
  if (hasPipekeeperPro) return 'PipeKeeper Pro';
  if (hasWhiskeykeeperPro) return 'WhiskeyKeeper Pro';
  return null;
}
