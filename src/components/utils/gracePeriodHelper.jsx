/**
 * GRACE PERIOD HELPER
 * 
 * Shared logic for grace period calculations across subscription handling.
 */

export function isWithinGracePeriod(subscription) {
  if (!subscription?.current_period_end) {
    return false;
  }

  const GRACE_DAYS = 5;
  const expiry = new Date(subscription.current_period_end);
  expiry.setDate(expiry.getDate() + GRACE_DAYS);

  return new Date() < expiry;
}

export function isTrialActive(subscription) {
  if (subscription?.status !== "trialing") {
    return false;
  }

  if (!subscription?.trial_end_date) {
    return false;
  }

  const trialEnd = new Date(subscription.trial_end_date);
  return new Date() < trialEnd;
}

export function getSubscriptionStatus(subscription) {
  if (!subscription) {
    return "inactive";
  }

  if (isTrialActive(subscription)) {
    return "trialing";
  }

  if (subscription.status === "active" || subscription.status === "trialing") {
    return "active";
  }

  if (isWithinGracePeriod(subscription)) {
    return "grace_period";
  }

  return "inactive";
}