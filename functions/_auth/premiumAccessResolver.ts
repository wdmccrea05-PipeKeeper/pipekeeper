/**
 * premiumAccessResolver.ts
 * 
 * Backend entitlement tier resolution - mirrors frontend logic.
 * Used by requireEntitlement for tier-specific checks.
 */

import { subscriptionGrantsPaidAccess } from "../_utils/gracePeriod.ts";

const LEGACY_PREMIUM_CUTOFF = "2026-02-01T00:00:00.000Z";

function normalizeTier(raw: any): string {
  const t = String(raw || "").trim().toLowerCase();
  if (!t) return "free";

  if (t === "pro") return "pro";
  if (t === "premium") return "pro"; // COLLAPSE: Premium → Pro

  // Explicit legacy synonyms only
  if (t === "paid" || t === "plus" || t === "subscriber" || t === "subscribed") return "pro";

  return "free";
}

export function getEntitlementTier(user: any, subscription: any): string {
  // Admin override
  const role = (user?.role || "").toLowerCase();
  if (role === "admin" || role === "owner" || user?.is_admin === true) {
    return "pro";
  }

  // 1) Server authoritative
  const fromUserEntitlement =
    user?.data?.entitlement_tier ??
    user?.entitlement_tier ??
    user?.entitlementTier ??
    user?.entitlement ??
    user?.tier;

  const t1 = normalizeTier(fromUserEntitlement);
  if (t1 !== "free") return t1;

  // 2) Legacy user fields
  const fromUserLegacy =
    user?.subscription_tier ??
    user?.subscriptionTier ??
    user?.subscriptionLevel ??
    user?.plan ??
    user?.plan_level;

  const t2 = normalizeTier(fromUserLegacy);
  if (t2 !== "free") return t2;

  // 3) Subscription entity (with grace period check)
  if (subscription && subscriptionGrantsPaidAccess(subscription)) {
    const fromSub =
      subscription?.tier ??
      subscription?.subscription_tier ??
      subscription?.plan ??
      subscription?.plan_level;

    const t3 = normalizeTier(fromSub);
    if (t3 !== "free") return t3;
  }

  return "free";
}

export function isLegacyPremium(subscription: any): boolean {
  if (!subscription) return false;
  
  const tier = (subscription.tier || "").toLowerCase();
  if (tier === "pro") return false;
  
  const startDate = subscription.subscriptionStartedAt || subscription.started_at;
  if (!startDate) return false;
  
  try {
    const cutoff = new Date(LEGACY_PREMIUM_CUTOFF);
    const start = new Date(startDate);
    return start < cutoff;
  } catch {
    return false;
  }
}