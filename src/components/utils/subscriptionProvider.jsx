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

  // PRIORITY 1: Explicit provider field (most reliable)
  const provider = (subscription?.provider || "").toLowerCase();
  if (provider === "stripe" || provider === "apple") {
    return provider;
  }

  // PRIORITY 2: Fallback to stripe_customer_id
  if (subscription.stripe_customer_id) {
    return "stripe";
  }

  // PRIORITY 3: Fallback to apple originalTransactionId
  if (subscription.provider_subscription_id && subscription.provider === "apple") {
    return "apple";
  }

  // No provider resolved
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