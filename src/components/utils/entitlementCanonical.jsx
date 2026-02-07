/**
 * CANONICAL ENTITLEMENT LOGIC - ONLY SOURCE OF TRUTH
 * 
 * This is the ONLY place Pro access is evaluated.
 * All other functions must route through this.
 * 
 * Rules:
 * - Read ONLY from user.entitlement_tier
 * - No Stripe queries
 * - No subscription lookups
 * - No caching
 * - No inference
 */

export function getEffectiveEntitlement(user) {
  if (!user) return "free";

  const tier = (user.entitlement_tier || "").toLowerCase().trim();

  if (tier === "pro") return "pro";
  if (tier === "premium") return "premium";
  return "free";
}

export function hasProAccess(user) {
  if (!user) return false;

  // Admin override
  const role = (user.role || "").toLowerCase();
  if (role === "admin" || role === "owner" || user.is_admin === true) {
    return true;
  }

  return getEffectiveEntitlement(user) === "pro";
}

export function hasPremiumAccess(user) {
  if (!user?.email) return false;

  const tier = getEffectiveEntitlement(user);
  return tier === "pro" || tier === "premium";
}