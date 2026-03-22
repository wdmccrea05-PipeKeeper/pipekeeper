/**
 * RELEASE MODE CONFIGURATION
 *
 * Controls which modules are available in the current production release.
 *
 * release_mode: 'pipekeeper_stable'
 *   - PipeKeeper + Curator + CollectionHub are fully available
 *   - WhiskeyKeeper is gated off (hidden from nav, hub, routes)
 *   - No broken upgrade flows, dead CTAs, or missing module UX
 *
 * To re-enable WhiskeyKeeper for a future release:
 *   1. Change RELEASE_MODE to 'full'
 *   2. Ensure WhiskeyKeeper subscription/entitlement flows are validated
 *   3. QA all paywall and upgrade paths for WhiskeyKeeper
 *
 * ADMIN OVERRIDE: Admins can bypass the release gate via localStorage flag
 * 'ck_admin_unlock_whiskeykeeper' = 'true' to test/troubleshoot WhiskeyKeeper.
 */

export const RELEASE_MODE = 'pipekeeper_stable';
// export const RELEASE_MODE = 'full'; // uncomment when WhiskeyKeeper is release-ready

const ADMIN_OVERRIDE_KEY = 'ck_admin_unlock_whiskeykeeper';

export function isAdminWhiskeyUnlocked() {
  try {
    return localStorage.getItem(ADMIN_OVERRIDE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAdminWhiskeyUnlock(enabled) {
  try {
    if (enabled) {
      localStorage.setItem(ADMIN_OVERRIDE_KEY, 'true');
    } else {
      localStorage.removeItem(ADMIN_OVERRIDE_KEY);
    }
  } catch {}
}

/**
 * Returns true if the given module is allowed in the current release.
 * This is the single gate — all nav, hub cards, and route guards read from here.
 *
 * Fails CLOSED: if a module is not explicitly allowed, it is blocked.
 */
export function isModuleAllowedInRelease(moduleKey) {
  const key = String(moduleKey || '').trim().toLowerCase();

  if (RELEASE_MODE === 'full') return true;

  // Admin override: allow WhiskeyKeeper for testing
  if (key === 'whiskeykeeper' && isAdminWhiskeyUnlocked()) return true;

  if (RELEASE_MODE === 'pipekeeper_stable') {
    const ALLOWED = new Set(['pipekeeper', 'cigarkeeper', 'winekeeper']);
    return ALLOWED.has(key) || key === 'pipekeeper';
  }

  return key === 'pipekeeper';
}

/**
 * True if WhiskeyKeeper is blocked in the current release.
 * Respects admin override.
 */
export const WHISKEYKEEPER_BLOCKED =
  RELEASE_MODE === 'pipekeeper_stable' && !isAdminWhiskeyUnlocked();