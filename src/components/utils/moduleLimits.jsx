/**
 * Module-based free tier limits
 * Each module has independent free limits
 * Users must have Pro access to that specific module to unlock limits
 */

import { hasModuleProAccess } from './moduleEntitlements';
import { MODULES } from './moduleRegistry';

/**
 * Free tier limits per module
 * These apply only if the user does NOT have Pro access to that module
 */
const FREE_LIMITS = {
  [MODULES.PIPEKEEPER]: {
    pipes: 10,
    tobaccoBlends: 10,
    sessionsPerMonth: 100,
    breakInSchedules: 1,
  },
  [MODULES.WHISKEYKEEPER]: {
    bottles: 10,
    tastingsPerMonth: 100,
    customFields: 0, // Not available in free tier
  },
  [MODULES.CIGARKEEPER]: {
    cigars: 10,
    logsPerMonth: 100,
  },
  [MODULES.WINEKEEPER]: {
    bottles: 10,
    tastingsPerMonth: 100,
  },
};

/**
 * Check if a module limit is enforced for the user
 * Returns false if user has Pro access to that module
 * @param {object} user - User object
 * @param {string} module - Module key
 * @returns {boolean} - true if free limits should be enforced
 */
export function shouldEnforceModuleLimit(user, module) {
  return !hasModuleProAccess(user, module);
}

/**
 * Get the free limit for a specific module and field
 * @param {string} module - Module key
 * @param {string} limitKey - Limit key (e.g., 'pipes', 'bottles')
 * @returns {number|null} - Limit value or null if no limit
 */
export function getModuleLimit(module, limitKey) {
  const moduleLimits = FREE_LIMITS[module];
  if (!moduleLimits) return null;
  return moduleLimits[limitKey] || null;
}

/**
 * Get all limits for a module
 * @param {string} module - Module key
 * @returns {object} - All limits for the module
 */
export function getModuleLimits(module) {
  return FREE_LIMITS[module] || {};
}

/**
 * Check if user has reached a specific limit
 * @param {object} user - User object
 * @param {string} module - Module key
 * @param {string} limitKey - Limit key
 * @param {number} currentCount - Current count of items
 * @returns {boolean} - true if limit is reached
 */
export function hasReachedLimit(user, module, limitKey, currentCount) {
  // Pro users have no limits
  if (hasModuleProAccess(user, module)) return false;

  const limit = getModuleLimit(module, limitKey);
  if (limit === null) return false; // No limit defined

  return currentCount >= limit;
}

/**
 * Get remaining items before hitting limit
 * @param {object} user - User object
 * @param {string} module - Module key
 * @param {string} limitKey - Limit key
 * @param {number} currentCount - Current count of items
 * @returns {number|null} - Remaining items or null if no limit or Pro access
 */
export function getRemainingBeforeLimit(user, module, limitKey, currentCount) {
  // Pro users have no limits
  if (hasModuleProAccess(user, module)) return null;

  const limit = getModuleLimit(module, limitKey);
  if (limit === null) return null; // No limit defined

  return Math.max(0, limit - currentCount);
}

/**
 * Example free limits display
 */
export const LIMIT_LABELS = {
  pipes: 'Pipes',
  tobaccoBlends: 'Tobacco Blends',
  bottles: 'Bottles',
  cigars: 'Cigars',
  sessionsPerMonth: 'Sessions per Month',
  tastingsPerMonth: 'Tastings per Month',
  logsPerMonth: 'Logs per Month',
  breakInSchedules: 'Break-In Schedules',
  customFields: 'Custom Fields',
};

/**
 * Get free tier message for a module
 * @param {string} module - Module key
 * @returns {string} - Message describing free tier limits
 */
export function getFreeTierMessage(module) {
  const limits = getModuleLimits(module);
  if (!limits || Object.keys(limits).length === 0) {
    return 'Free tier with limited features';
  }

  const limitItems = Object.entries(limits)
    .map(([key, value]) => `${value} ${LIMIT_LABELS[key] || key}`)
    .join(', ');

  return `Free tier: ${limitItems}`;
}

/**
 * Check if a feature is available in free tier
 * Example: custom fields might not be available in WhiskeyKeeper free tier
 * @param {string} module - Module key
 * @param {string} featureKey - Feature key
 * @returns {boolean}
 */
export function isFeatureFreeTierAvailable(module, featureKey) {
  const limits = getModuleLimits(module);
  if (!limits) return true; // No limits defined = feature available

  // Features with 0 limit are not available
  if (limits[featureKey] === 0) return false;

  return true;
}