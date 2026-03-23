/**
 * CANONICAL MODULE RELEASE STATE SYSTEM
 *
 * Single source of truth for all module visibility and access decisions.
 *
 * States:
 *   blocked  — fully hidden from all production users, fail closed
 *   internal — hidden from normal users, accessible to internal/admin testers only
 *   launched — available to production users, subject to entitlements
 *
 * To launch a module:
 *   1. Change its state here from 'blocked'/'internal' → 'launched'
 *   2. Verify route guards, nav, aggregation, Curator, paywall copy
 *   3. Run smoke tests
 */

// ─── RELEASE STATE TABLE ────────────────────────────────────────────────────
// Modify ONLY this table to change module availability.

export const MODULE_RELEASE_STATES = {
  pipekeeper:    'launched',
  whiskeykeeper: 'blocked',
  cigarkeeper:   'blocked',
  winekeeper:    'blocked',
};

// ─── LOCAL DEV OVERRIDE ──────────────────────────────────────────────────────
// In development only, localStorage can override individual modules for testing.
// NEVER used in production decisions for non-admin users.

const LOCAL_OVERRIDE_PREFIX = 'ck_module_override_';

function getLocalOverride(moduleKey) {
  try {
    if (typeof window === 'undefined') return null;
    const val = localStorage.getItem(`${LOCAL_OVERRIDE_PREFIX}${moduleKey}`);
    if (val === 'internal' || val === 'launched') return val;
    return null;
  } catch {
    return null;
  }
}

// ─── INTERNAL TESTER ACCESS ──────────────────────────────────────────────────
// A user qualifies as an internal module tester if:
//   - they are an admin (user.role === 'admin')
//   - they have user.internal_tester === true
//   - their email is in the INTERNAL_TESTER_EMAILS set
// This is evaluated at runtime from the user object — not from localStorage.

const INTERNAL_TESTER_EMAILS = new Set([
  // Add internal tester emails here, e.g.:
  // 'dev@collectionkeeper.com',
]);

export function isInternalModuleTester(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.internal_tester === true) return true;
  const email = String(user.email || '').trim().toLowerCase();
  if (email && INTERNAL_TESTER_EMAILS.has(email)) return true;
  return false;
}

// ─── STATE ACCESSORS ─────────────────────────────────────────────────────────

/**
 * Get the canonical release state for a module.
 * Returns: 'blocked' | 'internal' | 'launched'
 * Fails closed — unknown modules are 'blocked'.
 */
export function getModuleReleaseState(moduleKey) {
  const key = String(moduleKey || '').trim().toLowerCase();
  return MODULE_RELEASE_STATES[key] || 'blocked';
}

export function isModuleBlocked(moduleKey) {
  return getModuleReleaseState(moduleKey) === 'blocked';
}

export function isModuleInternal(moduleKey) {
  return getModuleReleaseState(moduleKey) === 'internal';
}

export function isModuleLaunched(moduleKey) {
  return getModuleReleaseState(moduleKey) === 'launched';
}

// ─── ACCESS DECISION HELPERS ─────────────────────────────────────────────────

/**
 * Can this user access this module at all?
 *
 * Rules (in precedence order):
 *   1. blocked → no access for anyone (except local dev override)
 *   2. internal → access only if isInternalModuleTester(user)
 *   3. launched → access if entitlements allow (entitlements = object or true/false)
 *
 * @param {string} moduleKey
 * @param {object|null} user  - current user object (must have .role, .email, etc.)
 * @param {boolean} [hasEntitlement=true] - whether user has paid/entitlement for this module
 * @returns {boolean}
 */
export function canUserAccessModule(moduleKey, user, hasEntitlement = true) {
  const key = String(moduleKey || '').trim().toLowerCase();
  const state = getModuleReleaseState(key);

  // Local dev override (only for admin/internal users)
  const localOverride = getLocalOverride(key);
  if (localOverride && isInternalModuleTester(user)) {
    // Dev override can promote blocked→internal or internal→launched for testing
    const effectiveState = localOverride;
    if (effectiveState === 'launched') return !!hasEntitlement;
    if (effectiveState === 'internal') return isInternalModuleTester(user);
  }

  if (state === 'blocked') return false;
  if (state === 'internal') return isInternalModuleTester(user);
  if (state === 'launched') return !!hasEntitlement;
  return false; // fail closed
}

/**
 * Should this module appear in navigation?
 */
export function shouldShowModuleInNav(moduleKey, user) {
  const key = String(moduleKey || '').trim().toLowerCase();
  const state = getModuleReleaseState(key);

  // Check local override for admin/internal testers
  const localOverride = getLocalOverride(key);
  if (localOverride && isInternalModuleTester(user)) return true;

  if (state === 'blocked') return false;
  if (state === 'internal') return isInternalModuleTester(user);
  return true; // launched: show always (entitlement gates content, not nav entry)
}

/**
 * Should data be fetched for this module?
 * Prevents blocked modules from issuing queries at all.
 */
export function shouldFetchModuleData(moduleKey, user) {
  const key = String(moduleKey || '').trim().toLowerCase();
  const state = getModuleReleaseState(key);

  // Check local override for admin/internal testers
  const localOverride = getLocalOverride(key);
  if (localOverride && isInternalModuleTester(user)) return true;

  if (state === 'blocked') return false;
  if (state === 'internal') return isInternalModuleTester(user);
  return true;
}

/**
 * Should Curator / AI include this module in its collection scope?
 */
export function shouldExposeModuleInCurator(moduleKey, user) {
  return shouldFetchModuleData(moduleKey, user);
}

/**
 * Get all module keys that are accessible to this user.
 */
export function getAccessibleModules(user) {
  return Object.keys(MODULE_RELEASE_STATES).filter((key) =>
    canUserAccessModule(key, user, true)
  );
}

/**
 * Get all module keys that should be fetched for this user.
 */
export function getFetchableModules(user) {
  return Object.keys(MODULE_RELEASE_STATES).filter((key) =>
    shouldFetchModuleData(key, user)
  );
}

// ─── LEGACY COMPAT ───────────────────────────────────────────────────────────
// Keep old releaseConfig exports working so existing callers don't break.

export const RELEASE_MODE = 'pipekeeper_stable';

export function isModuleAllowedInRelease(moduleKey) {
  // Calls the new canonical system with no user (anonymous/unknown context).
  // This gives a conservative answer suitable for static checks.
  const key = String(moduleKey || '').trim().toLowerCase();
  return isModuleLaunched(key);
}

export function isAdminWhiskeyUnlocked() {
  try {
    return localStorage.getItem('ck_admin_unlock_whiskeykeeper') === 'true';
  } catch {
    return false;
  }
}

export function setAdminWhiskeyUnlock(enabled) {
  try {
    if (enabled) {
      localStorage.setItem('ck_admin_unlock_whiskeykeeper', 'true');
      localStorage.setItem(`${LOCAL_OVERRIDE_PREFIX}whiskeykeeper`, 'launched');
    } else {
      localStorage.removeItem('ck_admin_unlock_whiskeykeeper');
      localStorage.removeItem(`${LOCAL_OVERRIDE_PREFIX}whiskeykeeper`);
    }
  } catch {}
}

export const WHISKEYKEEPER_BLOCKED = isModuleBlocked('whiskeykeeper');

// ─── DEBUG UTILITY ───────────────────────────────────────────────────────────

/**
 * Log module release state summary for current user (dev/admin QA tool).
 */
export function logModuleReleaseDebug(user) {
  const modules = Object.keys(MODULE_RELEASE_STATES);
  const isInternal = isInternalModuleTester(user);
  console.group('[ModuleReleaseState] Debug Summary');
  console.log('User:', user?.email || 'unknown', '| Internal tester:', isInternal);
  modules.forEach((key) => {
    const state = getModuleReleaseState(key);
    const canAccess = canUserAccessModule(key, user, true);
    const canFetch = shouldFetchModuleData(key, user);
    const inNav = shouldShowModuleInNav(key, user);
    console.log(`  ${key}: state=${state} | access=${canAccess} | fetch=${canFetch} | nav=${inNav}`);
  });
  console.groupEnd();
}