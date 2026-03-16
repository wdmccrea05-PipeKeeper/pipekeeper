/**
 * Module Entitlements — Resolver for per-module Pro access
 * Supports mixed free/paid module states with bundle fallback
 */

import { MODULES, MODULE_LIST } from './moduleRegistry';

/**
 * Entitlement types
 */
export const ENTITLEMENTS = {
  FREE: 'free',
  PRO_PIPEKEEPER: 'pro_pipekeeper',
  PRO_WHISKEYKEEPER: 'pro_whiskeykeeper',
  PRO_CIGARKEEPER: 'pro_cigarkeeper',
  PRO_WINEKEEPER: 'pro_winekeeper',
  PRO_BUNDLE_3: 'pro_bundle_3',
  PRO_BUNDLE_4: 'pro_bundle_4',
  PRO_FOUNDERS_PIPE_WHISKEY: 'pro_founders_pipe_whiskey',
};

/**
 * Map modules to their Pro entitlements
 */
const MODULE_TO_ENTITLEMENT = {
  [MODULES.PIPEKEEPER]: ENTITLEMENTS.PRO_PIPEKEEPER,
  [MODULES.WHISKEYKEEPER]: ENTITLEMENTS.PRO_WHISKEYKEEPER,
  [MODULES.CIGARKEEPER]: ENTITLEMENTS.PRO_CIGARKEEPER,
  [MODULES.WINEKEEPER]: ENTITLEMENTS.PRO_WINEKEEPER,
};

/**
 * Check if user has Pro access to a specific module
 * Supports: direct entitlement, bundle entitlement, founders entitlement
 * @param {object} user - User object with subscription/entitlements
 * @param {string} module - Module key (from MODULES)
 * @returns {boolean}
 */
export function hasModuleProAccess(user, module) {
  if (!user) return false;

  // Get all user entitlements (from subscription or user object)
  const entitlements = getUserEntitlements(user);

  // Check direct module entitlement
  const moduleEntitlement = MODULE_TO_ENTITLEMENT[module];
  if (moduleEntitlement && entitlements.includes(moduleEntitlement)) {
    return true;
  }

  // Check bundle entitlements
  if (entitlements.includes(ENTITLEMENTS.PRO_BUNDLE_4)) return true;
  if (entitlements.includes(ENTITLEMENTS.PRO_BUNDLE_3)) return true;

  // Check founders entitlement (only applies to PipeKeeper and WhiskeyKeeper)
  if (entitlements.includes(ENTITLEMENTS.PRO_FOUNDERS_PIPE_WHISKEY)) {
    if (module === MODULES.PIPEKEEPER || module === MODULES.WHISKEYKEEPER) {
      return true;
    }
  }

  return false;
}

/**
 * Get all modules user has Pro access to
 * @param {object} user - User object
 * @returns {string[]} - Array of module keys
 */
export function getModulesWithProAccess(user) {
  if (!user) return [];

  return MODULE_LIST.filter(module => hasModuleProAccess(user, module));
}

/**
 * Extract all entitlements from user object
 * Supports both subscription-based and user-based entitlements
 * @param {object} user - User object
 * @returns {string[]} - Array of entitlement strings
 */
export function getUserEntitlements(user) {
  if (!user) return [];

  const entitlements = [];

  // Check subscription.tier or subscription.entitlement
  if (user.subscription?.tier) {
    entitlements.push(`pro_${user.subscription.tier.toLowerCase()}`);
  }

  // Check user.entitlements array
  if (Array.isArray(user.entitlements)) {
    entitlements.push(...user.entitlements);
  }

  // Check user.subscription.entitlements (legacy)
  if (Array.isArray(user.subscription?.entitlements)) {
    entitlements.push(...user.subscription.entitlements);
  }

  // Check individual module entitlements on user
  Object.values(MODULE_TO_ENTITLEMENT).forEach(ent => {
    if (user[ent] === true || user.subscription?.[ent] === true) {
      entitlements.push(ent);
    }
  });

  // Check bundle entitlements on user
  [
    ENTITLEMENTS.PRO_BUNDLE_3,
    ENTITLEMENTS.PRO_BUNDLE_4,
    ENTITLEMENTS.PRO_FOUNDERS_PIPE_WHISKEY,
  ].forEach(ent => {
    if (user[ent] === true || user.subscription?.[ent] === true) {
      entitlements.push(ent);
    }
  });

  return [...new Set(entitlements)];
}

/**
 * Check if user qualifies for founders offer
 * @param {object} user - User object
 * @returns {boolean}
 */
export function isFoundersEligible(user) {
  if (!user) return false;

  // Already has founders entitlement
  if (getUserEntitlements(user).includes(ENTITLEMENTS.PRO_FOUNDERS_PIPE_WHISKEY)) {
    return true;
  }

  // Has PipeKeeper Pro access (eligible to upgrade)
  return hasModuleProAccess(user, MODULES.PIPEKEEPER);
}

/**
 * Get user's current subscription state as a summary
 * @param {object} user - User object
 * @returns {object} - { hasPaidAccess: boolean, modules: string[], tier: string, entitlements: string[] }
 */
export function getSubscriptionSummary(user) {
  const entitlements = getUserEntitlements(user);
  const modules = getModulesWithProAccess(user);
  const hasPaidAccess = modules.length > 0;

  let tier = 'free';
  if (entitlements.includes(ENTITLEMENTS.PRO_BUNDLE_4)) tier = 'bundle_4';
  else if (entitlements.includes(ENTITLEMENTS.PRO_BUNDLE_3)) tier = 'bundle_3';
  else if (entitlements.includes(ENTITLEMENTS.PRO_FOUNDERS_PIPE_WHISKEY)) tier = 'founders';
  else if (modules.length > 0) tier = 'mixed';

  return {
    hasPaidAccess,
    modules,
    tier,
    entitlements,
  };
}

/**
 * Check if a module should enforce free limits
 * @param {object} user - User object
 * @param {string} module - Module key
 * @returns {boolean} - true if module should enforce free limits
 */
export function shouldEnforceFreeLimit(user, module) {
  // If user has Pro access to this module, do not enforce free limits
  return !hasModuleProAccess(user, module);
}

/**
 * Get entitlements for a given billing configuration
 * Used when creating/updating subscriptions
 * @param {string[]} paidModules - Modules user is paying for
 * @param {boolean} isFoundersUpgrade - Is this a founders offer purchase?
 * @returns {string[]} - Entitlements to grant
 */
export function getEntitlementsForConfig(paidModules, isFoundersUpgrade = false) {
  if (isFoundersUpgrade) {
    return [ENTITLEMENTS.PRO_FOUNDERS_PIPE_WHISKEY];
  }

  const entitlements = [];

  if (!Array.isArray(paidModules) || paidModules.length === 0) {
    return [ENTITLEMENTS.FREE];
  }

  const count = paidModules.length;

  if (count >= 4) {
    entitlements.push(ENTITLEMENTS.PRO_BUNDLE_4);
  } else if (count === 3) {
    entitlements.push(ENTITLEMENTS.PRO_BUNDLE_3);
  } else {
    // Individual module entitlements (1 or 2 modules)
    paidModules.forEach(module => {
      const ent = MODULE_TO_ENTITLEMENT[module];
      if (ent) entitlements.push(ent);
    });
  }

  return entitlements;
}