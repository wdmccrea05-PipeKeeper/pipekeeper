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
import { isModuleLaunched } from './moduleReleaseState';

// Only modules with canonical 'launched' state are granted to normal users.
// WhiskeyKeeper is 'internal' until official release — excluded here.
function getLaunchedActiveModules() {
  return getActiveModules().filter((m) => isModuleLaunched(m));
}

export { MODULES, MODULE_LIST };

export const ENTITLEMENTS = {
  FREE: 'free',
  PRO: 'pro',
};

/**
 * True if user has paid Pro access for the specified module.
 * Checks user.paid_modules_csv so a PipeKeeper-only subscriber
 * does NOT appear to own WhiskeyKeeper.
 *
 * Falls back to any-paid-access when paid_modules_csv is absent
 * (legacy accounts created before per-module tracking was added).
 */
export function hasModuleProAccess(user, moduleKey) {
  if (!user) return false;

  // Admins always have access
  const role = String(user.role || '').toLowerCase();
  if (role === 'admin' || role === 'owner' || user.is_admin === true) return true;

  // Must have paid access at all
  if (!hasPaidAccess(user)) return false;

  // No specific module requested — just confirm paid access
  if (!moduleKey) return true;

  const paidCsv = String(user.paid_modules_csv || '').trim().toLowerCase();

  // Legacy fallback: has_paid_access=true but no csv stored → grant all launched modules
  if (!paidCsv) return true;

  const paidModules = paidCsv.split(',').map((m) => m.trim()).filter(Boolean);
  return paidModules.includes(String(moduleKey || '').trim().toLowerCase());
}

/**
 * Returns the module keys the user has actually paid for.
 * Respects paid_modules_csv; falls back to all launched modules for legacy accounts.
 */
export function getModulesWithProAccess(user) {
  if (!hasPaidAccess(user)) return [];
  const csv = String(user?.paid_modules_csv || '').trim().toLowerCase();
  if (!csv) return getLaunchedActiveModules(); // legacy fallback
  return csv.split(',').map((m) => m.trim()).filter((m) => m && isModuleLaunched(m));
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
    modules: isPro ? getLaunchedActiveModules() : [],
    tier: isPro ? 'pro' : 'free',
    entitlements: isPro ? [ENTITLEMENTS.PRO] : [ENTITLEMENTS.FREE],
  };
}