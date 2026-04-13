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
