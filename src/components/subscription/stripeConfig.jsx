/**
 * Stripe Configuration Validator
 * Single source of truth for Stripe price IDs and plan routing
 * Fails loudly on missing env vars or invalid plans
 */

// PlanType: 'single' | 'three_bundle' | 'four_bundle' | 'founders'
// BillingPeriod: 'monthly' | 'annual'
// ModuleKey: 'pipekeeper' | 'whiskeykeeper' | 'cigarkeeper' | 'winekeeper'
// StripePlan: { planKey, type, modules, billingPeriod, priceId, displayPrice, displayPeriod, isAvailable, unavailableReason }
// StripeConfig: { [planKey: string]: StripePlan }

/**
 * Build Stripe config from environment
 * Validates all required price IDs at startup
 */
export function buildStripeConfig() {
  const requiredPrices = [
    'VITE_STRIPE_PIPEKEEPER_MONTHLY',
    'VITE_STRIPE_PIPEKEEPER_ANNUAL',
    'VITE_STRIPE_WHISKEYKEEPER_MONTHLY',
    'VITE_STRIPE_WHISKEYKEEPER_ANNUAL',
    'VITE_STRIPE_FOUNDERS_MONTHLY',
    'VITE_STRIPE_FOUNDERS_ANNUAL',
  ];

  const config = {
    // Single module plans
    pipekeeper_pro_monthly: {
      planKey: 'pipekeeper_pro_monthly',
      type: 'single',
      modules: ['pipekeeper'],
      billingPeriod: 'monthly',
      priceId: import.meta.env.VITE_STRIPE_PIPEKEEPER_MONTHLY || null,
      displayPrice: '$2.99',
      displayPeriod: '/month',
      isAvailable: !!import.meta.env.VITE_STRIPE_PIPEKEEPER_MONTHLY,
      unavailableReason: import.meta.env.VITE_STRIPE_PIPEKEEPER_MONTHLY ? undefined : 'VITE_STRIPE_PIPEKEEPER_MONTHLY not configured',
    },
    pipekeeper_pro_annual: {
      planKey: 'pipekeeper_pro_annual',
      type: 'single',
      modules: ['pipekeeper'],
      billingPeriod: 'annual',
      priceId: import.meta.env.VITE_STRIPE_PIPEKEEPER_ANNUAL || null,
      displayPrice: '$29.99',
      displayPeriod: '/year',
      isAvailable: !!import.meta.env.VITE_STRIPE_PIPEKEEPER_ANNUAL,
      unavailableReason: import.meta.env.VITE_STRIPE_PIPEKEEPER_ANNUAL ? undefined : 'VITE_STRIPE_PIPEKEEPER_ANNUAL not configured',
    },
    whiskeykeeper_pro_monthly: {
      planKey: 'whiskeykeeper_pro_monthly',
      type: 'single',
      modules: ['whiskeykeeper'],
      billingPeriod: 'monthly',
      priceId: import.meta.env.VITE_STRIPE_WHISKEYKEEPER_MONTHLY || null,
      displayPrice: '$2.99',
      displayPeriod: '/month',
      isAvailable: !!import.meta.env.VITE_STRIPE_WHISKEYKEEPER_MONTHLY,
      unavailableReason: import.meta.env.VITE_STRIPE_WHISKEYKEEPER_MONTHLY ? undefined : 'VITE_STRIPE_WHISKEYKEEPER_MONTHLY not configured',
    },
    whiskeykeeper_pro_annual: {
      planKey: 'whiskeykeeper_pro_annual',
      type: 'single',
      modules: ['whiskeykeeper'],
      billingPeriod: 'annual',
      priceId: import.meta.env.VITE_STRIPE_WHISKEYKEEPER_ANNUAL || null,
      displayPrice: '$29.99',
      displayPeriod: '/year',
      isAvailable: !!import.meta.env.VITE_STRIPE_WHISKEYKEEPER_ANNUAL,
      unavailableReason: import.meta.env.VITE_STRIPE_WHISKEYKEEPER_ANNUAL ? undefined : 'VITE_STRIPE_WHISKEYKEEPER_ANNUAL not configured',
    },
    cigarkeeper_pro_monthly: {
      planKey: 'cigarkeeper_pro_monthly',
      type: 'single',
      modules: ['cigarkeeper'],
      billingPeriod: 'monthly',
      priceId: import.meta.env.VITE_STRIPE_CIGARKEEPER_MONTHLY || null,
      displayPrice: '$2.99',
      displayPeriod: '/month',
      isAvailable: !!import.meta.env.VITE_STRIPE_CIGARKEEPER_MONTHLY,
      unavailableReason: import.meta.env.VITE_STRIPE_CIGARKEEPER_MONTHLY ? undefined : 'VITE_STRIPE_CIGARKEEPER_MONTHLY not configured',
    },
    cigarkeeper_pro_annual: {
      planKey: 'cigarkeeper_pro_annual',
      type: 'single',
      modules: ['cigarkeeper'],
      billingPeriod: 'annual',
      priceId: import.meta.env.VITE_STRIPE_CIGARKEEPER_ANNUAL || null,
      displayPrice: '$29.99',
      displayPeriod: '/year',
      isAvailable: !!import.meta.env.VITE_STRIPE_CIGARKEEPER_ANNUAL,
      unavailableReason: import.meta.env.VITE_STRIPE_CIGARKEEPER_ANNUAL ? undefined : 'VITE_STRIPE_CIGARKEEPER_ANNUAL not configured',
    },
    winekeeper_pro_monthly: {
      planKey: 'winekeeper_pro_monthly',
      type: 'single',
      modules: ['winekeeper'],
      billingPeriod: 'monthly',
      priceId: import.meta.env.VITE_STRIPE_WINEKEEPER_MONTHLY || null,
      displayPrice: '$2.99',
      displayPeriod: '/month',
      isAvailable: !!import.meta.env.VITE_STRIPE_WINEKEEPER_MONTHLY,
      unavailableReason: import.meta.env.VITE_STRIPE_WINEKEEPER_MONTHLY ? undefined : 'VITE_STRIPE_WINEKEEPER_MONTHLY not configured',
    },
    winekeeper_pro_annual: {
      planKey: 'winekeeper_pro_annual',
      type: 'single',
      modules: ['winekeeper'],
      billingPeriod: 'annual',
      priceId: import.meta.env.VITE_STRIPE_WINEKEEPER_ANNUAL || null,
      displayPrice: '$29.99',
      displayPeriod: '/year',
      isAvailable: !!import.meta.env.VITE_STRIPE_WINEKEEPER_ANNUAL,
      unavailableReason: import.meta.env.VITE_STRIPE_WINEKEEPER_ANNUAL ? undefined : 'VITE_STRIPE_WINEKEEPER_ANNUAL not configured',
    },

    // Bundle plans
    three_module_bundle_monthly: {
      planKey: 'three_module_bundle_monthly',
      type: 'three_bundle',
      modules: [],
      billingPeriod: 'monthly',
      priceId: import.meta.env.VITE_STRIPE_THREE_BUNDLE_MONTHLY || null,
      displayPrice: '$7.99',
      displayPeriod: '/month',
      isAvailable: !!import.meta.env.VITE_STRIPE_THREE_BUNDLE_MONTHLY,
      unavailableReason: import.meta.env.VITE_STRIPE_THREE_BUNDLE_MONTHLY ? undefined : 'VITE_STRIPE_THREE_BUNDLE_MONTHLY not configured',
    },
    three_module_bundle_annual: {
      planKey: 'three_module_bundle_annual',
      type: 'three_bundle',
      modules: [],
      billingPeriod: 'annual',
      priceId: import.meta.env.VITE_STRIPE_THREE_BUNDLE_ANNUAL || null,
      displayPrice: '$79.99',
      displayPeriod: '/year',
      isAvailable: !!import.meta.env.VITE_STRIPE_THREE_BUNDLE_ANNUAL,
      unavailableReason: import.meta.env.VITE_STRIPE_THREE_BUNDLE_ANNUAL ? undefined : 'VITE_STRIPE_THREE_BUNDLE_ANNUAL not configured',
    },
    four_module_bundle_monthly: {
      planKey: 'four_module_bundle_monthly',
      type: 'four_bundle',
      modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'],
      billingPeriod: 'monthly',
      priceId: import.meta.env.VITE_STRIPE_FOUR_BUNDLE_MONTHLY || null,
      displayPrice: '$8.99',
      displayPeriod: '/month',
      isAvailable: !!import.meta.env.VITE_STRIPE_FOUR_BUNDLE_MONTHLY,
      unavailableReason: import.meta.env.VITE_STRIPE_FOUR_BUNDLE_MONTHLY ? undefined : 'VITE_STRIPE_FOUR_BUNDLE_MONTHLY not configured',
    },
    four_module_bundle_annual: {
      planKey: 'four_module_bundle_annual',
      type: 'four_bundle',
      modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'],
      billingPeriod: 'annual',
      priceId: import.meta.env.VITE_STRIPE_FOUR_BUNDLE_ANNUAL || null,
      displayPrice: '$89.99',
      displayPeriod: '/year',
      isAvailable: !!import.meta.env.VITE_STRIPE_FOUR_BUNDLE_ANNUAL,
      unavailableReason: import.meta.env.VITE_STRIPE_FOUR_BUNDLE_ANNUAL ? undefined : 'VITE_STRIPE_FOUR_BUNDLE_ANNUAL not configured',
    },
    founders_bundle_monthly: {
      planKey: 'founders_bundle_monthly',
      type: 'founders',
      modules: ['pipekeeper', 'whiskeykeeper'],
      billingPeriod: 'monthly',
      priceId: import.meta.env.VITE_STRIPE_FOUNDERS_MONTHLY || null,
      displayPrice: '$4.99',
      displayPeriod: '/month',
      isAvailable: !!import.meta.env.VITE_STRIPE_FOUNDERS_MONTHLY,
      unavailableReason: import.meta.env.VITE_STRIPE_FOUNDERS_MONTHLY ? undefined : 'VITE_STRIPE_FOUNDERS_MONTHLY not configured',
    },
    founders_bundle_annual: {
      planKey: 'founders_bundle_annual',
      type: 'founders',
      modules: ['pipekeeper', 'whiskeykeeper'],
      billingPeriod: 'annual',
      priceId: import.meta.env.VITE_STRIPE_FOUNDERS_ANNUAL || null,
      displayPrice: '$49.99',
      displayPeriod: '/year',
      isAvailable: !!import.meta.env.VITE_STRIPE_FOUNDERS_ANNUAL,
      unavailableReason: import.meta.env.VITE_STRIPE_FOUNDERS_ANNUAL ? undefined : 'VITE_STRIPE_FOUNDERS_ANNUAL not configured',
    },
  };

  // Log missing env vars to console for debugging
  if (import.meta.env.DEV) {
    const missing = requiredPrices.filter(key => !import.meta.env[key]);
    if (missing.length > 0) {
      console.warn('[StripeConfig] Missing required environment variables:', missing);
    }
  }

  return config;
}

/**
 * Get global Stripe config (rebuilt each call to ensure env vars are fresh)
 */
export function getStripeConfig() {
  return buildStripeConfig();
}

/**
 * Get specific plan, throw if not found or unavailable
 */
export function getRequiredStripePlan(planKey) {
  const config = getStripeConfig();
  const plan = config[planKey];

  if (!plan) {
    throw new Error(`[Stripe] Unknown plan key: ${planKey}`);
  }

  if (!plan.isAvailable) {
    throw new Error(
      `[Stripe] Plan unavailable: ${planKey}. Reason: ${plan.unavailableReason}`
    );
  }

  if (!plan.priceId) {
    throw new Error(
      `[Stripe] No price ID for plan: ${planKey}. Missing env var: ${plan.unavailableReason}`
    );
  }

  return plan;
}

/**
 * Validate entire config on startup
 */
export function validateStripeConfig() {
  const config = getStripeConfig();
  const errors = [];

  for (const [key, plan] of Object.entries(config)) {
    if (!plan.priceId) {
      errors.push(`${key}: Missing price ID (${plan.unavailableReason})`);
    }
  }

  if (errors.length > 0 && import.meta.env.DEV) {
    console.error('[StripeConfig] Validation failed:', errors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
