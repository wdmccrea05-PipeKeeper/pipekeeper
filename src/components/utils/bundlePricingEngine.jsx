/**
 * Bundle Pricing Engine — Dynamic bundle detection and pricing calculation
 * Supports 1/2/3/4 module combinations with automatic bundle detection
 */

import { MODULES } from './moduleRegistry';

/**
 * Pricing Configuration
 * Prices in cents (convert to dollars for display)
 */
export const PRICING = {
  // Single module pricing
  SINGLE_MODULE_MONTHLY: 299, // $2.99
  SINGLE_MODULE_ANNUAL: 2999, // $29.99

  // 3-module bundle
  BUNDLE_3_MONTHLY: 799, // $7.99
  BUNDLE_3_ANNUAL: 7999, // $79.99

  // 4-module bundle
  BUNDLE_4_MONTHLY: 899, // $8.99
  BUNDLE_4_ANNUAL: 8999, // $89.99
};

/**
 * Founders offer pricing
 * PipeKeeper + WhiskeyKeeper one-time access
 */
export const FOUNDERS_PRICING = {
  ONE_TIME: 4999, // $49.99
  MODULES: [MODULES.PIPEKEEPER, MODULES.WHISKEYKEEPER],
};

/**
 * Detect which pricing tier applies based on paid modules
 * @param {string[]} paidModules - List of modules user has paid access to
 * @returns {string} - Bundle type: 'single', 'dual', 'bundle_3', 'bundle_4'
 */
export function detectBundleTier(paidModules) {
  if (!Array.isArray(paidModules)) return 'single';
  
  const count = paidModules.length;
  
  if (count >= 4) return 'bundle_4';
  if (count === 3) return 'bundle_3';
  if (count === 2) return 'dual';
  return 'single';
}

/**
 * Calculate price for a specific billing period
 * @param {string} billingPeriod - 'monthly' or 'annual'
 * @param {string[]} paidModules - List of modules user has paid access to
 * @returns {number} - Price in cents
 */
export function calculatePrice(billingPeriod, paidModules) {
  if (!Array.isArray(paidModules) || paidModules.length === 0) {
    return 0;
  }

  const tier = detectBundleTier(paidModules);
  const isMonthly = billingPeriod === 'monthly';

  switch (tier) {
    case 'bundle_4':
      return isMonthly ? PRICING.BUNDLE_4_MONTHLY : PRICING.BUNDLE_4_ANNUAL;
    case 'bundle_3':
      return isMonthly ? PRICING.BUNDLE_3_MONTHLY : PRICING.BUNDLE_3_ANNUAL;
    case 'dual':
      // 2 modules: sum of two single module prices
      return isMonthly
        ? PRICING.SINGLE_MODULE_MONTHLY * 2
        : PRICING.SINGLE_MODULE_ANNUAL * 2;
    case 'single':
      return isMonthly ? PRICING.SINGLE_MODULE_MONTHLY : PRICING.SINGLE_MODULE_ANNUAL;
    default:
      return 0;
  }
}

/**
 * Get savings information when upgrading to a bundle
 * @param {string} billingPeriod - 'monthly' or 'annual'
 * @param {string[]} paidModules - Current paid modules
 * @returns {object} - { savingsAmount: number (cents), savingsPercentage: number (0-100) } or null
 */
export function getBundleSavings(billingPeriod, paidModules) {
  if (!Array.isArray(paidModules)) return null;

  const count = paidModules.length;
  const isMonthly = billingPeriod === 'monthly';

  // Only show savings if upgrading to bundle
  if (count < 3) return null;

  const individualPrice = isMonthly
    ? PRICING.SINGLE_MODULE_MONTHLY * count
    : PRICING.SINGLE_MODULE_ANNUAL * count;

  const bundlePrice = calculatePrice(billingPeriod, paidModules);
  const savingsAmount = individualPrice - bundlePrice;

  if (savingsAmount <= 0) return null;

  const savingsPercentage = Math.round((savingsAmount / individualPrice) * 100);

  return {
    savingsAmount,
    savingsPercentage,
  };
}

/**
 * Get upgrade suggestion when adding a new module
 * @param {string[]} currentPaidModules - Currently subscribed modules
 * @param {string} addingModule - Module being added
 * @param {string} billingPeriod - 'monthly' or 'annual'
 * @returns {object} - { type: 'bundle_3' | 'bundle_4', savingsAmount: number, price: number } or null
 */
export function getUpgradeSuggestion(currentPaidModules, addingModule, billingPeriod) {
  if (!Array.isArray(currentPaidModules)) return null;

  // Check if adding this module would create a bundle opportunity
  const newModuleList = [...new Set([...currentPaidModules, addingModule])];
  const newCount = newModuleList.length;

  if (newCount === 3) {
    const savings = getBundleSavings(billingPeriod, newModuleList);
    return {
      type: 'bundle_3',
      savingsAmount: savings?.savingsAmount || 0,
      price: calculatePrice(billingPeriod, newModuleList),
    };
  }

  if (newCount === 4) {
    const savings = getBundleSavings(billingPeriod, newModuleList);
    return {
      type: 'bundle_4',
      savingsAmount: savings?.savingsAmount || 0,
      price: calculatePrice(billingPeriod, newModuleList),
    };
  }

  return null;
}

/**
 * Format price for display (cents to dollars)
 * @param {number} cents - Price in cents
 * @param {string} locale - Locale for formatting (default 'en-US')
 * @returns {string} - Formatted price string (e.g., "$29.99")
 */
export function formatPrice(cents, locale = 'en-US') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

/**
 * Get all pricing options for display
 * @param {string} billingPeriod - 'monthly' or 'annual'
 * @returns {object} - All pricing tiers
 */
export function getAllPricingOptions(billingPeriod = 'annual') {
  const isMonthly = billingPeriod === 'monthly';

  return {
    single: {
      modules: 1,
      price: isMonthly ? PRICING.SINGLE_MODULE_MONTHLY : PRICING.SINGLE_MODULE_ANNUAL,
      displayPrice: formatPrice(isMonthly ? PRICING.SINGLE_MODULE_MONTHLY : PRICING.SINGLE_MODULE_ANNUAL),
    },
    bundle_3: {
      modules: 3,
      price: isMonthly ? PRICING.BUNDLE_3_MONTHLY : PRICING.BUNDLE_3_ANNUAL,
      displayPrice: formatPrice(isMonthly ? PRICING.BUNDLE_3_MONTHLY : PRICING.BUNDLE_3_ANNUAL),
      savings: Math.round((1 - (isMonthly ? PRICING.BUNDLE_3_MONTHLY : PRICING.BUNDLE_3_ANNUAL) / (3 * (isMonthly ? PRICING.SINGLE_MODULE_MONTHLY : PRICING.SINGLE_MODULE_ANNUAL))) * 100),
    },
    bundle_4: {
      modules: 4,
      price: isMonthly ? PRICING.BUNDLE_4_MONTHLY : PRICING.BUNDLE_4_ANNUAL,
      displayPrice: formatPrice(isMonthly ? PRICING.BUNDLE_4_MONTHLY : PRICING.BUNDLE_4_ANNUAL),
      savings: Math.round((1 - (isMonthly ? PRICING.BUNDLE_4_MONTHLY : PRICING.BUNDLE_4_ANNUAL) / (4 * (isMonthly ? PRICING.SINGLE_MODULE_MONTHLY : PRICING.SINGLE_MODULE_ANNUAL))) * 100),
    },
  };
}