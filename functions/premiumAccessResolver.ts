/**
 * Canonical entitlement resolution functions
 * Shared between frontend and backend (Deno-compatible)
 */

/**
 * Normalizes a tier string to one of: "free", "premium", "pro"
 */
export function normalizeTier(tier) {
  if (!tier) return "free";
  const lower = String(tier).toLowerCase().trim();
  if (lower === "pro") return "pro";
  if (lower === "premium") return "premium";
  return "free";
}

/**
 * Returns the user's entitlement tier by checking multiple sources
 * Priority: user.tier > user.entitlementTier > user.subscriptionTier > subscription.tier
 */
export function getEntitlementTier(user, subscription) {
  // Admin override - admins get pro tier
  if (user?.role === "admin") return "pro";

  // Check user object first (server-authoritative)
  if (user?.tier) return normalizeTier(user.tier);
  if (user?.entitlementTier) return normalizeTier(user.entitlementTier);
  if (user?.subscriptionTier) return normalizeTier(user.subscriptionTier);

  // Fallback to subscription entity
  if (subscription?.tier) return normalizeTier(subscription.tier);

  return "free";
}

/**
 * Checks if user has any paid access (premium or pro)
 */
export function hasPaidAccess(user, subscription) {
  const tier = getEntitlementTier(user, subscription);
  return tier === "premium" || tier === "pro";
}

/**
 * Checks if user has premium access (includes pro)
 */
export function hasPremiumAccess(user, subscription) {
  return hasPaidAccess(user, subscription);
}

/**
 * Checks if user has pro access specifically
 */
export function hasProAccess(user, subscription) {
  const tier = getEntitlementTier(user, subscription);
  return tier === "pro";
}

/**
 * Checks if user/subscription is currently in trial period
 */
export function isTrialingAccess(user, subscription) {
  // Check subscription status first
  if (subscription?.status === "trial" || subscription?.status === "trialing") {
    return true;
  }

  // Check if trial_end_date exists and is in the future
  if (subscription?.trial_end_date) {
    const trialEnd = new Date(subscription.trial_end_date);
    return trialEnd > new Date();
  }

  return false;
}

/**
 * Returns a human-readable plan label
 */
export function getPlanLabel(user, subscription) {
  const tier = getEntitlementTier(user, subscription);
  if (tier === "pro") return "Pro";
  if (tier === "premium") return "Premium";
  return "Free";
}

/**
 * Checks if user is a founding member (subscribed before Feb 1, 2026)
 */
export function isFoundingMember(user) {
  return !!user?.isFoundingMember;
}

/**
 * Checks if subscription is legacy premium (premium tier before Feb 1, 2026)
 */
export function isLegacyPremium(subscription) {
  if (!subscription) return false;
  
  const tier = normalizeTier(subscription.tier);
  if (tier !== "premium") return false;

  const cutoff = new Date("2026-02-01T00:00:00.000Z");
  const startedAt = subscription.subscriptionStartedAt || subscription.started_at || subscription.current_period_start;
  
  if (!startedAt) return false;
  
  const subscriptionDate = new Date(startedAt);
  return subscriptionDate < cutoff;
}