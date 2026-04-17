/**
 * CANONICAL ENTITLEMENT RESOLVER — SINGLE SOURCE OF TRUTH
 *
 * Runtime billing surface is Free / Pro, but this file preserves enough
 * backwards compatibility to safely interpret legacy premium data while the
 * rest of the app is being simplified.
 */

import { subscriptionGrantsPaidAccess } from "./gracePeriod";
import { isModuleLaunched } from "./moduleReleaseState";

export const FOUNDING_MEMBER_CUTOFF = new Date("2026-02-01T00:00:00.000Z");
export const PRO_LAUNCH_CUTOFF_ISO = "2026-02-01T00:00:00.000Z";

const LEGACY_PREMIUM_CUTOFF = FOUNDING_MEMBER_CUTOFF;
const CANONICAL_MODULES = ["pipekeeper", "whiskeykeeper", "cigarkeeper", "winekeeper"];

const normalizeTier = (raw) => {
  const t = String(raw || "").trim().toLowerCase();
  if (!t) return "free";
  if (t === "pro") return "pro";
  if (t === "premium") return "pro";
  if (["paid", "plus", "subscriber", "subscribed"].includes(t)) return "pro";
  if (t.startsWith("bundle_")) return "pro";
  return "free";
};

function getSubscriptionStartDate(subscription) {
  const raw =
    subscription?.subscriptionStartedAt ??
    subscription?.started_at ??
    subscription?.start_date ??
    subscription?.created_at ??
    subscription?.createdAt ??
    null;

  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Canonical tier resolver. Returns "free" or "pro" only.
 *
 * Priority order (FIX RULE #1):
 *   1. Admin role — always pro
 *   2. Active subscription record — if subscriptionGrantsPaidAccess(subscription) is true,
 *      the user is paid regardless of any stale cached flags on the User entity.
 *   3. User entity entitlement fields (set by webhook / syncSubscriptionForMe)
 *   4. Legacy user fields (subscription_tier, plan, etc.)
 *   5. Fallback free tier
 *
 * Placing the live subscription check at priority #2 ensures that a valid active
 * subscription is never overridden by stale user-level cache, which was the root
 * cause of paid users being blocked by free-tier limits.
 */
export function getEntitlementTier(user, subscription) {
  const role = String(user?.role || "").toLowerCase();
  if (role === "admin" || role === "owner" || user?.is_admin === true) return "pro";

  // FIX RULE #1: Active subscription record is the highest-priority source of truth.
  // If the subscription is active/trialing/grace-period, the user is paid — full stop.
  // This prevents stale cached user fields from ever blocking a paid subscriber.
  if (subscription && subscriptionGrantsPaidAccess(subscription)) {
    return "pro";
  }

  // No live active subscription — fall back to synced user entity fields.
  const topLevel =
    user?.entitlement_tier ??
    user?.entitlementTier ??
    user?.entitlement ??
    user?.tier;

  const t1 = normalizeTier(topLevel);
  const hasExplicitEntitlementField =
    user?.entitlement_tier != null ||
    user?.entitlementTier != null ||
    user?.entitlement != null ||
    user?.tier != null;
  if (hasExplicitEntitlementField && t1 === "free") return "free";
  if (t1 !== "free") return t1;

  const dataTier = user?.data?.entitlement_tier ?? user?.data?.subscription_tier;
  const t2 = normalizeTier(dataTier);
  const hasExplicitDataEntitlementField =
    user?.data?.entitlement_tier != null ||
    user?.data?.subscription_tier != null;
  if (hasExplicitDataEntitlementField && t2 === "free") return "free";
  if (t2 !== "free") return t2;

  const legacyUser =
    user?.subscription_tier ??
    user?.subscriptionTier ??
    user?.subscriptionLevel ??
    user?.plan ??
    user?.plan_level;

  const t3 = normalizeTier(legacyUser);
  if (t3 !== "free") return t3;

  return "free";
}

export function hasPaidAccess(user, subscription) {
  return getEntitlementTier(user, subscription) === "pro";
}

export const hasPro = hasPaidAccess;

export function hasProAccess(user, subscription) {
  return getEntitlementTier(user, subscription) === "pro";
}

export function hasPremiumAccess(user, subscription) {
  return getEntitlementTier(user, subscription) === "pro";
}

export function isFree(user, subscription) {
  return getEntitlementTier(user, subscription) === "free";
}

export function isTrialingAccess(user, subscription) {
  const subStatus = String(subscription?.status || "").toLowerCase();
  if (subStatus === "trialing" || subStatus === "trial") return true;
  return Boolean(
    user?.isOnTrial ??
    user?.trial_active ??
    user?.is_trialing ??
    user?.trialing
  );
}

export function getPlanLabel(user, subscription) {
  return getEntitlementTier(user, subscription) === "pro" ? "Pro" : "Free";
}

export function isFoundingMember(user = null) {
  return user?.isFoundingMember === true;
}

/**
 * Legacy compatibility helper used by migration and entitlement shims.
 * A premium subscription created before the Pro launch cutoff keeps the
 * broader legacy premium capability set.
 */
export function isLegacyPremium(subscription) {
  if (!subscription) return false;
  const tier = String(subscription?.tier || subscription?.subscription_tier || subscription?.plan || "").toLowerCase();
  if (tier !== "premium") return false;

  const startedAt = getSubscriptionStartDate(subscription);
  if (!startedAt) return false;

  return startedAt.getTime() < LEGACY_PREMIUM_CUTOFF.getTime();
}

/**
 * Canonical runtime entitlements. Free / Pro only.
 */
export function buildCanonicalEntitlements(user, subscription) {
  const tier = getEntitlementTier(user, subscription);
  const isPro = tier === "pro";
  const csvModules = String(user?.paid_modules_csv || "")
    .split(",")
    .map((m) => m.trim().toLowerCase())
    .filter((m) => m && CANONICAL_MODULES.includes(m) && isModuleLaunched(m));
  const flaggedModules = CANONICAL_MODULES.filter(
    (moduleKey) => Boolean(user?.[`${moduleKey}_paid`]) && isModuleLaunched(moduleKey)
  );
  const explicitModules = [...new Set([...csvModules, ...flaggedModules])];
  const isLegacyBroadAccessUser =
    Boolean(user?.isFoundingMember) ||
    Boolean(user?.legacy_broad_module_access) ||
    isLegacyPremium(subscription);

  const limits = isPro
    ? { pipes: Infinity, tobaccos: Infinity, bottles: Infinity, photosPerItem: Infinity, smokingLogs: Infinity }
    : { pipes: 5, tobaccos: 10, bottles: 10, photosPerItem: 3, smokingLogs: 100 };

  const canUse = (featureKey) => {
    if (isPro) return true;
    return false;
  };

  return {
    tier,
    hasPro: isPro,
    isFree: !isPro,
    paidModules: isPro
      ? (() => {
          if (explicitModules.length > 0) {
            return explicitModules;
          }
          if (isLegacyBroadAccessUser) {
            return CANONICAL_MODULES.filter(isModuleLaunched);
          }
          return [];
        })()
      : [],
    limits,
    canUse,
    isLegacyPremium: subscription ? isLegacyPremium(subscription) : false,
    isFreeGrandfathered: Boolean(user?.isFreeGrandfathered),
    isOnTrial: isTrialingAccess(user, subscription),
  };
}
