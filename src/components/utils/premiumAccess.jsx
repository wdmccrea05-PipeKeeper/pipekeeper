// src/components/utils/premiumAccess.jsx
// CANONICAL PREMIUM ACCESS HELPER - Use this everywhere
// Subscription entity is the source of truth when present
import { hasTrialAccess } from "./trialAccess";

const LEGACY_PREMIUM_CUTOFF = "2026-02-01T00:00:00.000Z";

export function isLegacyPremium(subscription = null) {
  if (!subscription) return false;
  
  const tier = (subscription.tier || "").toLowerCase();
  if (tier === "pro") return false; // Pro is never legacy
  
  // Use normalized subscriptionStartedAt, fall back to started_at
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

export function hasPaidAccess(user, subscription = null) {
  if (!user) return false;

  // Admin override
  const role = (user.role || "").toLowerCase();
  if (role === "admin" || role === "owner" || user.is_admin === true) {
    return true;
  }

  // PRIORITY 1: Subscription entity wins (source of truth)
  if (subscription) {
    const subStatus = (subscription.status || "").toLowerCase();
    const periodEnd = subscription.current_period_end;
    const tier = (subscription.tier || "").toLowerCase();
    
    // Check if subscription is active/trialing (NOT incomplete - that means payment failed)
    const isActiveStatus = subStatus === "active" || subStatus === "trialing";
    const isNotExpired = !periodEnd || new Date(periodEnd).getTime() > Date.now();
    
    // Must have a valid tier (premium or pro) in addition to active status
    const hasValidTier = tier === "premium" || tier === "pro";
    
    return isActiveStatus && isNotExpired && hasValidTier;
  }

  // PRIORITY 2: User entity fields (synced from Subscription by webhooks)
  const level = (user.subscription_level || "").toLowerCase();
  const status = (user.subscription_status || "").toLowerCase();

  const isPaidStatus =
    status === "active" ||
    status === "trialing" ||
    status === "paid" ||
    status === "complete";

  const isPaid = level === "paid" || isPaidStatus;

  // PRIORITY 3: Fallback - current_period_end check
  let hasFuturePeriod = false;
  try {
    const endRaw = user.current_period_end || user.subscription?.current_period_end;
    if (endRaw) {
      const end = new Date(endRaw);
      if (!Number.isNaN(end.getTime()) && end > new Date()) hasFuturePeriod = true;
    }
  } catch {
    // ignore
  }

  return isPaid || hasFuturePeriod;
}

// Helper to check if user has Pro tier specifically
export function hasProAccess(user, subscription = null) {
  if (!user) return false;

  // Admin override
  const role = (user.role || "").toLowerCase();
  if (role === "admin" || role === "owner" || user.is_admin === true) {
    return true;
  }

  // Check if they have paid access first
  if (!hasPaidAccess(user, subscription)) return false;

  // Then verify they're on Pro tier
  if (subscription) {
    const tier = (subscription.tier || "").toLowerCase();
    return tier === "pro";
  }

  // Fallback to user entity tier field
  const userTier = (user.subscription_tier || user.tier || "").toLowerCase();
  return userTier === "pro";
}

export function hasPremiumAccess(user, subscription = null) {
  if (!user?.email) return false;

  // Check paid access first (with optional subscription entity)
  if (hasPaidAccess(user, subscription)) return true;

  // Trial fallback for new accounts (7 days)
  return hasTrialAccess(user);
}

export function getPlanLabel(user) {
  return hasPremiumAccess(user) ? "Premium" : "Free";
}

export function isFoundingMember(user = null) {
  return user?.isFoundingMember === true;
}