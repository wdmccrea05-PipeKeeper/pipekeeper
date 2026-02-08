// CANONICAL TIER DERIVATION - SINGLE SOURCE OF TRUTH
// Used everywhere. No other tier logic exists.
// Normalized values: "free" | "premium" | "pro"

export function getEffectiveTier(user, entitlementData) {
  // HARD GUARD: Never downgrade paid users
  // If entitlement API returns "free" but user has paid tier elsewhere, preserve it
  
  // PRIORITY 1: Check user metadata first for protection
  if (user?.user_metadata?.tier) {
    const metaTier = String(user.user_metadata.tier).trim().toLowerCase();
    if (metaTier === "pro" || metaTier === "premium") {
      // User is marked paid in metadata - trust it
      return metaTier;
    }
  }
  
  // PRIORITY 2: Check subscription for protection
  if (user?.subscription) {
    const subTier = String(user.subscription.tier || "").trim().toLowerCase();
    if (subTier === "pro" || subTier === "premium") {
      // User has active subscription - trust it
      return subTier;
    }
  }

  // PRIORITY 3: entitlement API response (only if it says paid)
  if (entitlementData) {
    const tier = String(entitlementData.tier || entitlementData.entitlement_tier || "").trim().toLowerCase();
    if (tier === "pro" || tier === "premium") return tier;
    // If API says "free" but other sources say paid, fall through to those sources
  }

  // PRIORITY 4: user.entitlement_tier field
  if (user?.entitlement_tier) {
    const tier = String(user.entitlement_tier).trim().toLowerCase();
    if (tier === "pro" || tier === "premium") return tier;
  }

  // DEFAULT: free (only if all sources agree or are missing)
  return "free";
}

// Quick checks
export function isPremiumOrPro(tier) {
  return tier === "premium" || tier === "pro";
}

export function isProTier(tier) {
  return tier === "pro";
}

export function isPremiumTier(tier) {
  return tier === "premium";
}

export function isFreeTier(tier) {
  return tier === "free";
}