import { base44 } from '@/api/base44Client';
import { getStripeConfig, getRequiredStripePlan } from './stripeConfig';
import { SUBSCRIPTION_PLANS } from '@/lib/billing/subscriptionPlans';

// Export config getter for compatibility
export const PLAN_CONFIG = getStripeConfig();

/**
 * Map user selection to Stripe product
 * Returns plan key and resolved modules
 * Throws if plan is unavailable or invalid
 *
 * NOTE: modules returned here represent what the plan *intends* to unlock.
 * Release-state gating (filtering out non-launched modules for normal users)
 * is applied downstream in buildAccessSummary — not here.
 */
export function getPlanFromSelection(selectedPlan, billingPeriod, selectedModules = [], baseModule) {
  if (selectedPlan === 'single') {
    const module = baseModule || selectedModules[0];
    if (!module) {
      throw new Error('No module specified for single plan');
    }
    const planKey = `${module}_pro_${billingPeriod}`;

    try {
      getRequiredStripePlan(planKey);
    } catch {
      throw new Error('This subscription option is not currently available. Please contact support.');
    }

    return { planKey, modules: [module] };
  }

  if (selectedPlan === 'three') {
    throw new Error('Multi-module bundles are not available in this checkout flow.');
  }

  if (selectedPlan === 'four') {
    throw new Error('Multi-module bundles are not available in this checkout flow.');
  }

  throw new Error('Invalid plan selection');
}

/**
 * Initiate Stripe checkout
 * Validates plan before attempting checkout
 */
export async function initiateCheckout(planKey, selectedModules = [], successUrl = '/', cancelUrl = '/') {
  let plan;
  try {
    plan = getRequiredStripePlan(planKey);
  } catch {
    throw new Error('This subscription option is not currently available. Please contact support.');
  }

  if (!plan.priceId) {
    throw new Error('Checkout is temporarily unavailable. Please try again later or contact support.');
  }

  try {
    const response = await base44.functions.invoke('createCheckoutSession', {
      planKey,
      selectedModules,
      successUrl: `${window.location.origin}${successUrl}`,
      cancelUrl: `${window.location.origin}${cancelUrl}`,
    });

    if (response?.data?.sessionUrl) {
      window.location.assign(response.data.sessionUrl);
    } else {
      const errorMsg = response?.data?.error || 'Could not start checkout. Please try again.';
      throw new Error(errorMsg);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout is temporarily unavailable. Please try again later.';
    console.error('[Checkout] Error:', message, error);
    throw new Error(message);
  }
}

/**
 * Handle post-purchase actions
 * Called when user returns from Stripe after successful payment
 * Syncs subscription and rebuilds access summary
 */
export async function handlePostPurchase() {
  try {
    const response = await base44.functions.invoke('syncSubscriptionForMe', {});

    if (response?.data?.status === 'no_subscription') {
      if (import.meta.env.DEV) {
        console.warn('[PostPurchase] No subscription found after checkout');
      }
      throw new Error('Subscription not found. This may take a moment to process.');
    }

    if (response?.data?.error) {
      throw new Error(response.data.error);
    }

    return response?.data || {};
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to activate subscription';
    console.error('[PostPurchase] Sync failed:', message, error);
    throw new Error(message);
  }
}

/**
 * Map Stripe product to intended modules for entitlement system.
 *
 * IMPORTANT: This returns the *plan-intended* module list, not the *effective* module list.
 * Release-state filtering (removing non-launched modules for normal users) must be applied
 * by the caller (buildAccessSummary) — not here.
 */
export function getModulesFromPlanKey(planKey, metadata) {
  if (planKey.includes('founders')) {
    return ['pipekeeper', 'whiskeykeeper'];
  }

  if (planKey.includes('four_module')) {
    return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];
  }

  if (planKey.includes('three_module')) {
    // For 3-module bundles, use metadata.activeModules if available
    if (metadata?.activeModules && Array.isArray(metadata.activeModules)) {
      return metadata.activeModules.slice(0, 3);
    }
    // Safe fallback: only pipekeeper (the only currently-launched module).
    // Do NOT default to ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'] since those
    // modules are not yet launched for normal users.
    return ['pipekeeper'];
  }

  if (planKey.includes('pipekeeper')) return ['pipekeeper'];
  if (planKey.includes('whiskeykeeper')) return ['whiskeykeeper'];
  if (planKey.includes('cigarkeeper')) return ['cigarkeeper'];
  if (planKey.includes('winekeeper')) return ['winekeeper'];

  return [];
}

/**
 * Initiate Stripe checkout with an explicit billing intent.
 *
 * This is the preferred checkout entry point for all state-aware billing flows.
 * It replaces ad-hoc calls to initiateCheckout() with explicit intent information.
 *
 * @param {object} intent
 * @param {string} intent.actionType  - 'new_purchase' | 'upgrade_existing' | 'add_complementary_module'
 * @param {string|null} intent.currentPlanKey - User's existing plan key (null for new purchases)
 * @param {string} intent.targetPlanKey - Plan key to purchase
 * @param {string} [successUrl]
 * @param {string} [cancelUrl]
 */
export async function initiateCheckoutWithIntent(
  intent,
  successUrl = '/',
  cancelUrl = '/'
) {
  const { actionType, currentPlanKey = null, targetPlanKey } = intent || {};

  // Hard validation — never silently fall back to a wrong plan
  if (!targetPlanKey) {
    throw new Error(`Checkout cannot start: no targetPlanKey provided.`);
  }

  const plan = SUBSCRIPTION_PLANS[targetPlanKey];
  if (!plan) {
    throw new Error(`Unknown target plan key: ${targetPlanKey}`);
  }

  if (!actionType || !['new_purchase', 'upgrade_existing', 'add_complementary_module'].includes(actionType)) {
    throw new Error(`Invalid actionType: ${actionType}`);
  }

  // Validate the Stripe price ID is configured
  const stripeConfig = getStripeConfig();
  const stripePlan = stripeConfig[targetPlanKey];
  if (!stripePlan?.priceId) {
    throw new Error('This subscription option is not currently available. Please contact support.');
  }

  try {
    const response = await base44.functions.invoke('createCheckoutSession', {
      planKey: targetPlanKey,
      actionType,
      currentPlanKey,
      selectedModules: plan.modules || [],
      successUrl: `${window.location.origin}${successUrl}`,
      cancelUrl: `${window.location.origin}${cancelUrl}`,
    });

    const checkoutUrl = response?.data?.sessionUrl || response?.data?.url;

    if (checkoutUrl) {
      // Use window.location.assign instead of window.open to avoid popup blockers
      // on iOS Safari and other mobile browsers that block popups not triggered
      // directly by a synchronous user gesture.
      window.location.assign(checkoutUrl);
    } else {
      const errorMsg = response?.data?.error || 'Could not start checkout. Please try again.';
      throw new Error(errorMsg);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout is temporarily unavailable.';
    console.error('[Checkout] initiateCheckoutWithIntent error:', message, error);
    throw new Error(message);
  }
}
