/**
 * gracePeriod.ts
 * 
 * Centralized grace period policy for failed payment handling (backend version).
 * Must stay in sync with components/utils/gracePeriod.jsx
 */

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

export function stripeKeyErrorResponse(e: any) {
  return {
    ok: false,
    error: "STRIPE_KEY_ERROR",
    message: String(e?.message || e || "Stripe key configuration error")
  };
}