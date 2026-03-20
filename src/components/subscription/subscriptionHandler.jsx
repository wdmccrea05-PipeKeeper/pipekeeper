import { base44 } from '@/api/base44Client';

/**
 * Subscription handler for module-based paywall system
 * Integrates with Stripe checkout and canonical access system
 */

export const PLAN_CONFIG = {
  // Single module plans
  pipekeeper_pro_monthly: {
    type: 'single',
    modules: ['pipekeeper'],
    priceId: process.env.VITE_STRIPE_PIPEKEEPER_MONTHLY,
    displayPrice: '$2.99',
    displayPeriod: '/month',
  },
  pipekeeper_pro_annual: {
    type: 'single',
    modules: ['pipekeeper'],
    priceId: process.env.VITE_STRIPE_PIPEKEEPER_ANNUAL,
    displayPrice: '$29.99',
    displayPeriod: '/year',
  },
  whiskeykeeper_pro_monthly: {
    type: 'single',
    modules: ['whiskeykeeper'],
    priceId: process.env.VITE_STRIPE_WHISKEYKEEPER_MONTHLY,
    displayPrice: '$2.99',
    displayPeriod: '/month',
  },
  whiskeykeeper_pro_annual: {
    type: 'single',
    modules: ['whiskeykeeper'],
    priceId: process.env.VITE_STRIPE_WHISKEYKEEPER_ANNUAL,
    displayPrice: '$29.99',
    displayPeriod: '/year',
  },

  // 3-module bundle
  three_module_bundle_monthly: {
    type: 'three_bundle',
    modules: [], // Will be set from selectedModules
    priceId: process.env.VITE_STRIPE_THREE_BUNDLE_MONTHLY,
    displayPrice: '$7.99',
    displayPeriod: '/month',
  },
  three_module_bundle_annual: {
    type: 'three_bundle',
    modules: [], // Will be set from selectedModules
    priceId: process.env.VITE_STRIPE_THREE_BUNDLE_ANNUAL,
    displayPrice: '$79.99',
    displayPeriod: '/year',
  },

  // 4-module bundle
  four_module_bundle_monthly: {
    type: 'four_bundle',
    modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'],
    priceId: process.env.VITE_STRIPE_FOUR_BUNDLE_MONTHLY,
    displayPrice: '$8.99',
    displayPeriod: '/month',
  },
  four_module_bundle_annual: {
    type: 'four_bundle',
    modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'],
    priceId: process.env.VITE_STRIPE_FOUR_BUNDLE_ANNUAL,
    displayPrice: '$89.99',
    displayPeriod: '/year',
  },

  // Founders bundle
  founders_bundle_annual: {
    type: 'founders',
    modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'],
    priceId: process.env.VITE_STRIPE_FOUNDERS_ANNUAL,
    displayPrice: '$49.99',
    displayPeriod: '/year',
  },
};

/**
 * Map user selection to Stripe product
 * Returns plan key and resolved modules
 */
export function getPlanFromSelection(
  selectedPlan: 'single' | 'three' | 'four',
  billingPeriod: 'monthly' | 'annual',
  selectedModules: string[] = [],
  baseModule?: string
): { planKey: string; modules: string[] } {
  if (selectedPlan === 'single') {
    const module = baseModule || selectedModules[0];
    const planKey = `${module}_pro_${billingPeriod}`;
    return { planKey, modules: [module] };
  }

  if (selectedPlan === 'three') {
    const planKey = `three_module_bundle_${billingPeriod}`;
    // For 3-module: use selectedModules if provided, else use first 3 available
    const modules = selectedModules.length >= 3
      ? selectedModules.slice(0, 3)
      : selectedModules.length > 0
        ? selectedModules
        : ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'];
    return { planKey, modules };
  }

  if (selectedPlan === 'four') {
    const planKey = `four_module_bundle_${billingPeriod}`;
    return {
      planKey,
      modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'],
    };
  }

  return { planKey: '', modules: [] };
}

/**
 * Initiate Stripe checkout
 */
export async function initiateCheckout(
  planKey: string,
  selectedModules: string[] = [],
  successUrl: string = '/',
  cancelUrl: string = '/'
) {
  try {
    const response = await base44.functions.invoke('createCheckoutSession', {
      planKey,
      selectedModules,
      successUrl: `${window.location.origin}${successUrl}`,
      cancelUrl: `${window.location.origin}${cancelUrl}`,
    });

    if (response?.data?.sessionUrl) {
      window.location.href = response.data.sessionUrl;
    } else {
      throw new Error('No checkout URL returned');
    }
  } catch (error) {
    console.error('Checkout failed:', error);
    throw error;
  }
}

/**
 * Handle post-purchase actions
 * Called when user returns from Stripe after successful payment
 */
export async function handlePostPurchase() {
  try {
    // Rebuild access summary to reflect new subscription
    const response = await base44.functions.invoke('syncSubscriptionForMe', {});
    return response?.data || {};
  } catch (error) {
    console.error('Post-purchase sync failed:', error);
    throw error;
  }
}

/**
 * Map Stripe product to modules for entitlement system
 */
export function getModulesFromPlanKey(planKey: string, metadata?: any): string[] {
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