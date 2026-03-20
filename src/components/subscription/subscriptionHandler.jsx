import { base44 } from '@/api/base44Client';
import { getStripeConfig, getRequiredStripePlan } from './stripeConfig';
import { toast } from 'sonner';

// Export config getter for compatibility
export const PLAN_CONFIG = getStripeConfig();

/**
 * Map user selection to Stripe product
 * Returns plan key and resolved modules
 * Throws if plan is unavailable or invalid
 */
export function getPlanFromSelection(selectedPlan, billingPeriod, selectedModules = [], baseModule) {
  if (selectedPlan === 'single') {
    const module = baseModule || selectedModules[0];
    if (!module) {
      throw new Error('No module specified for single plan');
    }
    const planKey = `${module}_pro_${billingPeriod}`;
    
    // Validate plan is available
    try {
      getRequiredStripePlan(planKey);
    } catch (err) {
      throw new Error(`Cannot select plan: ${err instanceof Error ? err.message : 'Plan unavailable'}`);
    }
    
    return { planKey, modules: [module] };
  }

  if (selectedPlan === 'three') {
    const planKey = `three_module_bundle_${billingPeriod}`;
    
    // Validate plan is available
    try {
      getRequiredStripePlan(planKey);
    } catch (err) {
      throw new Error(`Cannot select plan: ${err instanceof Error ? err.message : 'Plan unavailable'}`);
    }

    // For 3-module: use selectedModules if provided
    const modules = selectedModules.length >= 1
      ? selectedModules.slice(0, 3)
      : ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'];
    return { planKey, modules };
  }

  if (selectedPlan === 'four') {
    const planKey = `four_module_bundle_${billingPeriod}`;
    
    // Validate plan is available
    try {
      getRequiredStripePlan(planKey);
    } catch (err) {
      throw new Error(`Cannot select plan: ${err instanceof Error ? err.message : 'Plan unavailable'}`);
    }
    
    return {
      planKey,
      modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'],
    };
  }

  throw new Error('Invalid plan selection');
}

/**
 * Initiate Stripe checkout
 * Validates plan before attempting checkout
 */
export async function initiateCheckout(planKey, selectedModules = [], successUrl = '/', cancelUrl = '/') {
  try {
    // Validate plan exists and has price ID before calling backend
    const plan = getRequiredStripePlan(planKey);
    
    if (!plan.priceId) {
      throw new Error(
        `Checkout not available for this plan. Please try a different option or contact support.`
      );
    }

    const response = await base44.functions.invoke('createCheckoutSession', {
      planKey,
      selectedModules,
      successUrl: `${window.location.origin}${successUrl}`,
      cancelUrl: `${window.location.origin}${cancelUrl}`,
    });

    if (response?.data?.sessionUrl) {
      window.location.href = response.data.sessionUrl;
    } else {
      const errorMsg = response?.data?.error || 'Could not start checkout';
      throw new Error(errorMsg);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout failed';
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
      console.warn('[PostPurchase] No subscription found after checkout');
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
 * Map Stripe product to modules for entitlement system
 */
export function getModulesFromPlanKey(planKey, metadata) {
  if (planKey.includes('founders')) {
    return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];
  }

  if (planKey.includes('four_module')) {
    return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];
  }

  if (planKey.includes('three_module')) {
    // For 3-module bundles, use metadata.activeModules if available
    if (metadata?.activeModules && Array.isArray(metadata.activeModules)) {
      return metadata.activeModules.slice(0, 3);
    }
    // Fallback to first 3
    return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'];
  }

  if (planKey.includes('pipekeeper')) return ['pipekeeper'];
  if (planKey.includes('whiskeykeeper')) return ['whiskeykeeper'];
  if (planKey.includes('cigarkeeper')) return ['cigarkeeper'];
  if (planKey.includes('winekeeper')) return ['winekeeper'];

  return [];
}