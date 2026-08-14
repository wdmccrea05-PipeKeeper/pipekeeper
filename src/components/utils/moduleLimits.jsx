/**
 * MODULE LIMITS — canonical free tier limits.
 *
 * Single source of truth for all free-tier enforcement.
 * Pro users have NO limits.
 *
 * Usage: import { getModuleLimits, hasReachedLimit } from '@/components/utils/moduleLimits'
 */

import { hasModuleProAccess } from './moduleEntitlements';

const FREE_LIMITS = {
  pipekeeper: {
    pipes: 5,
    tobaccoBlends: 10,
    sessionsPerMonth: 100,
    breakInSchedules: 1,
  },
  whiskeykeeper: {
    bottles: 10,
    tastingsPerMonth: 100,
  },
  cigarkeeper: {
    cigars: 10,
    logsPerMonth: 100,
  },
  winekeeper: {
    bottles: 10,
    tastingsPerMonth: 100,
  },
};

/**
 * Get all free-tier limits for a module.
 * @param {string} module - Module key (e.g. 'pipekeeper')
 * @returns {object}
 */
export function getModuleLimits(module) {
  return FREE_LIMITS[String(module || '').toLowerCase()] || {};
}

/**
 * Get a single limit value.
 * @param {string} module
 * @param {string} limitKey
 * @returns {number|null}
 */
export function getModuleLimit(module, limitKey) {
  const limits = getModuleLimits(module);
  return limits[limitKey] != null ? limits[limitKey] : null;
}

/**
 * True if the user should have module limits enforced.
 * Pro users (any module) are never limited.
 */
export function shouldEnforceModuleLimit(user, subscription) {
  return !hasModuleProAccess(user, null, subscription);
}

/**
 * True if user has reached the limit for a given item type.
 */
export function hasReachedLimit(user, subscription, module, limitKey, currentCount) {
  if (hasModuleProAccess(user, module, subscription)) return false;
  const limit = getModuleLimit(module, limitKey);
  if (limit == null) return false;
  return currentCount >= limit;
}

/**
 * Remaining items before hitting the limit.
 * Returns null for Pro users (no limit).
 */
export function getRemainingBeforeLimit(user, subscription, module, limitKey, currentCount) {
  if (hasModuleProAccess(user, module, subscription)) return null;
  const limit = getModuleLimit(module, limitKey);
  if (limit == null) return null;
  return Math.max(0, limit - currentCount);
}

export const LIMIT_LABELS = {
  pipes: 'Pipes',
  tobaccoBlends: 'Tobacco Blends',
  bottles: 'Bottles',
  cigars: 'Cigars',
  sessionsPerMonth: 'Sessions per Month',
  tastingsPerMonth: 'Tastings per Month',
  logsPerMonth: 'Logs per Month',
  breakInSchedules: 'Break-In Schedules',
};