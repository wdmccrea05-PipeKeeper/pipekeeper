/**
 * MODULE ACCESS CONTROL
 * Defines the module subscription architecture for CollectionKeeper.
 *
 * Pricing model:
 * - $29.99/year per individual module
 * - $79.99/year bundle (when 3+ modules are available)
 *
 * Access rules:
 * - Pro / Premium subscribers: all modules unlocked
 * - Free users: limited to read-only preview
 * - Admin users: all modules always unlocked
 */

export const MODULES = {
  PIPEKEEPER: 'pipekeeper',
  WHISKEYKEEPER: 'whiskeykeeper',
  CIGARKEEPER: 'cigarkeeper', // future
};

// Modules currently available in the platform
export const ENABLED_MODULES = [MODULES.PIPEKEEPER, MODULES.WHISKEYKEEPER];

// Modules planned but not yet released
export const COMING_SOON_MODULES = [MODULES.CIGARKEEPER];

// Per-module pricing
export const MODULE_PRICE_ANNUAL = 29.99;
export const BUNDLE_PRICE_ANNUAL = 79.99;
export const BUNDLE_MODULE_THRESHOLD = 3; // bundle kicks in when this many modules exist

/**
 * Determines if a user has access to a specific module.
 *
 * Current policy: All paid users (Pro/Premium) have access to all enabled modules.
 * Future: individual module subscriptions will be checked here.
 *
 * @param {string} moduleName - One of MODULES.*
 * @param {object} user - Current user object
 * @param {object} subscription - Current subscription object
 * @returns {boolean}
 */
export function hasModuleAccess(moduleName, user, subscription) {
  // Admins always have full access
  if (user?.role === 'admin') return true;

  // Coming-soon modules are never accessible
  if (COMING_SOON_MODULES.includes(moduleName)) return false;

  // Non-enabled modules are not accessible
  if (!ENABLED_MODULES.includes(moduleName)) return false;

  // Check paid access via canonical entitlement resolver
  // Import lazily to avoid circular deps
  const entitlementTier = getEntitlementTierSync(user, subscription);
  return entitlementTier !== 'free';
}

/**
 * Inline sync tier resolver (avoids circular import with premiumAccess.js)
 */
function getEntitlementTierSync(user, subscription) {
  if (user?.role === 'admin') return 'pro';

  const normTier = (raw) => {
    const t = String(raw || '').trim().toLowerCase();
    if (t === 'pro' || t === 'premium' || t === 'paid') return 'pro';
    return 'free';
  };

  // User-level entitlement (most authoritative)
  const fromUser =
    user?.entitlement_tier ??
    user?.subscription_tier ??
    user?.plan;
  if (normTier(fromUser) !== 'free') return normTier(fromUser);

  // Subscription-level
  if (subscription?.status === 'active' || subscription?.status === 'trialing') {
    const fromSub = subscription?.tier ?? subscription?.plan;
    if (normTier(fromSub) !== 'free') return normTier(fromSub);
  }

  return 'free';
}

/**
 * Returns a module lock state object for UI rendering.
 */
export function getModuleLockState(moduleName, user, subscription) {
  const accessible = hasModuleAccess(moduleName, user, subscription);
  const isComingSoon = COMING_SOON_MODULES.includes(moduleName);

  return {
    isLocked: !accessible && !isComingSoon,
    isComingSoon,
    isAccessible: accessible,
    upgradeMessage: `Unlock ${getModuleDisplayName(moduleName)} — Subscribe for $${MODULE_PRICE_ANNUAL}/year`,
  };
}

export function getModuleDisplayName(moduleName) {
  const names = {
    [MODULES.PIPEKEEPER]: 'PipeKeeper',
    [MODULES.WHISKEYKEEPER]: 'WhiskeyKeeper',
    [MODULES.CIGARKEEPER]: 'CigarKeeper',
  };
  return names[moduleName] || moduleName;
}