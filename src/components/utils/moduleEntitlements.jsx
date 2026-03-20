/**
 * moduleEntitlements — delegates to canonical premiumAccess resolver.
 *
 * The old per-module entitlement system (pro_pipekeeper, pro_bundle_3, etc.)
 * is removed. The app has ONE tier: pro. Any paid user gets all modules.
 *
 * Kept as a shim so existing imports don't break.
 */

import { hasPaidAccess } from './premiumAccess';
import { MODULES, MODULE_LIST, getActiveModules } from './moduleRegistry';

export { MODULES, MODULE_LIST };

export const ENTITLEMENTS = {
  FREE: 'free',
  PRO: 'pro',
};

/**
 * True if user has Pro access (any module). Pro = all modules.
 */
export function hasModuleProAccess(user, _module) {
  return hasPaidAccess(user);
}

/**
 * Returns all active module keys for Pro users, empty array for free.
 */
export function getModulesWithProAccess(user) {
  if (!hasPaidAccess(user)) return [];
  return getActiveModules();
}

/**
 * For Pro users: all active modules. For free: empty.
 */
export function getUserEntitlements(user) {
  if (!hasPaidAccess(user)) return [ENTITLEMENTS.FREE];
  return [ENTITLEMENTS.PRO];
}

export function shouldEnforceFreeLimit(user) {
  return !hasPaidAccess(user);
}

export function getSubscriptionSummary(user) {
  const isPro = hasPaidAccess(user);
  return {
    hasPaidAccess: isPro,
    modules: isPro ? getActiveModules() : [],
    tier: isPro ? 'pro' : 'free',
    entitlements: isPro ? [ENTITLEMENTS.PRO] : [ENTITLEMENTS.FREE],
  };
}