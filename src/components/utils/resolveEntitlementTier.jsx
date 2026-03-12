/**
 * CANONICAL TIER RESOLVER
 * 
 * Single source of truth for entitlement tier resolution.
 * Ensures Premium subscriptions automatically resolve as Pro.
 */

export function resolveEntitlementTier(user, subscription) {
  // Get tier from subscription first, then fallback to user object
  const tier =
    subscription?.tier ||
    user?.subscription_tier ||
    user?.entitlement_tier ||
    "free";

  // Collapse Premium into Pro
  if (tier === "premium") {
    return "pro";
  }

  return tier;
}

/**
 * Check if user has Pro-level access (includes collapsed Premium).
 */
export function hasProAccess(user, subscription) {
  const tier = resolveEntitlementTier(user, subscription);
  return tier === "pro";
}

/**
 * Check if user is Free tier.
 */
export function isFreeUser(user, subscription) {
  const tier = resolveEntitlementTier(user, subscription);
  return tier === "free";
}