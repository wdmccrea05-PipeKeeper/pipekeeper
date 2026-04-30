/**
 * Upgrade Paths — Pure function that computes available billing actions
 * for a user based on their current subscription state.
 *
 * Valid customer states:
 *   INDIVIDUALS: pipekeeper | whiskeykeeper | cigarkeeper
 *   BUNDLES:     founders_bundle (pipe+whiskey) | three_module_bundle (pipe+whiskey+cigar)
 *
 * Valid upgrade paths:
 *   pipe only         → Founders Bundle | 3-Module Bundle
 *   whiskey only      → Founders Bundle | 3-Module Bundle
 *   cigar only        → 3-Module Bundle
 *   founders only     → Add CigarKeeper | 3-Module Bundle
 *   pipe + cigar      → 3-Module Bundle
 *   whiskey + cigar   → 3-Module Bundle
 *   any combo missing cigar → add cigarkeeper | 3-Module Bundle
 */

import { SUBSCRIPTION_PLANS, getPreferredPlanKeyForModule } from './subscriptionPlans';
import { getModuleReleaseState, MODULE_RELEASE_STATES } from '@/components/utils/moduleReleaseState';

// Derive public billing modules dynamically from the release state registry.
// Any module with state 'launched' is eligible for purchase in the subscription UI.
const PUBLIC_BILLING_MODULES = Object.keys(MODULE_RELEASE_STATES);

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
 * Pick a bundle plan key matching the user's existing billing term.
 * bundleProduct: 'founders_bundle' | 'three_module_bundle'
 */
function pickBundlePlanKey(activePlanKeys, bundleProduct = 'founders_bundle') {
  const hasMonthlyOnly =
    activePlanKeys.length > 0 && activePlanKeys.every((k) => k.endsWith('_monthly'));
  return hasMonthlyOnly ? `${bundleProduct}_monthly` : `${bundleProduct}_annual`;
}

function getOptionPriority(option, subscriptionState) {
  const moduleFlags = subscriptionState?.moduleFlags || {};
  const hasPipe = !!moduleFlags.pipekeeper;
  const hasWhiskey = !!moduleFlags.whiskeykeeper;
  const hasCigar = !!moduleFlags.cigarkeeper;
  const isFoundersOnlyBundle = !!subscriptionState?.isFoundersOnlyBundle;

  if (isFoundersOnlyBundle) {
    if (option.action === 'add_cigarkeeper_module') return 10;
    if (option.action === 'upgrade_to_three_module_bundle') return 20;
  }

  if (hasPipe && hasWhiskey && !hasCigar) {
    if (option.action === 'add_cigarkeeper_module') return 10;
    if (option.action === 'upgrade_to_three_module_bundle') return 20;
  }

  if (hasPipe && !hasWhiskey && !hasCigar) {
    if (option.action === 'upgrade_to_bundle') return 10;
    if (option.action === 'add_whiskeykeeper_module') return 20;
    if (option.action === 'upgrade_to_three_module_bundle') return 30;
    if (option.action === 'add_cigarkeeper_module') return 40;
  }

  if (!hasPipe && hasWhiskey && !hasCigar) {
    if (option.action === 'upgrade_to_bundle') return 10;
    if (option.action === 'add_pipekeeper_module') return 20;
    if (option.action === 'upgrade_to_three_module_bundle') return 30;
    if (option.action === 'add_cigarkeeper_module') return 40;
  }

  if (!hasPipe && !hasWhiskey && hasCigar) {
    if (option.action === 'upgrade_to_three_module_bundle') return 10;
    if (option.action === 'add_pipekeeper_module') return 20;
    if (option.action === 'add_whiskeykeeper_module') return 30;
  }

  if (hasPipe && !hasWhiskey && hasCigar) {
    if (option.action === 'add_whiskeykeeper_module') return 10;
    if (option.action === 'upgrade_to_three_module_bundle') return 20;
  }

  if (!hasPipe && hasWhiskey && hasCigar) {
    if (option.action === 'add_pipekeeper_module') return 10;
    if (option.action === 'upgrade_to_three_module_bundle') return 20;
  }

  if (option.action === 'upgrade_to_three_module_bundle') return 50;
  if (option.action === 'upgrade_to_bundle') return 60;
  if (option.action?.startsWith('add_')) return 70;
  return 80;
}

function sortAndAnnotateOptions(options, subscriptionState) {
  if (!Array.isArray(options) || options.length === 0) return [];

  const prioritized = options.map((option) => ({
    ...option,
    priority: getOptionPriority(option, subscriptionState),
  }));

  // defensive deduplication by target plan key to avoid duplicate offer cards.
  const uniqueByTarget = new Map();
  for (const option of prioritized) {
    const key = option.targetPlanKey || option.action;
    const existing = uniqueByTarget.get(key);
    if (!existing || option.priority < existing.priority) {
      uniqueByTarget.set(key, option);
    }
  }

  const sorted = [...uniqueByTarget.values()].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const aPrice = Number.isFinite(a.displayPrice) ? a.displayPrice : Number.POSITIVE_INFINITY;
    const bPrice = Number.isFinite(b.displayPrice) ? b.displayPrice : Number.POSITIVE_INFINITY;
    if (aPrice !== bPrice) return aPrice - bPrice;
    return String(a.label || '').localeCompare(String(b.label || ''));
  });

  const bestPriority = sorted[0]?.priority;
  return sorted.map((option) => ({
    ...option,
    recommended: option.priority === bestPriority,
  }));
}

/**
 * Computes available billing actions for a user.
 *
 * @param {object} subscriptionState - Output of getUserSubscriptionState()
 * @returns {Array<object>} UI-ready upgrade option objects
 *
 * Each option has:
 *   action          - machine-readable action key
 *   actionType      - 'new_purchase' | 'upgrade_existing' | 'add_complementary_module'
 *   label           - display label
 *   description     - longer description shown in the UI
 *   targetPlanKey   - plan key to purchase
 *   currentPlanKey  - the user's existing plan key (null for new purchases)
 */
export function getAvailableUpgradeOptions(subscriptionState) {
  if (!subscriptionState) return [];

  const {
    hasFullCoverage,
    isFoundersOnlyBundle,
    isThreeModuleBundle,
    activePlanKeys = [],
    eligibleActions = [],
    moduleFlags = {},
  } = subscriptionState;

  // Users with full coverage (3-module bundle or all 3 individually): nothing to upgrade to
  if (hasFullCoverage) return [];

  const options = [];
  const launchedModules = PUBLIC_BILLING_MODULES.filter((m) => isPubliclyLaunched(m));
  const paidModules = launchedModules.filter((m) => moduleFlags[m]);
  const hasPipe = moduleFlags.pipekeeper;
  const hasWhiskey = moduleFlags.whiskeykeeper;
  const hasCigar = moduleFlags.cigarkeeper;

  // ── Founders Bundle upgrade ────────────────────────────────────────────────
  // Offered to: individual PK or WK subscribers (not already on any bundle)
  if (!isFoundersOnlyBundle && !isThreeModuleBundle && eligibleActions.includes('upgrade_to_bundle')) {
    const currentPlanKey = pickCurrentPlanKey(activePlanKeys, paidModules[0] || 'pipekeeper');
    const bundlePlanKey = pickBundlePlanKey(activePlanKeys, 'founders_bundle');
    const bundlePlan = SUBSCRIPTION_PLANS[bundlePlanKey];

    options.push({
      action: 'upgrade_to_bundle',
      actionType: 'upgrade_existing',
      label: 'Upgrade to Founders Bundle',
      description: 'Replace your current subscription with PipeKeeper + WhiskeyKeeper in one plan.',
      targetPlanKey: bundlePlanKey,
      currentPlanKey,
      displayPrice: bundlePlan?.displayPrice,
      displayTerm: bundlePlan?.term,
    });
  }

  // ── 3-Module Bundle upgrade ───────────────────────────────────────────────
  // Offered to everyone who doesn't already have all 3 modules
  if (eligibleActions.includes('upgrade_to_three_module_bundle')) {
    const currentPlanKey = activePlanKeys[0] || null;
    const threeBundlePlanKey = pickBundlePlanKey(activePlanKeys, 'three_module_bundle');
    const threeBundlePlan = SUBSCRIPTION_PLANS[threeBundlePlanKey];

    options.push({
      action: 'upgrade_to_three_module_bundle',
      actionType: 'upgrade_existing',
      label: 'Upgrade to 3-Module Bundle',
      description: 'Get PipeKeeper, WhiskeyKeeper, and CigarKeeper — all three in one subscription.',
      targetPlanKey: threeBundlePlanKey,
      currentPlanKey,
      displayPrice: threeBundlePlan?.displayPrice,
      displayTerm: threeBundlePlan?.term,
    });
  }

  // ── Add individual missing modules ────────────────────────────────────────
  for (const moduleKey of launchedModules) {
    if (!eligibleActions.includes(`add_${moduleKey}_module`)) continue;

    const currentModuleForTerm = paidModules[0] || moduleKey;
    const currentPlanKey = pickCurrentPlanKey(activePlanKeys, currentModuleForTerm);
    const targetPlanKey = getPreferredPlanKeyForModule(moduleKey);
    const targetPlan = SUBSCRIPTION_PLANS[targetPlanKey];
    const labelMap = {
      pipekeeper: 'PipeKeeper',
      whiskeykeeper: 'WhiskeyKeeper',
      cigarkeeper: 'CigarKeeper',
    };
    const labelPrefix = labelMap[moduleKey] || moduleKey;

    options.push({
      action: `add_${moduleKey}_module`,
      actionType: 'add_complementary_module',
      label: `Add ${labelPrefix} Pro`,
      description: `Keep your current subscription and add ${labelPrefix} Pro.`,
      targetPlanKey,
      currentPlanKey,
      displayPrice: targetPlan?.displayPrice,
      displayTerm: targetPlan?.term,
    });
  }

  return sortAndAnnotateOptions(options, subscriptionState);
}

/**
 * Returns the new-purchase options shown to free users.
 * These are all purchasable plans with actionType = 'new_purchase'.
 * Includes: individual modules + Founders Bundle + 3-Module Bundle.
 */
export function getNewPurchaseOptions() {
  const individualPlans = PUBLIC_BILLING_MODULES
    .filter((moduleKey) => isPubliclyLaunched(moduleKey))
    .map((moduleKey) => SUBSCRIPTION_PLANS[getPreferredPlanKeyForModule(moduleKey)])
    .filter(Boolean);

  const bundlePlans = [
    SUBSCRIPTION_PLANS.founders_bundle_annual,
    SUBSCRIPTION_PLANS.three_module_bundle_annual,
  ].filter(Boolean);

  return [...individualPlans, ...bundlePlans].map((plan) => ({
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
  if (plan.key?.startsWith('founders_bundle')) {
    return 'Unlock PipeKeeper + WhiskeyKeeper in one Founders Bundle subscription.';
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
