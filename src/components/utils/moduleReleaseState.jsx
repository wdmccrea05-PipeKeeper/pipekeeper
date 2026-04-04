/**
 * CANONICAL MODULE RELEASE STATE SYSTEM
 *
 * States:
 *   blocked  — fully hidden from production users, fail closed
 *   internal — hidden from normal users, accessible to internal/admin testers only
 *   launched — available to production users, subject to entitlements
 */

export const MODULE_RELEASE_STATES = {
  pipekeeper: 'launched',
  whiskeykeeper: 'launched',
  cigarkeeper: 'blocked',
  winekeeper: 'blocked',
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
  if (state === 'internal') return isInternalModuleTester(user);
  if (state === 'launched') return !!hasEntitlement;
  return false;
}

export function shouldShowModuleInNav(moduleKey, user, hasEntitlement = true) {
  const state = getEffectiveModuleReleaseState(moduleKey, user);

  if (state === 'blocked') return false;
  if (state === 'internal') return isInternalModuleTester(user);
  return !!hasEntitlement;
}

export function shouldFetchModuleData(moduleKey, user, hasEntitlement = true) {
  const state = getEffectiveModuleReleaseState(moduleKey, user);

  if (state === 'blocked') return false;
  if (state === 'internal') return isInternalModuleTester(user);
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