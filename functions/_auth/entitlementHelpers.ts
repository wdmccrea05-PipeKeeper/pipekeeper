/**
 * entitlementHelpers.ts
 * 
 * Centralized entitlement logic for backend functions.
 * Includes grace period policy and tier resolution.
 */

// ============================================================================
// GRACE PERIOD POLICY
// ============================================================================

// Grace period for failed payments (both monthly and annual)
export const GRACE_PERIOD_DAYS = 5;

/**
 * Check if a subscription is currently in grace period after failed payment
 */
export function isSubscriptionInGracePeriod(subscription: any): boolean {
  if (!subscription) return false;
  
  const status = String(subscription?.status || "").toLowerCase();
  
  // Only past_due, incomplete, and unpaid statuses qualify for grace
  if (status !== "past_due" && status !== "incomplete" && status !== "unpaid") {
    return false;
  }
  
  // Check if current_period_end + grace days is still in the future
  const periodEnd = subscription?.current_period_end;
  if (!periodEnd) return false;
  
  try {
    const endDate = new Date(periodEnd);
    const graceEnd = new Date(endDate.getTime() + (GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000));
    return Date.now() <= graceEnd.getTime();
  } catch {
    return false;
  }
}

/**
 * Check if subscription grants paid access (including grace period)
 */
export function subscriptionGrantsPaidAccess(subscription: any): boolean {
  if (!subscription) return false;
  
  const status = String(subscription?.status || "").toLowerCase();
  
  // Active and trial statuses always grant access
  if (status === "active" || status === "trialing" || status === "trial") {
    return true;
  }
  
  // Failed payment statuses: check grace period
  if (status === "past_due" || status === "incomplete" || status === "unpaid") {
    return isSubscriptionInGracePeriod(subscription);
  }
  
  return false;
}

/**
 * Get grace status information for logging/debugging
 */
export function getGraceStatus(subscription: any): {
  inGrace: boolean;
  daysRemaining: number;
  gracePeriodExpired: boolean;
} {
  if (!subscription) {
    return { inGrace: false, daysRemaining: 0, gracePeriodExpired: false };
  }
  
  const status = String(subscription?.status || "").toLowerCase();
  const isFailedPayment = status === "past_due" || status === "incomplete" || status === "unpaid";
  
  if (!isFailedPayment) {
    return { inGrace: false, daysRemaining: 0, gracePeriodExpired: false };
  }
  
  const periodEnd = subscription?.current_period_end;
  if (!periodEnd) {
    return { inGrace: false, daysRemaining: 0, gracePeriodExpired: true };
  }
  
  try {
    const endDate = new Date(periodEnd);
    const graceEnd = new Date(endDate.getTime() + (GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000));
    const now = Date.now();
    
    if (now > graceEnd.getTime()) {
      return { inGrace: false, daysRemaining: 0, gracePeriodExpired: true };
    }
    
    const msRemaining = graceEnd.getTime() - now;
    const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
    
    return { inGrace: true, daysRemaining, gracePeriodExpired: false };
  } catch {
    return { inGrace: false, daysRemaining: 0, gracePeriodExpired: true };
  }
}

// ============================================================================
// TIER RESOLUTION
// ============================================================================

const LEGACY_PREMIUM_CUTOFF = "2026-02-01T00:00:00.000Z";

function normalizeTier(raw: any): string {
  const t = String(raw || "").trim().toLowerCase();
  if (!t) return "free";

  if (t === "pro") return "pro";
  if (t === "premium") return "premium";

  // Explicit legacy synonyms only
  if (t === "paid" || t === "plus" || t === "subscriber" || t === "subscribed") return "premium";

  return "free";
}

export function getEntitlementTier(user: any, subscription: any): string {
  // Admin override
  const role = (user?.role || "").toLowerCase();
  if (role === "admin" || role === "owner" || user?.is_admin === true) {
    return "pro";
  }

  // 1) Server authoritative
  const fromUserEntitlement =
    user?.data?.entitlement_tier ??
    user?.entitlement_tier ??
    user?.entitlementTier ??
    user?.entitlement ??
    user?.tier;

  const t1 = normalizeTier(fromUserEntitlement);
  if (t1 !== "free") return t1;

  // 2) Legacy user fields
  const fromUserLegacy =
    user?.subscription_tier ??
    user?.subscriptionTier ??
    user?.subscriptionLevel ??
    user?.plan ??
    user?.plan_level;

  const t2 = normalizeTier(fromUserLegacy);
  if (t2 !== "free") return t2;

  // 3) Subscription entity (with grace period check)
  if (subscription && subscriptionGrantsPaidAccess(subscription)) {
    const fromSub =
      subscription?.tier ??
      subscription?.subscription_tier ??
      subscription?.plan ??
      subscription?.plan_level;

    const t3 = normalizeTier(fromSub);
    if (t3 !== "free") return t3;
  }

  return "free";
}

export function isLegacyPremium(subscription: any): boolean {
  if (!subscription) return false;
  
  const tier = (subscription.tier || "").toLowerCase();
  if (tier === "pro") return false;
  
  const startDate = subscription.subscriptionStartedAt || subscription.started_at;
  if (!startDate) return false;
  
  try {
    const cutoff = new Date(LEGACY_PREMIUM_CUTOFF);
    const start = new Date(startDate);
    return start < cutoff;
  } catch {
    return false;
  }
}