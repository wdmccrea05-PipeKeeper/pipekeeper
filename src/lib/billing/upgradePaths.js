/**
 * Upgrade Paths — Pure function that computes available billing actions
 * for a user based on their current subscription state.
 *
 * Returns UI-ready option objects that drive the billing modal.
 */

import { SUBSCRIPTION_PLANS, getPreferredPlanKeyForModule } from './subscriptionPlans';
import { isFreeUser } from './subscriptionState';

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
  // If the user is on an annual plan, prefer annual bundle
  const hasAnnual = activePlanKeys.some((k) => k.endsWith('_annual'));
  return hasAnnual ? 'founders_bundle_annual' : 'founders_bundle_annual'; // always annual for bundle
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
    hasPipekeeperPro,
    hasWhiskeykeeperPro,
    hasBundle,
    activePlanKeys,
    eligibleActions,
  } = subscriptionState;

  // Bundle users: no upgrade options
  if (hasBundle) return [];

  const options = [];

  if (hasPipekeeperPro && !hasWhiskeykeeperPro) {
    const currentPlanKey = pickCurrentPlanKey(activePlanKeys, 'pipekeeper');
    const bundlePlanKey = pickBundlePlanKey(activePlanKeys);
    const wkPlanKey = getPreferredPlanKeyForModule('whiskeykeeper');

    if (eligibleActions.includes('upgrade_to_bundle')) {
      const bundlePlan = SUBSCRIPTION_PLANS[bundlePlanKey];
      options.push({
        action: 'upgrade_to_bundle',
        actionType: 'upgrade_existing',
        label: 'Upgrade to Founders Bundle',
        description:
          'Replace your current PipeKeeper Pro subscription with bundle access to PipeKeeper + WhiskeyKeeper.',
        targetPlanKey: bundlePlanKey,
        currentPlanKey,
        displayPrice: bundlePlan?.displayPrice,
        displayTerm: bundlePlan?.term,
      });
    }

    if (eligibleActions.includes('add_whiskeykeeper_module')) {
      const wkPlan = SUBSCRIPTION_PLANS[wkPlanKey];
      options.push({
        action: 'add_other_module',
        actionType: 'add_complementary_module',
        label: 'Add WhiskeyKeeper Pro',
        description:
          'Keep PipeKeeper Pro and purchase WhiskeyKeeper Pro as an additional subscription.',
        targetPlanKey: wkPlanKey,
        currentPlanKey,
        displayPrice: wkPlan?.displayPrice,
        displayTerm: wkPlan?.term,
      });
    }

    return options;
  }

  if (hasWhiskeykeeperPro && !hasPipekeeperPro) {
    const currentPlanKey = pickCurrentPlanKey(activePlanKeys, 'whiskeykeeper');
    const bundlePlanKey = pickBundlePlanKey(activePlanKeys);
    const pkPlanKey = getPreferredPlanKeyForModule('pipekeeper');

    if (eligibleActions.includes('upgrade_to_bundle')) {
      const bundlePlan = SUBSCRIPTION_PLANS[bundlePlanKey];
      options.push({
        action: 'upgrade_to_bundle',
        actionType: 'upgrade_existing',
        label: 'Upgrade to Founders Bundle',
        description:
          'Replace your current WhiskeyKeeper Pro subscription with bundle access to PipeKeeper + WhiskeyKeeper.',
        targetPlanKey: bundlePlanKey,
        currentPlanKey,
        displayPrice: bundlePlan?.displayPrice,
        displayTerm: bundlePlan?.term,
      });
    }

    if (eligibleActions.includes('add_pipekeeper_module')) {
      const pkPlan = SUBSCRIPTION_PLANS[pkPlanKey];
      options.push({
        action: 'add_other_module',
        actionType: 'add_complementary_module',
        label: 'Add PipeKeeper Pro',
        description:
          'Keep WhiskeyKeeper Pro and purchase PipeKeeper Pro as an additional subscription.',
        targetPlanKey: pkPlanKey,
        currentPlanKey,
        displayPrice: pkPlan?.displayPrice,
        displayTerm: pkPlan?.term,
      });
    }

    return options;
  }

  if (hasPipekeeperPro && hasWhiskeykeeperPro) {
    // Has both separately — offer bundle consolidation
    const currentPlanKey = activePlanKeys[0] || null;
    const bundlePlanKey = pickBundlePlanKey(activePlanKeys);
    const bundlePlan = SUBSCRIPTION_PLANS[bundlePlanKey];

    if (eligibleActions.includes('upgrade_to_bundle')) {
      options.push({
        action: 'upgrade_to_bundle',
        actionType: 'upgrade_existing',
        label: 'Consolidate to Founders Bundle',
        description:
          'Combine your PipeKeeper Pro and WhiskeyKeeper Pro into one Founders Bundle subscription.',
        targetPlanKey: bundlePlanKey,
        currentPlanKey,
        displayPrice: bundlePlan?.displayPrice,
        displayTerm: bundlePlan?.term,
      });
    }

    return options;
  }

  // Free user: return empty — the caller shows the standard plan picker
  return [];
}

/**
 * Returns the new-purchase options shown to free users.
 * These are all purchasable plans with actionType = 'new_purchase'.
 */
export function getNewPurchaseOptions() {
  const plans = [
    SUBSCRIPTION_PLANS.pipekeeper_pro_annual,
    SUBSCRIPTION_PLANS.whiskeykeeper_pro_annual,
    SUBSCRIPTION_PLANS.founders_bundle_annual,
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
  if (plan.module === 'bundle') {
    return 'Unlock both PipeKeeper and WhiskeyKeeper in one subscription.';
  }
  if (plan.module === 'pipekeeper') {
    return 'Unlock unlimited PipeKeeper access with AI-powered collection intelligence.';
  }
  if (plan.module === 'whiskeykeeper') {
    return 'Unlock unlimited WhiskeyKeeper access with valuation and tasting tools.';
  }
  return '';
}
