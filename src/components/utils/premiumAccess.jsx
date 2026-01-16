// src/components/utils/premiumAccess.jsx
import { hasTrialAccess } from "./trialAccess";

export function hasPremiumAccess(user) {
  if (!user) return false;

  const level = (user.subscription_level || "").toLowerCase();
  const status = (user.subscription_status || "").toLowerCase();

  // Primary source of truth
  const isPaid = level === "paid" || status === "active";

  // Trial fallback for new accounts (7 days) – preserves your intended behavior
  const isTrial = hasTrialAccess(user);

  return isPaid || isTrial;
}