/**
 * Canonical provider resolution from UserProfile
 * AUTHORITATIVE SOURCE: UserProfile stripe_customer_id and apple_original_transaction_id
 * 
 * Rules:
 * - stripe_customer_id ALWAYS means "stripe"
 * - apple_original_transaction_id ALWAYS means "apple"
 * - If neither exists → provider is null (NEVER default to Apple)
 * - NO inference from platform, subscription status, or tier
 */

export function resolveProviderFromProfile(profile) {
  if (!profile) return null;

  // STRIPE ALWAYS WINS if customer exists
  if (profile.stripe_customer_id || profile.stripeCustomerId) {
    return "stripe";
  }

  // Apple ONLY if original transaction exists
  if (profile.apple_original_transaction_id || profile.appleOriginalTransactionId) {
    return "apple";
  }

  // NO DEFAULTS - return null
  return null;
}

// Legacy alias for backwards compatibility
export function resolveSubscriptionProvider(subscription) {
  if (!subscription) return null;
  if (subscription.stripe_customer_id || subscription.stripeCustomerId) return "stripe";
  if (subscription.provider === "apple" && (subscription.appleOriginalTransactionId || subscription.provider_subscription_id)) return "apple";
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