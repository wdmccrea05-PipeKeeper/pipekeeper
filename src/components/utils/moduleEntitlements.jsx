/**
 * moduleEntitlements — canonical module-scoped entitlement API.
 *
 * Rules:
 * - Free access is available for launched modules.
 * - Pro access is module-specific.
 * - Generic paid status alone never unlocks unrelated modules.
 * - Bundle/founder entitlements are explicit and isolated in this file.
 */

import { hasPaidAccess } from './premiumAccess';
import { MODULES, MODULE_LIST, getActiveModules } from './moduleRegistry';
import { isModuleLaunched } from './moduleReleaseState';

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
 * Module-level explicit entitlement or qualifying bundle is required.
 * Generic paid state never grants unrelated modules.
 */
export function hasModuleProAccess(user, moduleKey, subscription = null) {
  if (!user) return false;
  const key = normalizeModuleKey(moduleKey);

  const role = String(user.role || '').toLowerCase();
  if (role === 'admin' || role === 'owner' || user.is_admin === true) return true;

  if (!key) {
    return getModulesWithProAccess(user, subscription).length > 0;
  }

  if (hasBundleAccess(user, key)) return true;

  const explicitModules = getExplicitModuleEntitlements(user);
  if (explicitModules.includes(key)) return true;

  return false;
}

/**
 * Returns the module keys the user has paid Pro access for.
 */
export function getModulesWithProAccess(user, subscription = null) {
  if (!user) return [];

  const role = String(user.role || '').toLowerCase();
  if (role === 'admin' || role === 'owner' || user.is_admin === true) {
    return getLaunchedActiveModules();
  }

  const explicitModules = getExplicitModuleEntitlements(user);
  if (explicitModules.length > 0) return explicitModules;

  if (hasLegacyBroadAccess(user)) return getLaunchedActiveModules();

  if (!hasPaidAccess(user, subscription)) return [];

  return [];
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

export function shouldEnforceFreeLimit(user) {
  return getModulesWithProAccess(user).length === 0;
}

export function getSubscriptionSummary(user) {
  const modules = getModulesWithProAccess(user);
  const isPro = modules.length > 0;
  return {
    hasPaidAccess: isPro,
    modules,
    tier: isPro ? 'pro' : 'free',
    entitlements: isPro ? [ENTITLEMENTS.PRO] : [ENTITLEMENTS.FREE],
  };
}