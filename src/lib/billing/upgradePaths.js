/**
 * Upgrade Paths — Pure function that computes available billing actions
 * for a user based on their current subscription state.
 *
 * Returns UI-ready option objects that drive the billing modal.
 */

import { SUBSCRIPTION_PLANS, getPreferredPlanKeyForModule } from './subscriptionPlans';
import { getModuleReleaseState } from '@/components/utils/moduleReleaseState';

const PUBLIC_BILLING_MODULES = ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'];

function isPubliclyLaunched(moduleKey) {
  return getModuleReleaseState(moduleKey) === 'launched';
}

/**
 * Returns the most relevant current plan key for a module.
 * Prefers annual over monthly.
 */
function pickCurrentPlanKey(activePlanKeys, moduleKey) {
  const annual = activePlanKeys.find((k) => k === `${moduleKey}_pro_annual`);
  if (annual) return annual;
  const monthly = activePlanKeys.find((k) => k === `${moduleKey}_pro_monthly`);
  if (monthly) return monthly;
  return activePlanKeys[0] || null;
}

/**
 * Returns the preferred founders bundle plan key.
 * Matches the billing term of the user's existing plan when possible.
 */
function pickBundlePlanKey(activePlanKeys) {
  // If the user is on a monthly plan, offer monthly bundle; otherwise prefer annual
  const hasMonthlyOnly =
    activePlanKeys.length > 0 && activePlanKeys.every((k) => k.endsWith('_monthly'));
  return hasMonthlyOnly ? 'founders_bundle_monthly' : 'founders_bundle_annual';
}

/**
 * Returns the preferred 3-module bundle plan key based on billing term.
 */
function pickThreeBundlePlanKey(activePlanKeys) {
  const hasMonthlyOnly =
    activePlanKeys.length > 0 && activePlanKeys.every((k) => k.endsWith('_monthly'));
  return hasMonthlyOnly ? 'three_module_bundle_monthly' : 'three_module_bundle_annual';
}

/**
 * Computes available billing actions for a user.
 *
 * @param {object} subscriptionState - Output of getUserSubscriptionState()
 * @returns {Array<object>} UI-ready upgrade option objects
 *
 * Each option has:
 *   action       - machine-readable action key
 *   actionType   - 'new_purchase' | 'upgrade_existing' | 'add_complementary_module'
 *   label        - display label
 *   description  - longer description shown in the UI
 *   targetPlanKey   - plan key to purchase
 *   currentPlanKey  - the user's existing plan key (null for new purchases)
 */
export function getAvailableUpgradeOptions(subscriptionState) {
  if (!subscriptionState) return [];

  const {
    hasBundle,
    activePlanKeys = [],
    eligibleActions = [],
    moduleFlags = {},
  } = subscriptionState;

  // Bundle users: no upgrade options
  if (hasBundle) return [];

  const options = [];
  const launchedModules = PUBLIC_BILLING_MODULES.filter((m) => isPubliclyLaunched(m));
  const paidModules = launchedModules.filter((m) => moduleFlags[m]);
  const hasFoundersEligibleCoverage = paidModules.includes('pipekeeper') || paidModules.includes('whiskeykeeper');
  const hasCigarkeeper = paidModules.includes('cigarkeeper');
  const paidCount = paidModules.length;

  // 3-module bundle: offered when user has any 1 or 2 modules (all 3 launched)
  const allThreeLaunched = launchedModules.includes('pipekeeper') &&
    launchedModules.includes('whiskeykeeper') &&
    launchedModules.includes('cigarkeeper');

  if (allThreeLaunched && paidCount >= 1 && paidCount < 3 && eligibleActions.includes('upgrade_to_bundle')) {
    const currentPlanKey = pickCurrentPlanKey(activePlanKeys, paidModules[0] || 'pipekeeper');
    const threeBundlePlanKey = pickThreeBundlePlanKey(activePlanKeys);
    const threeBundlePlan = SUBSCRIPTION_PLANS[threeBundlePlanKey];

    if (threeBundlePlan) {
      options.push({
        action: 'upgrade_to_three_bundle',
        actionType: 'upgrade_existing',
        label: 'Upgrade to All 3 Keepers Bundle',
        description:
          'Replace your current subscription with bundle access to PipeKeeper + WhiskeyKeeper + CigarKeeper.',
        targetPlanKey: threeBundlePlanKey,
        currentPlanKey,
        displayPrice: threeBundlePlan?.displayPrice,
        displayTerm: threeBundlePlan?.term,
      });
    }
  }

  // Founders bundle: offered when user has PipeKeeper or WhiskeyKeeper but not CigarKeeper
  if (hasFoundersEligibleCoverage && !hasCigarkeeper && eligibleActions.includes('upgrade_to_bundle')) {
    const currentPlanKey = pickCurrentPlanKey(activePlanKeys, paidModules[0] || 'pipekeeper');
    const bundlePlanKey = pickBundlePlanKey(activePlanKeys);
    const bundlePlan = SUBSCRIPTION_PLANS[bundlePlanKey];

    options.push({
      action: 'upgrade_to_bundle',
      actionType: 'upgrade_existing',
      label: 'Upgrade to Founders Bundle',
      description:
        'Replace your current subscription with bundle access to PipeKeeper + WhiskeyKeeper.',
      targetPlanKey: bundlePlanKey,
      currentPlanKey,
      displayPrice: bundlePlan?.displayPrice,
      displayTerm: bundlePlan?.term,
    });
  }

  for (const moduleKey of launchedModules) {
    if (!eligibleActions.includes(`add_${moduleKey}_module`)) continue;

    const currentModuleForTerm = paidModules[0] || moduleKey;
    const currentPlanKey = pickCurrentPlanKey(activePlanKeys, currentModuleForTerm);
    const targetPlanKey = getPreferredPlanKeyForModule(moduleKey);
    const targetPlan = SUBSCRIPTION_PLANS[targetPlanKey];
    const labelPrefix =
      moduleKey === 'pipekeeper'
        ? 'PipeKeeper'
        : moduleKey === 'whiskeykeeper'
          ? 'WhiskeyKeeper'
          : 'CigarKeeper';

    options.push({
      action:
        moduleKey === 'pipekeeper' || moduleKey === 'whiskeykeeper'
          ? 'add_other_module'
          : `add_${moduleKey}_module`,
      actionType: 'add_complementary_module',
      label: `Add ${labelPrefix} Pro`,
      description: `Keep your current subscription and add ${labelPrefix} Pro.`,
      targetPlanKey,
      currentPlanKey,
      displayPrice: targetPlan?.displayPrice,
      displayTerm: targetPlan?.term,
    });
  }

  return options;
}

/**
 * Returns the new-purchase options shown to free users.
 * These are all purchasable plans with actionType = 'new_purchase'.
 */
export function getNewPurchaseOptions() {
  const allThreeLaunched = ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'].every(isPubliclyLaunched);
  const plans = [
    ...PUBLIC_BILLING_MODULES
      .filter((moduleKey) => isPubliclyLaunched(moduleKey))
      .map((moduleKey) => SUBSCRIPTION_PLANS[getPreferredPlanKeyForModule(moduleKey)])
      .filter(Boolean),
    SUBSCRIPTION_PLANS.founders_bundle_annual,
    ...(allThreeLaunched ? [SUBSCRIPTION_PLANS.three_module_bundle_annual] : []),
  ];

  return plans.filter(Boolean).map((plan) => ({
    action: `purchase_${plan.key}`,
    actionType: 'new_purchase',
    label: plan.displayName,
    description: getNewPurchaseDescription(plan),
    targetPlanKey: plan.key,
    currentPlanKey: null,
    displayPrice: plan.displayPrice,
    displayTerm: plan.term,
    modules: plan.modules,
  }));
}

function getNewPurchaseDescription(plan) {
  if (plan.key?.startsWith('three_module_bundle')) {
    return 'Unlock PipeKeeper, WhiskeyKeeper, and CigarKeeper — all three in one subscription.';
  }
  if (plan.module === 'bundle') {
    return 'Unlock both PipeKeeper and WhiskeyKeeper in one subscription.';
  }
  if (plan.module === 'pipekeeper') {
    return 'Unlock unlimited PipeKeeper access with AI-powered collection intelligence.';
  }
  if (plan.module === 'whiskeykeeper') {
    return 'Unlock unlimited WhiskeyKeeper access with valuation and tasting tools.';
  }
  if (plan.module === 'cigarkeeper') {
    return 'Unlock unlimited CigarKeeper access with humidor, inventory, and session tools.';
  }
  return '';
}