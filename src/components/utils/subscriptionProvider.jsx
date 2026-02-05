/**
 * Canonical subscription provider resolution
 * SINGLE SOURCE OF TRUTH for determining provider (Stripe vs Apple)
 * 
 * Rules:
 * - Provider is derived from subscription data, NOT platform/UI state
 * - NO DEFAULTS - return null if uncertain
 * - Stripe ALWAYS wins if present
 * - Apple ONLY if explicit provider field or originalTransactionId present
 * - Platform MUST NEVER imply provider
 */

export function resolveSubscriptionProvider(subscription) {
  if (!subscription) return null;

  // PRIORITY 1: Stripe always wins if present
  if (subscription.stripeCustomerId || subscription.stripe_customer_id) {
    return "stripe";
  }

  // PRIORITY 2: Explicit provider field (if apple)
  if (subscription.provider === "apple") {
    return "apple";
  }

  // PRIORITY 3: Apple originalTransactionId (legacy)
  if (subscription.appleOriginalTransactionId || subscription.provider_subscription_id) {
    // Only return apple if provider wasn't already stripe
    if (subscription.provider === "apple") {
      return "apple";
    }
  }

  // NO DEFAULTS - return null if uncertain
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