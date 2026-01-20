// src/components/utils/premiumAccess.jsx
// CANONICAL PREMIUM ACCESS HELPER - Use this everywhere
// Subscription entity is the source of truth when present
import { hasTrialAccess } from "./trialAccess";

export function hasPaidAccess(user, subscription = null) {
  if (!user) return false;

  // Admin override
  const role = (user.role || "").toLowerCase();
  if (role === "admin" || role === "owner" || user.is_admin === true) return true;

  // PRIORITY 1: Subscription entity wins (source of truth)
  if (subscription) {
    const subStatus = (subscription.status || "").toLowerCase();
    const periodEnd = subscription.current_period_end;
    
    // Check if subscription is active/trialing AND not expired
    const isActiveStatus = subStatus === "active" || subStatus === "trialing";
    const isNotExpired = !periodEnd || new Date(periodEnd).getTime() > Date.now();
    
    return isActiveStatus && isNotExpired;
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