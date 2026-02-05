/**
 * Provider resolution from User.subscription_provider field
 * AUTHORITATIVE SOURCE: User.subscription_provider (set via Stripe webhooks or Apple validation)
 * 
 * CRITICAL RULES:
 * - Never infer provider from platform, subscription status, tier, or customer_id
 * - subscription_provider is AUTHORITATIVE and NEVER defaults
 * - Fallback to null if not explicitly set
 */

export function resolveProviderFromUser(user) {
  if (!user) return null;
  return user.subscription_provider || null;
}

// Subscription-level provider resolution (for compatibility)
export function resolveSubscriptionProvider(subscription) {
  if (!subscription) return null;
  return subscription.provider || null;
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