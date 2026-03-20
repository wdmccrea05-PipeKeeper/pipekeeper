/**
 * CANONICAL ENTITLEMENT RESOLVER — SINGLE SOURCE OF TRUTH
 *
 * Only 2 tiers exist: "free" | "pro"
 * All legacy "premium" users are mapped to "pro" immediately.
 *
 * Contract:
 *   getEntitlementTier(user, subscription) → "free" | "pro"
 *   hasPro(user, subscription) → boolean
 *   isFree(user, subscription) → boolean
 *
 * Usage rules:
 *   - Import ONLY from this file for entitlement decisions
 *   - Do NOT import from resolveEntitlementTier or entitlements (both deleted)
 *   - Do NOT use "premium" anywhere in runtime logic
 */

import { subscriptionGrantsPaidAccess } from "./gracePeriod";

const normalizeTier = (raw) => {
  const t = String(raw || "").trim().toLowerCase();
  if (!t) return "free";
  // pro tier
  if (t === "pro") return "pro";
  // legacy "premium" always maps to pro
  if (t === "premium") return "pro";
  // other legacy synonyms → pro
  if (t === "paid" || t === "plus" || t === "subscriber" || t === "subscribed") return "pro";
  // bundle tiers (bundle_N) → pro
  if (t.startsWith("bundle_")) return "pro";
  return "free";
};

/**
 * Canonical tier resolver. Returns "free" or "pro" only.
 */
export function getEntitlementTier(user, subscription) {
  // Admin always pro
  const role = (user?.role || "").toLowerCase();
  if (role === "admin" || role === "owner" || user?.is_admin === true) return "pro";

  // 1. Server-written top-level field (preferred — set by webhook + syncSubscriptionForMe)
  const topLevel =
    user?.entitlement_tier ??
    user?.entitlementTier ??
    user?.entitlement ??
    user?.tier;

  const t1 = normalizeTier(topLevel);
  if (t1 !== "free") return t1;

  // 2. Nested data blob (written by ensureUserRecord — legacy)
  const dataTier =
    user?.data?.entitlement_tier ??
    user?.data?.subscription_tier;

  const t2 = normalizeTier(dataTier);
  if (t2 !== "free") return t2;

  // 3. Legacy subscription_tier / plan fields on user
  const legacyUser =
    user?.subscription_tier ??
    user?.subscriptionTier ??
    user?.subscriptionLevel ??
    user?.plan ??
    user?.plan_level;

  const t3 = normalizeTier(legacyUser);
  if (t3 !== "free") return t3;

  // 4. Subscription entity (with grace period)
  if (subscription && subscriptionGrantsPaidAccess(subscription)) {
    const fromSub =
      subscription?.tier ??
      subscription?.subscription_tier ??
      subscription?.plan;

    const t4 = normalizeTier(fromSub);
    // Even if sub tier field is empty, if subscriptionGrantsPaidAccess returned true → pro
    if (t4 !== "free") return t4;
    return "pro";
  }

  return "free";
}

/** True if user has Pro access. */
export function hasPaidAccess(user, subscription) {
  return getEntitlementTier(user, subscription) === "pro";
}

/** Alias for hasPaidAccess. */
export const hasPro = hasPaidAccess;

/** True if user has Pro access (same as hasPaidAccess — no premium tier exists). */
export function hasProAccess(user, subscription) {
  return getEntitlementTier(user, subscription) === "pro";
}

/** Alias kept for backward compat. Premium no longer exists; maps to pro. */
export function hasPremiumAccess(user, subscription) {
  return getEntitlementTier(user, subscription) === "pro";
}

/** True if user is free tier. */
export function isFree(user, subscription) {
  return getEntitlementTier(user, subscription) === "free";
}

/** Trial status — informational only. NEVER blocks paid access. */
export function isTrialingAccess(user, subscription) {
  const subStatus = String(subscription?.status || "").toLowerCase();
  if (subStatus === "trialing") return true;
  return !!user?.trial_active || !!user?.is_trialing || !!user?.trialing;
}

/** Human-readable plan label. */
export function getPlanLabel(user, subscription) {
  return getEntitlementTier(user, subscription) === "pro" ? "Pro" : "Free";
}

export function isFoundingMember(user = null) {
  return user?.isFoundingMember === true;
}

export const FOUNDING_MEMBER_CUTOFF = new Date("2026-02-01T00:00:00.000Z");

/** Legacy function — kept for backward compat but always returns false (no premium tier). */
export function isLegacyPremium() {
  return false;
}

/**
 * Build the canonical entitlements object used throughout the app.
 * This replaces the old buildEntitlements() from entitlements.js.
 */
export function buildCanonicalEntitlements(user, subscription) {
  const tier = getEntitlementTier(user, subscription);
  const isPro = tier === "pro";

  const limits = isPro
    ? { pipes: Infinity, tobaccos: Infinity, bottles: Infinity, photosPerItem: Infinity, smokingLogs: Infinity }
    : { pipes: 10, tobaccos: 10, bottles: 10, photosPerItem: 3, smokingLogs: 100 };

  /**
   * Feature availability — all features unlocked for Pro.
   * Free tier: no advanced features.
   */
  const canUse = (featureKey) => {
    if (isPro) return true;
    // Free tier gets these basic features
    const FREE_FEATURES = [
      "SMOKING_LOG",
      "CELLAR_LOG",
      "SHARE_CARDS",
    ];
    return FREE_FEATURES.includes(featureKey);
  };

  return {
    tier,
    hasPro: isPro,
    isFree: !isPro,
    paidModules: isPro ? ["pipekeeper", "whiskeykeeper"] : [],
    limits,
    canUse,
    // Legacy compat fields
    isLegacyPremium: false,
    isFreeGrandfathered: !!user?.isFreeGrandfathered,
    isOnTrial: isTrialingAccess(user, subscription),
  };
}