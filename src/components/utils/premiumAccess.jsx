// src/components/utils/premiumAccess.jsx
import { hasTrialAccess } from "./trialAccess";

export function hasPremiumAccess(user) {
  if (!user) return false;

  // Admin override (prevents locking your admin login)
  const role = (user.role || "").toLowerCase();
  if (role === "admin" || role === "owner" || user.is_admin === true) return true;

  const level = (user.subscription_level || "").toLowerCase();
  const status = (user.subscription_status || "").toLowerCase();

  // Treat all paid-like statuses as premium
  const isPaidStatus =
    status === "active" ||
    status === "trialing" || // important for Stripe
    status === "paid" ||
    status === "complete";

  // Primary source of truth from app DB fields
  const isPaid = level === "paid" || isPaidStatus;

  // Strong fallback: if current_period_end exists and is in the future, treat as premium
  // (covers cases where level/status didn't propagate yet but the subscription row did)
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

  // Trial fallback for new accounts (7 days)
  const isTrial = hasTrialAccess(user);

  return isPaid || hasFuturePeriod || isTrial;
}