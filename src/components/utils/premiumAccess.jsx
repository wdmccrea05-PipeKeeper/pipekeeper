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
 */
export function getEntitlementTier(user, subscription) {
  const role = String(user?.role || "").toLowerCase();
  if (role === "admin" || role === "owner" || user?.is_admin === true) return "pro";

  const topLevel =
    user?.entitlement_tier ??
    user?.entitlementTier ??
    user?.entitlement ??
    user?.tier;

  const t1 = normalizeTier(topLevel);
  if (t1 !== "free") return t1;

  const dataTier = user?.data?.entitlement_tier ?? user?.data?.subscription_tier;
  const t2 = normalizeTier(dataTier);
  if (t2 !== "free") return t2;

  const legacyUser =
    user?.subscription_tier ??
    user?.subscriptionTier ??
    user?.subscriptionLevel ??
    user?.plan ??
    user?.plan_level;

  const t3 = normalizeTier(legacyUser);
  if (t3 !== "free") return t3;

  if (subscription && subscriptionGrantsPaidAccess(subscription)) {
    const fromSub = subscription?.tier ?? subscription?.subscription_tier ?? subscription?.plan;
    const t4 = normalizeTier(fromSub);
    return t4 !== "free" ? t4 : "pro";
  }

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
    paidModules: isPro ? ["pipekeeper", "whiskeykeeper", "cigarkeeper", "winekeeper"].filter(isModuleLaunched) : [],
    limits,
    canUse,
    isLegacyPremium: subscription ? isLegacyPremium(subscription) : false,
    isFreeGrandfathered: Boolean(user?.isFreeGrandfathered),
    isOnTrial: isTrialingAccess(user, subscription),
  };
}