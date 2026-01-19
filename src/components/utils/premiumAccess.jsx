// src/components/utils/premiumAccess.jsx
// CANONICAL PREMIUM ACCESS HELPER - Use this everywhere
import { hasTrialAccess } from "./trialAccess";

export function hasPaidAccess(user) {
  if (!user) return false;

  // Admin override
  const role = (user.role || "").toLowerCase();
  if (role === "admin" || role === "owner" || user.is_admin === true) return true;

  const level = (user.subscription_level || "").toLowerCase();
  const status = (user.subscription_status || "").toLowerCase();

  // Check paid status
  const isPaidStatus =
    status === "active" ||
    status === "trialing" ||
    status === "paid" ||
    status === "complete";

  const isPaid = level === "paid" || isPaidStatus;

  // Fallback: if current_period_end exists and is in the future
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

export function hasPremiumAccess(user) {
  if (!user?.email) return false;

  // Check paid access first
  if (hasPaidAccess(user)) return true;

  // Trial fallback for new accounts (7 days)
  return hasTrialAccess(user);
}

export function getPlanLabel(user) {
  return hasPremiumAccess(user) ? "Premium" : "Free";
}