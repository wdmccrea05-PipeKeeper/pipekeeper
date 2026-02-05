/**
 * Canonical subscription provider resolution
 * SINGLE SOURCE OF TRUTH for determining provider (Stripe vs Apple)
 * 
 * Rules:
 * - Provider is derived from subscription data, NOT platform/UI state
 * - If both active subscriptions exist, Stripe wins (web canonical)
 * - Platform MUST NEVER imply provider
 * - Provider must be computed at runtime
 */

export function resolveSubscriptionProvider(subscription) {
  if (!subscription) return null;

  // CRITICAL: Check provider field from subscription entity
  const provider = (subscription?.provider || "").toLowerCase();
  
  // If subscription is active, use its declared provider
  if (subscription.status === "active" || subscription.status === "trialing") {
    if (provider === "stripe" || provider === "apple") {
      return provider;
    }
  }

  // For incomplete/past_due subscriptions, still return provider if set
  if (provider === "stripe" || provider === "apple") {
    return provider;
  }

  return null;
}

/**
 * Determine if subscription is managed by Stripe
 */
export function isStripeSubscription(subscription) {
  return resolveSubscriptionProvider(subscription) === "stripe";
}

/**
 * Determine if subscription is managed by Apple
 */
export function isAppleSubscription(subscription) {
  return resolveSubscriptionProvider(subscription) === "apple";
}

/**
 * Get provider display label
 */
export function getProviderLabel(subscription) {
  const provider = resolveSubscriptionProvider(subscription);
  if (provider === "stripe") return "Stripe";
  if (provider === "apple") return "Apple";
  return null;
}