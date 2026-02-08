// CANONICAL TIER DERIVATION - SINGLE SOURCE OF TRUTH
// Used everywhere. No other tier logic exists.
// Normalized values: "free" | "premium" | "pro"

export function getEffectiveTier(user, entitlementData) {
  // PRIORITY 1: entitlement API response (most recent + authoritative)
  if (entitlementData) {
    const tier = String(entitlementData.tier || entitlementData.entitlement_tier || "").trim().toLowerCase();
    if (tier === "pro" || tier === "premium") return tier;
  }

  // PRIORITY 2: user.user_metadata.tier (persisted from entitlement)
  if (user?.user_metadata?.tier) {
    const tier = String(user.user_metadata.tier).trim().toLowerCase();
    if (tier === "pro" || tier === "premium") return tier;
  }

  // PRIORITY 3: Subscription entity (from Base44 database)
  if (user?.subscription) {
    const tier = String(user.subscription.tier || "").trim().toLowerCase();
    if (tier === "pro" || tier === "premium") return tier;
  }

  // PRIORITY 4: user.entitlement_tier field
  if (user?.entitlement_tier) {
    const tier = String(user.entitlement_tier).trim().toLowerCase();
    if (tier === "pro" || tier === "premium") return tier;
  }

  // DEFAULT: free
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