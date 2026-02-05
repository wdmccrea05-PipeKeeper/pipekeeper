/**
 * Subscription field normalizer
 * Single source of truth for determining provider from UserProfile fields
 * 
 * Rules:
 * - stripe_customer_id ALWAYS wins over apple fields
 * - apple_original_transaction_id is fallback
 * - provider is derived, never stored as freeform field
 */

export function normalizeSubscriptionFields(profile) {
  if (!profile) return { provider: null, stripe_customer_id: null, apple_original_transaction_id: null };

  const stripeId = profile?.stripe_customer_id || profile?.stripeCustomerId || null;
  const appleOt = profile?.apple_original_transaction_id || profile?.appleOriginalTransactionId || null;

  // Stripe ALWAYS wins if present
  const provider = stripeId ? "stripe" : appleOt ? "apple" : null;

  return {
    provider,
    stripe_customer_id: stripeId,
    apple_original_transaction_id: appleOt,
  };
}

/**
 * Validate subscription fields before writing
 * Returns error message if invalid, null if ok
 */
export function validateSubscriptionFields(source, fields) {
  if (source === "stripe" && !fields.stripe_customer_id) {
    return "Stripe sync requires stripe_customer_id";
  }
  if (source === "apple" && !fields.apple_original_transaction_id) {
    return "Apple sync requires apple_original_transaction_id";
  }
  return null;
}