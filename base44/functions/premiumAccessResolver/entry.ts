/**
 * Canonical entitlement resolution functions
 * Shared between frontend and backend (Deno-compatible)
 */

/**
 * Normalizes a tier string to one of: "free", "pro"
 * "premium" is collapsed to "pro" to match the canonical free/pro model.
 */
export function normalizeTier(tier) {
  if (!tier) return "free";
  const lower = String(tier).toLowerCase().trim();
  if (lower === "pro") return "pro";
  if (lower === "premium") return "pro"; // Canonical: premium collapses to pro
  if (["paid", "plus", "subscriber", "subscribed"].includes(lower)) return "pro";
  return "free";
}

/**
 * Returns the user's entitlement tier by checking multiple sources
 * Priority: user.tier > user.entitlement_tier > user.entitlementTier > user.subscription_tier > user.subscriptionTier > subscription.tier
 * FIX BUG-07: Also check snake_case variants to match all write paths
 */
export function getEntitlementTier(user, subscription) {
  // Admin override - admins get pro tier
  if (user?.role === "admin") return "pro";

  // Check user object first (server-authoritative)
  // Canonical top-level field takes priority; nested data blob is a fallback
  // for users whose entitlement was written by older paths that only updated data.*
  if (user?.tier) return normalizeTier(user.tier);
  // FIX BUG-07: Check snake_case fields (written by all server-side paths)
  if (user?.entitlement_tier) return normalizeTier(user.entitlement_tier);
  if (user?.entitlementTier) return normalizeTier(user.entitlementTier);
  // FIX: Also check nested data blob (fallback for users whose data was written
  // before top-level entitlement_tier writes were added to all code paths)
  if (user?.data?.entitlement_tier) return normalizeTier(user.data.entitlement_tier);
  if (user?.subscription_tier) return normalizeTier(user.subscription_tier);
  if (user?.subscriptionTier) return normalizeTier(user.subscriptionTier);

  // Fallback to subscription entity
  if (subscription) {
    const periodEnd = subscription.current_period_end;
    const isNotExpired = !periodEnd || new Date(periodEnd).getTime() > Date.now();

    if (isNotExpired && subscription.tier) {
      return normalizeTier(subscription.tier);
    }
  }

  return "free";
}

/**
 * Checks if user has any paid access (premium or pro)
 */
export function hasPaidAccess(user, subscription) {
  const tier = getEntitlementTier(user, subscription);
  return tier === "pro";
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
  // Check user fields first (mirrors frontend logic)
  if (user?.trial_active || user?.is_trialing || user?.trialing || user?.trial) {
    return true;
  }

  // Check subscription status
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