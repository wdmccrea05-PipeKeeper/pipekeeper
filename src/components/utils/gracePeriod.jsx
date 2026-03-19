/**
 * gracePeriod.jsx
 * 
 * Centralized grace period policy for failed payment handling.
 * All entitlement checks must use these helpers to ensure consistent behavior.
 */

// Grace period for failed payments (both monthly and annual)
export const GRACE_PERIOD_DAYS = 5;

/**
 * Check if a subscription is currently in grace period after failed payment
 * @param {Object} subscription - Subscription entity
 * @returns {boolean} - True if in grace period
 */
export function isSubscriptionInGracePeriod(subscription) {
  if (!subscription) return false;
  
  const status = String(subscription?.status || "").toLowerCase();
  
  // Only past_due and incomplete statuses qualify for grace
  if (status !== "past_due" && status !== "incomplete" && status !== "unpaid") {
    return false;
  }
  
  // Check if current_period_end + grace days is still in the future
  const periodEnd = subscription?.current_period_end;
  if (!periodEnd) return false;
  
  try {
    const endDate = new Date(periodEnd);
    // Validate date parsed correctly
    if (Number.isNaN(endDate.getTime())) {
      console.warn('[gracePeriod] invalid current_period_end date:', periodEnd);
      return false;
    }
    const graceEnd = new Date(endDate.getTime() + (GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000));
    return Date.now() <= graceEnd.getTime();
  } catch (e) {
    console.warn('[gracePeriod] date calculation failed:', e?.message);
    return false;
  }
}

/**
 * Check if subscription grants paid access (including grace period)
 * @param {Object} subscription - Subscription entity
 * @returns {boolean} - True if paid access should be granted
 */
export function subscriptionGrantsPaidAccess(subscription) {
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
 * Get grace status information for UI display
 * @param {Object} subscription - Subscription entity
 * @returns {Object} - { inGrace, daysRemaining, gracePeriodExpired }
 */
export function getGraceStatus(subscription) {
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
    if (Number.isNaN(endDate.getTime())) {
      console.warn('[gracePeriod] invalid current_period_end date:', periodEnd);
      return { inGrace: false, daysRemaining: 0, gracePeriodExpired: true };
    }
    const graceEnd = new Date(endDate.getTime() + (GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000));
    const now = Date.now();
    
    if (now > graceEnd.getTime()) {
      return { inGrace: false, daysRemaining: 0, gracePeriodExpired: true };
    }
    
    const msRemaining = graceEnd.getTime() - now;
    const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
    
    return { inGrace: true, daysRemaining, gracePeriodExpired: false };
  } catch (e) {
    console.warn('[gracePeriod] date calculation failed:', e?.message);
    return { inGrace: false, daysRemaining: 0, gracePeriodExpired: true };
  }
}

/**
 * Get user-friendly status message for subscription
 * @param {Object} subscription - Subscription entity
 * @param {Function} t - Translation function
 * @returns {string} - Status message
 */
export function getSubscriptionStatusMessage(subscription, t) {
  if (!subscription) return t("subscription.noSubscription", "No active subscription");
  
  const status = String(subscription?.status || "").toLowerCase();
  
  // Active states
  if (status === "active") return t("subscription.active", "Active");
  if (status === "trialing" || status === "trial") return t("subscription.trial", "Trial Active");
  
  // Failed payment with grace
  const grace = getGraceStatus(subscription);
  if (grace.inGrace) {
    return t("subscription.gracePeriod", `Payment overdue — ${grace.daysRemaining} day${grace.daysRemaining > 1 ? 's' : ''} remaining`);
  }
  
  // Grace expired
  if (grace.gracePeriodExpired) {
    return t("subscription.suspended", "Paid access suspended");
  }
  
  // Canceled
  if (status === "canceled" || status === "cancelled") {
    return t("subscription.canceled", "Canceled");
  }
  
  // Default
  return status.charAt(0).toUpperCase() + status.slice(1);
}