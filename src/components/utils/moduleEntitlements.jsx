/**
 * moduleEntitlements — canonical module-scoped entitlement API.
 *
 * DELEGATES to resolveModuleAccess (the single canonical access decision).
 * Legacy functions are preserved for backwards compatibility but now
 * route through the canonical resolver.
 *
 * Rules:
 * - Free access is available for launched modules.
 * - Pro access is module-specific.
 * - Generic paid status alone never unlocks unrelated modules.
 * - Bundle/founder entitlements are explicit and isolated.
 * - Legacy projection flags (pipekeeper_paid, paid_modules_csv) are NOT
 *   authoritative — they cannot independently grant access when
 *   authoritative subscription lifecycle says no.
 */

import { hasPaidAccess } from './premiumAccess';
import { subscriptionGrantsPaidAccess } from './gracePeriod';
import { MODULES, MODULE_LIST, getActiveModules } from './moduleRegistry';
import { isModuleLaunched } from './moduleReleaseState';
import { resolveModuleAccess, getCanonicalProModules, checkLegacyProjectionMismatch } from './resolveModuleAccess';

// Only modules with canonical 'launched' state are granted to normal users.
// WhiskeyKeeper is publicly launched — it is now included for paid subscribers.
function getLaunchedActiveModules() {
  return getActiveModules().filter((m) => isModuleLaunched(m));
}

function getFlagModules(user) {
  if (!user) return [];
  const modules = [];
  if (user.pipekeeper_paid) modules.push('pipekeeper');
  if (user.whiskeykeeper_paid) modules.push('whiskeykeeper');
  if (user.cigarkeeper_paid) modules.push('cigarkeeper');
  if (user.winekeeper_paid) modules.push('winekeeper');
  return modules.filter((m) => isModuleLaunched(m));
}

function hasLegacyBroadAccess(user) {
  return Boolean(user?.isFoundingMember || user?.legacy_broad_module_access);
}

function normalizeModuleKey(moduleKey) {
  return String(moduleKey || '').trim().toLowerCase();
}

function parseCsvModules(csv) {
  return String(csv || '')
    .split(',')
    .map((m) => normalizeModuleKey(m))
    .filter(Boolean)
    .filter((m) => isModuleLaunched(m));
}

function parseEntitlementModules(user) {
  const values = Array.isArray(user?.entitlements) ? user.entitlements : [];
  const modules = [];
  for (const raw of values) {
    const value = String(raw || '').toLowerCase();
    if (value.includes('pipe')) modules.push('pipekeeper');
    if (value.includes('whiskey')) modules.push('whiskeykeeper');
    if (value.includes('cigar')) modules.push('cigarkeeper');
    if (value.includes('wine')) modules.push('winekeeper');
  }
  return [...new Set(modules)].filter((m) => isModuleLaunched(m));
}

function resolveBundleModules(user) {
  if (!user) return [];

  const planHints = [
    user?.plan_key,
    user?.planKey,
    user?.plan,
    user?.subscription_plan,
    user?.subscription_plan_key,
  ]
    .map((v) => String(v || '').toLowerCase())
    .filter(Boolean);

  const entitlementHints = Array.isArray(user?.entitlements)
    ? user.entitlements.map((v) => String(v || '').toLowerCase())
    : [];

  const hints = [...planHints, ...entitlementHints];
  if (hints.length === 0) return [];

  if (hints.some((h) => h.includes('founders'))) {
    return ['pipekeeper', 'whiskeykeeper'].filter((m) => isModuleLaunched(m));
  }

  if (hints.some((h) => h.includes('four_module_bundle') || h.includes('bundle_4'))) {
    return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'].filter((m) => isModuleLaunched(m));
  }

  if (hints.some((h) => h.includes('three_module_bundle') || h.includes('bundle_3'))) {
    // Prefer explicitly selected modules stored on the user record.
    // Fall back to legacy default (pipekeeper, whiskeykeeper, cigarkeeper) if no selection is stored.
    const selectedCsv = user?.selected_modules_csv || user?.paid_modules_csv || '';
    const selectedModules = parseCsvModules(selectedCsv);
    if (selectedModules.length >= 2) {
      return selectedModules;
    }
    // Legacy default — users who purchased before flexible 3-module bundles existed
    return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'].filter((m) => isModuleLaunched(m));
  }

  return [];
}

function getExplicitModuleEntitlements(user) {
  if (!user) return [];
  const csvModules = parseCsvModules(user?.paid_modules_csv);
  const flaggedModules = getFlagModules(user);
  const entitlementModules = parseEntitlementModules(user);
  const bundleModules = resolveBundleModules(user);
  return [...new Set([...csvModules, ...flaggedModules, ...entitlementModules, ...bundleModules])];
}

export { MODULES, MODULE_LIST };

export const ENTITLEMENTS = {
  FREE: 'free',
  PRO: 'pro',
};

/**
 * Returns true when user has bundle coverage for moduleKey.
 * Founding/legacy broad users are treated as bundle users.
 */
export function hasBundleAccess(user, moduleKey) {
  if (!user) return false;
  const key = normalizeModuleKey(moduleKey);

  const role = String(user.role || '').toLowerCase();
  if (role === 'admin' || role === 'owner' || user.is_admin === true) return true;
  if (hasLegacyBroadAccess(user)) return true;
  if (!key) return resolveBundleModules(user).length > 0;
  return resolveBundleModules(user).includes(key);
}

/**
 * True if user has paid Pro access for the specified module.
 *
 * CANONICAL: Delegates to resolveModuleAccess — the single source of truth.
 * Legacy projection flags (pipekeeper_paid, paid_modules_csv) are NOT
 * authoritative. They cannot independently grant access when authoritative
 * subscription lifecycle says no.
 *
 * @param {Object} user - User entity
 * @param {string} moduleKey - Module key
 * @param {Object|null|undefined} subscription - Subscription record (null = loaded/no records, undefined = loading)
 * @returns {boolean}
 */
export function hasModuleProAccess(user, moduleKey, subscription = undefined) {
  if (!user) return false;
  const result = resolveModuleAccess(user, moduleKey, subscription);
  return result.has_access;
}

/**
 * Returns the module keys the user has paid Pro access for.
 *
 * CANONICAL: Delegates to getCanonicalProModules which uses resolveModuleAccess
 * for each module. Legacy projection flags are NOT authoritative.
 *
 * @param {Object} user - User entity
 * @param {Object|null|undefined} subscription - Subscription record
 * @returns {string[]} Module keys with Pro access
 */
export function getModulesWithProAccess(user, subscription = undefined) {
  if (!user) return [];
  return getCanonicalProModules(user, subscription);
}

export function hasModuleFreeAccess(_user, moduleKey) {
  const key = normalizeModuleKey(moduleKey);
  return Boolean(key) && isModuleLaunched(key);
}

export function getModuleTier(user, moduleKey, subscription = null) {
  const key = normalizeModuleKey(moduleKey);
  if (!key || !isModuleLaunched(key)) return 'locked';
  if (hasModuleProAccess(user, key, subscription)) return 'pro';
  if (hasModuleFreeAccess(user, key)) return 'free';
  return 'locked';
}

/**
 * For Pro users: all active modules. For free: empty.
 */
export function getUserEntitlements(user, subscription = null) {
  return getModulesWithProAccess(user, subscription).length > 0
    ? [ENTITLEMENTS.PRO]
    : [ENTITLEMENTS.FREE];
}

/**
 * True if free-tier limits should be enforced for this user.
 *
 * CANONICAL: Uses getModulesWithProAccess with the subscription record.
 * Callers MUST pass the subscription to get the canonical decision.
 * If subscription is not passed (undefined), falls back to legacy flags
 * during loading — but once subscription is loaded (null or object),
 * the canonical resolver's decision is authoritative.
 *
 * @param {Object} user - User entity
 * @param {Object|null|undefined} subscription - Subscription record
 * @returns {boolean}
 */
export function shouldEnforceFreeLimit(user, subscription = undefined) {
  return getModulesWithProAccess(user, subscription).length === 0;
}

export function getSubscriptionSummary(user, subscription = undefined) {
  const modules = getModulesWithProAccess(user, subscription);
  const isPro = modules.length > 0;
  return {
    hasPaidAccess: isPro,
    modules,
    tier: isPro ? 'pro' : 'free',
    entitlements: isPro ? [ENTITLEMENTS.PRO] : [ENTITLEMENTS.FREE],
  };
}

// ── CANONICAL RESOLVER RE-EXPORTS ──────────────────────────────────────────
// resolveModuleAccess is the single canonical access decision.
// All access consumers should use these re-exports.
export { resolveModuleAccess, getCanonicalProModules, checkLegacyProjectionMismatch };