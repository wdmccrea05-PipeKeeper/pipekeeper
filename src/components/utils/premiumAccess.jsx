// src/components/utils/premiumAccess.jsx

/**
 * CANONICAL ENTITLEMENT RESOLVER
 * Single source of truth for Premium/Pro access across the app.
 *
 * Why: Paid users can be marked paid via multiple sources:
 * - user.entitlement_tier (preferred, server-authoritative)
 * - user.subscription_tier / subscription_level (legacy)
 * - Subscription entity tier (Stripe/Apple/manual)
 *
 * We must NEVER block paid access just because Subscription entity fetch fails
 * or because a component used an old variable name.
 * 
 * Grace Period Policy:
 * Failed payments (past_due, incomplete, unpaid) receive a 5-day grace period
 * after current_period_end before paid access is suspended.
 */

import { subscriptionGrantsPaidAccess } from "./gracePeriod";

// FIX ISSUE-21: Replace overly broad substring matching with exact matching plus an explicit
// allowlist of known synonyms to prevent arbitrary strings from being promoted to paid tiers.
const normalizeTier = (raw) => {
  const t = String(raw || "").trim().toLowerCase();
  if (!t) return "free";

  if (t === "pro") return "pro";
  if (t === "premium") return "premium"; // Preserve semantic distinction

  // Explicit legacy synonyms only — no substring matching
  if (t === "paid" || t === "plus" || t === "subscriber" || t === "subscribed") return "pro";

  return "free";
};

export function getEntitlementTier(user, subscription) {
  // Admin override - admins get Pro tier
  const role = (user?.role || "").toLowerCase();
  if (role === "admin" || role === "owner" || user?.is_admin === true) {
    return "pro";
  }

  // 1) Server authoritative / canonical (most important)
  // Check BOTH top-level and nested data blob — server writes to data blob first
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

  // 3) Subscription entity / provider-derived
  if (subscription) {
    // Use grace period helper to determine if subscription grants access
    const grantsAccess = subscriptionGrantsPaidAccess(subscription);
    
    if (grantsAccess) {
      const fromSub =
        subscription?.tier ??
        subscription?.subscription_tier ??
        subscription?.plan ??
        subscription?.plan_level;

      const t3 = normalizeTier(fromSub);
      if (t3 !== "free") return t3;
    }
  }

  return "free";
}

export function hasPaidAccess(user, subscription) {
  const tier = getEntitlementTier(user, subscription);
  return tier === "pro" || tier === "premium"; // Both tiers grant paid access
}

export function hasPremiumAccess(user, subscription) {
  const tier = getEntitlementTier(user, subscription);
  return tier === "premium" || tier === "pro";
}

export function hasProAccess(user, subscription) {
  const tier = getEntitlementTier(user, subscription);
  return tier === "pro" || tier === "premium";
}

// Trial should NEVER be required to grant paid access.
// Trial is informational and can be used for UX prompts only.
// FIX: Validate trial end date — if trial is past, do not treat as active trial
export function isTrialingAccess(user, subscription) {
  const userTrial =
    !!user?.trial_active ||
    !!user?.is_trialing ||
    !!user?.trialing ||
    !!user?.trial;

  const subStatus = String(subscription?.status || "").toLowerCase();
  let subTrial = subStatus === "trialing" || !!subscription?.is_trialing;
  
  // FIX: Validate subscription trial hasn't expired and dates are consistent
  if (subTrial && subscription?.trial_end) {
    try {
      const trialEnd = new Date(subscription.trial_end);
      // Validate trial_end is a valid date
      if (Number.isNaN(trialEnd.getTime())) {
        console.warn('[premiumAccess] invalid trial_end date:', subscription.trial_end);
        subTrial = false;
      } else if (Date.now() > trialEnd.getTime()) {
        // Trial is expired
        subTrial = false;
      }
      
      // Also validate trial_start if present
      if (subTrial && subscription?.trial_start) {
        const trialStart = new Date(subscription.trial_start);
        if (Number.isNaN(trialStart.getTime())) {
          console.warn('[premiumAccess] invalid trial_start date:', subscription.trial_start);
          subTrial = false;
        } else if (trialStart >= trialEnd) {
          // Start must be before end
          console.warn('[premiumAccess] trial_start >= trial_end');
          subTrial = false;
        }
      }
    } catch (e) {
      console.warn('[premiumAccess] trial validation error:', e?.message);
      subTrial = false;
    }
  }

  return userTrial || subTrial;
}

// Optional labeling helper - preserve Premium/Pro semantic distinction in UI
export function getPlanLabel(user, subscription) {
  const tier = getEntitlementTier(user, subscription);
  if (tier === "pro") return "Pro";
  if (tier === "premium") return "Premium";
  return "Free";
}

export function isFoundingMember(user = null) {
  return user?.isFoundingMember === true;
}

// CANONICAL founding member / legacy premium cutoff
// Users who became paid subscribers BEFORE this date get grandfathered access to Pro features
export const FOUNDING_MEMBER_CUTOFF = new Date("2026-02-01T00:00:00.000Z");

export function isLegacyPremium(subscription = null) {
  if (!subscription) return false;
  
  const tier = (subscription.tier || "").toLowerCase();
  if (tier === "pro") return false; // Pro is never legacy
  
  // Use normalized subscriptionStartedAt, fall back to started_at
  const startDate = subscription.subscriptionStartedAt || subscription.started_at;
  if (!startDate) return false;
  
  try {
    const start = new Date(startDate);
    return start < FOUNDING_MEMBER_CUTOFF;
  } catch {
    return false;
  }
}