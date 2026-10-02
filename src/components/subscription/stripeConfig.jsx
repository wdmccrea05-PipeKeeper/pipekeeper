/**
 * Stripe Configuration Validator
 * Single source of truth for Stripe price IDs and plan routing
 * Fails loudly on missing env vars or invalid plans
 */
import { isModuleLaunched } from '@/components/utils/moduleReleaseState';

// Public Stripe Price IDs are identifiers, not secrets. Keep a production
// fallback catalog so the paywall does not disappear when Base44/Vite does not
// inject VITE_* values into the client bundle. The backend remains authoritative
// for actually creating Checkout sessions.
const PRODUCTION_PRICE_IDS = {
  VITE_STRIPE_PIPEKEEPER_MONTHLY: 'price_1SsDgEDycvQWC88PmdvlxFDa',
  VITE_STRIPE_PIPEKEEPER_ANNUAL: 'price_1SsDU6DycvQWC88PIwpmt7Oc',
  VITE_STRIPE_WHISKEYKEEPER_MONTHLY: 'price_1TBfYEDycvQWC88P5mfqoWzF',
  VITE_STRIPE_WHISKEYKEEPER_ANNUAL: 'price_1TBfZPDycvQWC88Pk0T31lxi',
  VITE_STRIPE_CIGARKEEPER_MONTHLY: 'price_1TBfbJDycvQWC88PIjsHAufT',
  VITE_STRIPE_CIGARKEEPER_ANNUAL: 'price_1TBfaeDycvQWC88PkAHy3qIC',
  VITE_STRIPE_WINEKEEPER_MONTHLY: 'price_1TBfcdDycvQWC88PV0OV4t9B',
  VITE_STRIPE_WINEKEEPER_ANNUAL: 'price_1TBfd7DycvQWC88PHrCnHl1X',
  VITE_STRIPE_THREE_BUNDLE_MONTHLY: 'price_1TBfdyDycvQWC88PPKSN5uVJ',
  VITE_STRIPE_THREE_BUNDLE_ANNUAL: 'price_1TBfekDycvQWC88P5nZsEr7j',
  VITE_STRIPE_FOUR_BUNDLE_MONTHLY: 'price_1TBffYDycvQWC88PA6qrWSRB',
  VITE_STRIPE_FOUR_BUNDLE_ANNUAL: 'price_1TBfgDDycvQWC88P0Y3VwJa6',
  VITE_STRIPE_FOUNDERS_MONTHLY: 'price_1TKgGnDycvQWC88PwdJo75R5',
  VITE_STRIPE_FOUNDERS_ANNUAL: 'price_1TBfhVDycvQWC88PdZ1jQNwX',
};

const configuredPrice = (key) => import.meta.env[key] || PRODUCTION_PRICE_IDS[key] || null;

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
      priceId: configuredPrice('VITE_STRIPE_PIPEKEEPER_MONTHLY'),
      displayPrice: '$2.99',
      displayPeriod: '/month',
      isAvailable: !!configuredPrice('VITE_STRIPE_PIPEKEEPER_MONTHLY'),
      unavailableReason: configuredPrice('VITE_STRIPE_PIPEKEEPER_MONTHLY') ? undefined : 'VITE_STRIPE_PIPEKEEPER_MONTHLY not configured',
    },
    pipekeeper_pro_annual: {
      planKey: 'pipekeeper_pro_annual',
      type: 'single',
      modules: ['pipekeeper'],
      billingPeriod: 'annual',
      priceId: configuredPrice('VITE_STRIPE_PIPEKEEPER_ANNUAL'),
      displayPrice: '$29.99',
      displayPeriod: '/year',
      isAvailable: !!configuredPrice('VITE_STRIPE_PIPEKEEPER_ANNUAL'),
      unavailableReason: configuredPrice('VITE_STRIPE_PIPEKEEPER_ANNUAL') ? undefined : 'VITE_STRIPE_PIPEKEEPER_ANNUAL not configured',
    },
    whiskeykeeper_pro_monthly: {
      planKey: 'whiskeykeeper_pro_monthly',
      type: 'single',
      modules: ['whiskeykeeper'],
      billingPeriod: 'monthly',
      priceId: configuredPrice('VITE_STRIPE_WHISKEYKEEPER_MONTHLY'),
      displayPrice: '$2.99',
      displayPeriod: '/month',
      isAvailable: !!configuredPrice('VITE_STRIPE_WHISKEYKEEPER_MONTHLY'),
      unavailableReason: configuredPrice('VITE_STRIPE_WHISKEYKEEPER_MONTHLY') ? undefined : 'VITE_STRIPE_WHISKEYKEEPER_MONTHLY not configured',
    },
    whiskeykeeper_pro_annual: {
      planKey: 'whiskeykeeper_pro_annual',
      type: 'single',
      modules: ['whiskeykeeper'],
      billingPeriod: 'annual',
      priceId: configuredPrice('VITE_STRIPE_WHISKEYKEEPER_ANNUAL'),
      displayPrice: '$29.99',
      displayPeriod: '/year',
      isAvailable: !!configuredPrice('VITE_STRIPE_WHISKEYKEEPER_ANNUAL'),
      unavailableReason: configuredPrice('VITE_STRIPE_WHISKEYKEEPER_ANNUAL') ? undefined : 'VITE_STRIPE_WHISKEYKEEPER_ANNUAL not configured',
    },
    cigarkeeper_pro_monthly: {
      planKey: 'cigarkeeper_pro_monthly',
      type: 'single',
      modules: ['cigarkeeper'],
      billingPeriod: 'monthly',
      priceId: configuredPrice('VITE_STRIPE_CIGARKEEPER_MONTHLY'),
      displayPrice: '$2.99',
      displayPeriod: '/month',
      isAvailable: !!configuredPrice('VITE_STRIPE_CIGARKEEPER_MONTHLY'),
      unavailableReason: configuredPrice('VITE_STRIPE_CIGARKEEPER_MONTHLY') ? undefined : 'VITE_STRIPE_CIGARKEEPER_MONTHLY not configured',
    },
    cigarkeeper_pro_annual: {
      planKey: 'cigarkeeper_pro_annual',
      type: 'single',
      modules: ['cigarkeeper'],
      billingPeriod: 'annual',
      priceId: configuredPrice('VITE_STRIPE_CIGARKEEPER_ANNUAL'),
      displayPrice: '$29.99',
      displayPeriod: '/year',
      isAvailable: !!configuredPrice('VITE_STRIPE_CIGARKEEPER_ANNUAL'),
      unavailableReason: configuredPrice('VITE_STRIPE_CIGARKEEPER_ANNUAL') ? undefined : 'VITE_STRIPE_CIGARKEEPER_ANNUAL not configured',
    },
      winekeeper_pro_monthly: {
      planKey: 'winekeeper_pro_monthly',
      type: 'single',
      modules: ['winekeeper'],
      billingPeriod: 'monthly',
      priceId: configuredPrice('VITE_STRIPE_WINEKEEPER_MONTHLY'),
      displayPrice: '$2.99',
      displayPeriod: '/month',
      isAvailable: isModuleLaunched('winekeeper') && !!configuredPrice('VITE_STRIPE_WINEKEEPER_MONTHLY'),
      unavailableReason: !isModuleLaunched('winekeeper')
        ? 'WineKeeper is not publicly launched'
        : (configuredPrice('VITE_STRIPE_WINEKEEPER_MONTHLY') ? undefined : 'VITE_STRIPE_WINEKEEPER_MONTHLY not configured'),
    },
      winekeeper_pro_annual: {
      planKey: 'winekeeper_pro_annual',
      type: 'single',
      modules: ['winekeeper'],
      billingPeriod: 'annual',
      priceId: configuredPrice('VITE_STRIPE_WINEKEEPER_ANNUAL'),
      displayPrice: '$29.99',
      displayPeriod: '/year',
      isAvailable: isModuleLaunched('winekeeper') && !!configuredPrice('VITE_STRIPE_WINEKEEPER_ANNUAL'),
      unavailableReason: !isModuleLaunched('winekeeper')
        ? 'WineKeeper is not publicly launched'
        : (configuredPrice('VITE_STRIPE_WINEKEEPER_ANNUAL') ? undefined : 'VITE_STRIPE_WINEKEEPER_ANNUAL not configured'),
    },

    // Bundle plans
    three_module_bundle_monthly: {
      planKey: 'three_module_bundle_monthly',
      type: 'three_bundle',
      modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],
      billingPeriod: 'monthly',
      priceId: configuredPrice('VITE_STRIPE_THREE_BUNDLE_MONTHLY'),
      displayPrice: '$7.99',
      displayPeriod: '/month',
      isAvailable: !!configuredPrice('VITE_STRIPE_THREE_BUNDLE_MONTHLY'),
      unavailableReason: configuredPrice('VITE_STRIPE_THREE_BUNDLE_MONTHLY') ? undefined : 'VITE_STRIPE_THREE_BUNDLE_MONTHLY not configured',
    },
    three_module_bundle_annual: {
      planKey: 'three_module_bundle_annual',
      type: 'three_bundle',
      modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],
      billingPeriod: 'annual',
      priceId: configuredPrice('VITE_STRIPE_THREE_BUNDLE_ANNUAL'),
      displayPrice: '$79.99',
      displayPeriod: '/year',
      isAvailable: !!configuredPrice('VITE_STRIPE_THREE_BUNDLE_ANNUAL'),
      unavailableReason: configuredPrice('VITE_STRIPE_THREE_BUNDLE_ANNUAL') ? undefined : 'VITE_STRIPE_THREE_BUNDLE_ANNUAL not configured',
    },
    four_module_bundle_monthly: {
      planKey: 'four_module_bundle_monthly',
      type: 'four_bundle',
      modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'],
      billingPeriod: 'monthly',
      priceId: configuredPrice('VITE_STRIPE_FOUR_BUNDLE_MONTHLY'),
      displayPrice: '$8.99',
      displayPeriod: '/month',
      isAvailable: isModuleLaunched('winekeeper') && !!configuredPrice('VITE_STRIPE_FOUR_BUNDLE_MONTHLY'),
      unavailableReason: !isModuleLaunched('winekeeper')
        ? '4-module bundle unavailable until WineKeeper is launched'
        : (configuredPrice('VITE_STRIPE_FOUR_BUNDLE_MONTHLY') ? undefined : 'VITE_STRIPE_FOUR_BUNDLE_MONTHLY not configured'),
    },
    four_module_bundle_annual: {
      planKey: 'four_module_bundle_annual',
      type: 'four_bundle',
      modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'],
      billingPeriod: 'annual',
      priceId: configuredPrice('VITE_STRIPE_FOUR_BUNDLE_ANNUAL'),
      displayPrice: '$89.99',
      displayPeriod: '/year',
      isAvailable: isModuleLaunched('winekeeper') && !!configuredPrice('VITE_STRIPE_FOUR_BUNDLE_ANNUAL'),
      unavailableReason: !isModuleLaunched('winekeeper')
        ? '4-module bundle unavailable until WineKeeper is launched'
        : (configuredPrice('VITE_STRIPE_FOUR_BUNDLE_ANNUAL') ? undefined : 'VITE_STRIPE_FOUR_BUNDLE_ANNUAL not configured'),
    },
    founders_bundle_monthly: {
      planKey: 'founders_bundle_monthly',
      type: 'founders',
      modules: ['pipekeeper', 'whiskeykeeper'],
      billingPeriod: 'monthly',
      priceId: configuredPrice('VITE_STRIPE_FOUNDERS_MONTHLY'),
      displayPrice: '$4.99',
      displayPeriod: '/month',
      isAvailable: !!configuredPrice('VITE_STRIPE_FOUNDERS_MONTHLY'),
      unavailableReason: configuredPrice('VITE_STRIPE_FOUNDERS_MONTHLY') ? undefined : 'VITE_STRIPE_FOUNDERS_MONTHLY not configured',
    },
    founders_bundle_annual: {
      planKey: 'founders_bundle_annual',
      type: 'founders',
      modules: ['pipekeeper', 'whiskeykeeper'],
      billingPeriod: 'annual',
      priceId: configuredPrice('VITE_STRIPE_FOUNDERS_ANNUAL'),
      displayPrice: '$49.99',
      displayPeriod: '/year',
      isAvailable: !!configuredPrice('VITE_STRIPE_FOUNDERS_ANNUAL'),
      unavailableReason: configuredPrice('VITE_STRIPE_FOUNDERS_ANNUAL') ? undefined : 'VITE_STRIPE_FOUNDERS_ANNUAL not configured',
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