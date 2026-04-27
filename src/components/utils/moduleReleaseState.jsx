/**
 * CANONICAL MODULE RELEASE STATE SYSTEM
 *
 * States:
 *   blocked  — fully hidden from production users, fail closed
 *   internal — hidden from public users, accessible to internal/admin testers or explicitly granted test users
 *   launched — available to production users, subject to entitlements
 */

// ─── Feature flags for WineKeeper gating ─────────────────────────────────────
// Set WINEKEEPER_PUBLIC_ENABLED = true when ready for public launch.
// Set WINEKEEPER_ADMIN_ENABLED = true to allow admin/internal tester access.
export const WINEKEEPER_PUBLIC_ENABLED = false;
export const WINEKEEPER_ADMIN_ENABLED = true;

export const MODULE_RELEASE_STATES = {
  pipekeeper: 'launched',
  whiskeykeeper: 'launched',
  cigarkeeper: 'launched',
  // WineKeeper is INTERNAL ONLY — not publicly released.
  // Change to 'launched' only when WINEKEEPER_PUBLIC_ENABLED is true.
  winekeeper: WINEKEEPER_PUBLIC_ENABLED ? 'launched' : 'internal',
};

const LOCAL_OVERRIDE_PREFIX = 'ck_module_override_';
const LEGACY_WHISKEY_UNLOCK_KEY = 'ck_admin_unlock_whiskeykeeper';

function normalizeModuleKey(moduleKey) {
  return String(moduleKey || '').trim().toLowerCase();
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function safeLocalStorageGet(key) {
  try {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key, value) {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
  } catch {}
}

function safeLocalStorageRemove(key) {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  } catch {}
}

function getLocalOverride(moduleKey) {
  const key = normalizeModuleKey(moduleKey);
  const override = safeLocalStorageGet(`${LOCAL_OVERRIDE_PREFIX}${key}`);
  if (override === 'blocked' || override === 'internal' || override === 'launched') {
    return override;
  }

  // Legacy whiskey admin preview compatibility.
  if (key === 'whiskeykeeper' && safeLocalStorageGet(LEGACY_WHISKEY_UNLOCK_KEY) === 'true') {
    return 'internal';
  }

  return null;
}

const INTERNAL_TESTER_EMAILS = new Set([
  // Add internal tester emails here if needed.
]);

function parseModulesCsv(csv) {
  return new Set(
    String(csv || '')
      .split(',')
      .map((m) => m.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function hasExplicitModuleEntitlement(moduleKey, user) {
  if (!user) return false;

  const key = normalizeModuleKey(moduleKey);
  if (!key) return false;

  const directFlag = user?.[`${key}_paid`] === true;
  const nestedFlag = user?.data?.[`${key}_paid`] === true;
  if (directFlag || nestedFlag) return true;

  const csv = parseModulesCsv(user?.paid_modules_csv);
  if (csv.has(key)) return true;

  const nestedCsv = parseModulesCsv(user?.data?.paid_modules_csv);
  return nestedCsv.has(key);
}

export function isInternalModuleTester(user) {
  if (!user) return false;

  const role = String(user.role || '').trim().toLowerCase();
  if (role === 'admin' || role === 'owner' || role === 'superadmin') return true;
  if (user.is_admin === true) return true;
  if (user.internal_tester === true || user.is_internal_tester === true) return true;

  const email = normalizeEmail(user.email || user.user_email);
  if (email && INTERNAL_TESTER_EMAILS.has(email)) return true;

  return false;
}

export function canAccessInternalModuleForTesting(moduleKey, user) {
  if (!user) return false;
  return isInternalModuleTester(user) || hasExplicitModuleEntitlement(moduleKey, user);
}

export function getModuleReleaseState(moduleKey) {
  const key = normalizeModuleKey(moduleKey);
  return MODULE_RELEASE_STATES[key] || 'blocked';
}

export function getEffectiveModuleReleaseState(moduleKey, user = null) {
  const key = normalizeModuleKey(moduleKey);
  const canonicalState = getModuleReleaseState(key);
  const override = getLocalOverride(key);

  if (override && isInternalModuleTester(user)) {
    return override;
  }

  return canonicalState;
}

export function isModuleBlocked(moduleKey, user = null) {
  return getEffectiveModuleReleaseState(moduleKey, user) === 'blocked';
}

export function isModuleInternal(moduleKey, user = null) {
  return getEffectiveModuleReleaseState(moduleKey, user) === 'internal';
}

export function isModuleLaunched(moduleKey, user = null) {
  return getEffectiveModuleReleaseState(moduleKey, user) === 'launched';
}

export function canUserAccessModule(moduleKey, user, hasEntitlement = true) {
  const state = getEffectiveModuleReleaseState(moduleKey, user);

  if (state === 'blocked') return false;
  if (state === 'internal') return canAccessInternalModuleForTesting(moduleKey, user);
  if (state === 'launched') return !!hasEntitlement;
  return false;
}

export function shouldShowModuleInNav(moduleKey, user, hasEntitlement = true) {
  const state = getEffectiveModuleReleaseState(moduleKey, user);

  if (state === 'blocked') return false;
  if (state === 'internal') return canAccessInternalModuleForTesting(moduleKey, user);
  return !!hasEntitlement;
}

export function shouldFetchModuleData(moduleKey, user, hasEntitlement = true) {
  const state = getEffectiveModuleReleaseState(moduleKey, user);

  if (state === 'blocked') return false;
  if (state === 'internal') return canAccessInternalModuleForTesting(moduleKey, user);
  return !!hasEntitlement;
}

export function shouldExposeModuleInCurator(moduleKey, user, hasEntitlement = true) {
  return shouldFetchModuleData(moduleKey, user, hasEntitlement);
}

export function getAccessibleModules(user, entitlementMap = {}) {
  return Object.keys(MODULE_RELEASE_STATES).filter((moduleKey) => {
    const hasEntitlement = entitlementMap[moduleKey] ?? true;
    return canUserAccessModule(moduleKey, user, hasEntitlement);
  });
}

export function getFetchableModules(user, entitlementMap = {}) {
  return Object.keys(MODULE_RELEASE_STATES).filter((moduleKey) => {
    const hasEntitlement = entitlementMap[moduleKey] ?? true;
    return shouldFetchModuleData(moduleKey, user, hasEntitlement);
  });
}

export const RELEASE_MODE = 'pipekeeper_stable';

export function isModuleAllowedInRelease(moduleKey) {
  // Conservative static answer for shared code paths without user context.
  return getModuleReleaseState(moduleKey) === 'launched';
}

// Generic admin/internal override API — supports any module key.

export function getAdminModuleOverride(moduleKey) {
  return getLocalOverride(moduleKey);
}

export function setAdminModuleOverride(moduleKey, state) {
  const key = normalizeModuleKey(moduleKey);
  if (state === null || state === undefined) {
    safeLocalStorageRemove(`${LOCAL_OVERRIDE_PREFIX}${key}`);
  } else {
    safeLocalStorageSet(`${LOCAL_OVERRIDE_PREFIX}${key}`, state);
  }
}

export function clearAdminModuleOverride(moduleKey) {
  safeLocalStorageRemove(`${LOCAL_OVERRIDE_PREFIX}${normalizeModuleKey(moduleKey)}`);
}

// Legacy whiskey-specific helpers — kept for backward compatibility.
// Prefer the generic API above for new code.

export function isAdminWhiskeyUnlocked() {
  return getLocalOverride('whiskeykeeper') === 'internal' || getLocalOverride('whiskeykeeper') === 'launched';
}

export function setAdminWhiskeyUnlock(enabled) {
  if (enabled) {
    safeLocalStorageSet(LEGACY_WHISKEY_UNLOCK_KEY, 'true');
    safeLocalStorageSet(`${LOCAL_OVERRIDE_PREFIX}whiskeykeeper`, 'internal');
  } else {
    safeLocalStorageRemove(LEGACY_WHISKEY_UNLOCK_KEY);
    safeLocalStorageRemove(`${LOCAL_OVERRIDE_PREFIX}whiskeykeeper`);
  }
}

export const WHISKEYKEEPER_BLOCKED = getModuleReleaseState('whiskeykeeper') === 'blocked';

export function logModuleReleaseDebug(user) {
  if (typeof console === 'undefined') return;

  const summary = Object.keys(MODULE_RELEASE_STATES).reduce((acc, moduleKey) => {
    acc[moduleKey] = {
      canonical: getModuleReleaseState(moduleKey),
      effective: getEffectiveModuleReleaseState(moduleKey, user),
      nav: shouldShowModuleInNav(moduleKey, user, true),
      fetch: shouldFetchModuleData(moduleKey, user, true),
      access: canUserAccessModule(moduleKey, user, true),
    };
    return acc;
  }, {});

  console.group('[ModuleReleaseDebug]');
  console.log('internalTester:', isInternalModuleTester(user));
  console.table(summary);
  console.groupEnd();
}