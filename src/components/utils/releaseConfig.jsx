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
 */

export const RELEASE_MODE = 'pipekeeper_stable';
// export const RELEASE_MODE = 'full'; // uncomment when WhiskeyKeeper is release-ready

/**
 * Returns true if the given module is allowed in the current release.
 * This is the single gate — all nav, hub cards, and route guards read from here.
 *
 * Fails CLOSED: if a module is not explicitly allowed, it is blocked.
 */
export function isModuleAllowedInRelease(moduleKey) {
  const key = String(moduleKey || '').trim().toLowerCase();

  if (RELEASE_MODE === 'full') return true;

  if (RELEASE_MODE === 'pipekeeper_stable') {
    // Only these modules are in the stable release
    const ALLOWED = new Set(['pipekeeper', 'cigarkeeper', 'winekeeper']);
    // cigar/wine remain in registry as "coming soon" — allowed means not crash-blocked
    // whiskeykeeper is deterministically excluded
    return ALLOWED.has(key) || key === 'pipekeeper';
  }

  // Unknown release mode — fail closed
  return key === 'pipekeeper';
}

/**
 * True if WhiskeyKeeper is blocked in the current release.
 * Use this for nav guards, hub card rendering, and route guards.
 */
export const WHISKEYKEEPER_BLOCKED = RELEASE_MODE === 'pipekeeper_stable';