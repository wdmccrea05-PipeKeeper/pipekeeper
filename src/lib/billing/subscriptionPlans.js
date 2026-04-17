/**
 * Subscription Plans — Single source of truth for plan definitions.
 *
 * These are the plans that the billing UI and decision engine operate on.
 * Price IDs are injected from environment variables (via Vite) at runtime.
 *
 * The founders bundle covers PipeKeeper + WhiskeyKeeper.
 */

export const SUBSCRIPTION_PLANS = {
  pipekeeper_pro_monthly: {
    key: 'pipekeeper_pro_monthly',
    product: 'pipekeeper_pro',
    module: 'pipekeeper',
    modules: ['pipekeeper'],
    type: 'single_module',
    term: 'monthly',
    displayName: 'PipeKeeper Pro Monthly',
    displayPrice: 2.99,
    stripePriceId: import.meta.env.VITE_STRIPE_PIPEKEEPER_MONTHLY || null,
  },
  pipekeeper_pro_annual: {
    key: 'pipekeeper_pro_annual',
    product: 'pipekeeper_pro',
    module: 'pipekeeper',
    modules: ['pipekeeper'],
    type: 'single_module',
    term: 'annual',
    displayName: 'PipeKeeper Pro Annual',
    displayPrice: 29.99,
    stripePriceId: import.meta.env.VITE_STRIPE_PIPEKEEPER_ANNUAL || null,
  },
  whiskeykeeper_pro_monthly: {
    key: 'whiskeykeeper_pro_monthly',
    product: 'whiskeykeeper_pro',
    module: 'whiskeykeeper',
    modules: ['whiskeykeeper'],
    type: 'single_module',
    term: 'monthly',
    displayName: 'WhiskeyKeeper Pro Monthly',
    displayPrice: 2.99,
    stripePriceId: import.meta.env.VITE_STRIPE_WHISKEYKEEPER_MONTHLY || null,
  },
  whiskeykeeper_pro_annual: {
    key: 'whiskeykeeper_pro_annual',
    product: 'whiskeykeeper_pro',
    module: 'whiskeykeeper',
    modules: ['whiskeykeeper'],
    type: 'single_module',
    term: 'annual',
    displayName: 'WhiskeyKeeper Pro Annual',
    displayPrice: 29.99,
    stripePriceId: import.meta.env.VITE_STRIPE_WHISKEYKEEPER_ANNUAL || null,
  },
  cigarkeeper_pro_monthly: {
    key: 'cigarkeeper_pro_monthly',
    product: 'cigarkeeper_pro',
    module: 'cigarkeeper',
    modules: ['cigarkeeper'],
    type: 'single_module',
    term: 'monthly',
    displayName: 'CigarKeeper Pro Monthly',
    displayPrice: 2.99,
    stripePriceId: import.meta.env.VITE_STRIPE_CIGARKEEPER_MONTHLY || null,
  },
  cigarkeeper_pro_annual: {
    key: 'cigarkeeper_pro_annual',
    product: 'cigarkeeper_pro',
    module: 'cigarkeeper',
    modules: ['cigarkeeper'],
    type: 'single_module',
    term: 'annual',
    displayName: 'CigarKeeper Pro Annual',
    displayPrice: 29.99,
    stripePriceId: import.meta.env.VITE_STRIPE_CIGARKEEPER_ANNUAL || null,
  },
  winekeeper_pro_monthly: {
    key: 'winekeeper_pro_monthly',
    product: 'winekeeper_pro',
    module: 'winekeeper',
    modules: ['winekeeper'],
    type: 'single_module',
    term: 'monthly',
    displayName: 'WineKeeper Pro Monthly',
    displayPrice: 2.99,
    stripePriceId: import.meta.env.VITE_STRIPE_WINEKEEPER_MONTHLY || null,
  },
  winekeeper_pro_annual: {
    key: 'winekeeper_pro_annual',
    product: 'winekeeper_pro',
    module: 'winekeeper',
    modules: ['winekeeper'],
    type: 'single_module',
    term: 'annual',
    displayName: 'WineKeeper Pro Annual',
    displayPrice: 29.99,
    stripePriceId: import.meta.env.VITE_STRIPE_WINEKEEPER_ANNUAL || null,
  },
  founders_bundle_monthly: {
    key: 'founders_bundle_monthly',
    product: 'founders_bundle',
    module: 'bundle',
    modules: ['pipekeeper', 'whiskeykeeper'],
    type: 'bundle',
    term: 'monthly',
    displayName: 'Founders Bundle Monthly',
    displayPrice: 4.99,
    stripePriceId: import.meta.env.VITE_STRIPE_FOUNDERS_MONTHLY || null,
  },
  founders_bundle_annual: {
    key: 'founders_bundle_annual',
    product: 'founders_bundle',
    module: 'bundle',
    modules: ['pipekeeper', 'whiskeykeeper'],
    type: 'bundle',
    term: 'annual',
    displayName: 'Founders Bundle Annual',
    displayPrice: 49.99,
    stripePriceId: import.meta.env.VITE_STRIPE_FOUNDERS_ANNUAL || null,
  },
  three_module_bundle_monthly: {
    key: 'three_module_bundle_monthly',
    product: 'three_module_bundle',
    module: 'bundle',
    modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],
    type: 'bundle',
    term: 'monthly',
    displayName: '3-Module Bundle Monthly',
    displayPrice: 7.99,
    stripePriceId: import.meta.env.VITE_STRIPE_THREE_BUNDLE_MONTHLY || null,
  },
  three_module_bundle_annual: {
    key: 'three_module_bundle_annual',
    product: 'three_module_bundle',
    module: 'bundle',
    modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],
    type: 'bundle',
    term: 'annual',
    displayName: '3-Module Bundle Annual',
    displayPrice: 79.99,
    stripePriceId: import.meta.env.VITE_STRIPE_THREE_BUNDLE_ANNUAL || null,
  },
  four_module_bundle_monthly: {
    key: 'four_module_bundle_monthly',
    product: 'four_module_bundle',
    module: 'bundle',
    modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'],
    type: 'bundle',
    term: 'monthly',
    displayName: '4-Module Bundle Monthly',
    displayPrice: 8.99,
    stripePriceId: import.meta.env.VITE_STRIPE_FOUR_BUNDLE_MONTHLY || null,
  },
  four_module_bundle_annual: {
    key: 'four_module_bundle_annual',
    product: 'four_module_bundle',
    module: 'bundle',
    modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'],
    type: 'bundle',
    term: 'annual',
    displayName: '4-Module Bundle Annual',
    displayPrice: 89.99,
    stripePriceId: import.meta.env.VITE_STRIPE_FOUR_BUNDLE_ANNUAL || null,
  },
};

/**
 * Returns true if the plan key is a bundle plan (covers multiple modules).
 */
export function isBundlePlan(planKey) {
  return SUBSCRIPTION_PLANS[planKey]?.type === 'bundle';
}

/**
 * Returns the modules covered by a given plan key, or [] if unknown.
 */
export function getModulesForPlan(planKey) {
  return SUBSCRIPTION_PLANS[planKey]?.modules || [];
}

/**
 * Get plan definitions for a given module (returns both monthly and annual).
 */
export function getPlansForModule(moduleKey) {
  return Object.values(SUBSCRIPTION_PLANS).filter(
    (p) => p.type === 'single_module' && p.module === moduleKey
  );
}

/**
 * Get the preferred (annual) plan key for a module.
 */
export function getPreferredPlanKeyForModule(moduleKey) {
  const plans = getPlansForModule(moduleKey);
  const annual = plans.find((p) => p.term === 'annual');
  return annual?.key || plans[0]?.key || null;
}
