// src/components/utils/access.jsx
import { hasTrialAccess } from "./trialAccess";

const TRIAL_DAYS = 7;

export const isTrialWindow = (user) => {
  if (!user) return false;

  const created =
    user?.created_at ||
    user?.createdAt ||
    user?.created_date ||
    user?.createdDate ||
    null;

  if (!created) return false;

  const createdMs = Date.parse(created);
  if (!Number.isFinite(createdMs)) return false;

  const now = Date.now();
  const trialMs = TRIAL_DAYS * 24 * 60 * 60 * 1000;
  return now - createdMs < trialMs;
};

export const getTrialDaysRemaining = (user) => {
  if (!user) return 0;

  const created =
    user?.created_at ||
    user?.createdAt ||
    user?.created_date ||
    user?.createdDate ||
    null;

  if (!created) return 0;

  const createdMs = Date.parse(created);
  if (!Number.isFinite(createdMs)) return 0;

  const now = Date.now();
  const trialMs = TRIAL_DAYS * 24 * 60 * 60 * 1000;
  const endMs = createdMs + trialMs;
  const msLeft = endMs - now;

  if (msLeft <= 0) return 0;
  return Math.ceil(msLeft / (1000 * 60 * 60 * 24));
};

export function hasPaidAccess(user) {
  if (!user) return false;

  // Always allow admin
  if ((user?.role || "").toLowerCase() === "admin") return true;

  const level = (user.subscription_level || "").toLowerCase();
  const status = (user.subscription_status || "").toLowerCase();

  // Treat status active/trialing as paid access too
  const isPaid = level === "paid" || status === "active" || status === "trialing";
  return isPaid;
}

/**
 * Canonical access evaluation:
 * - Paid users (or admin) => premium
 * - Otherwise trial access => premium
 */
export function hasPremiumAccess(user) {
  if (!user?.email) return false;

  if (hasPaidAccess(user)) return true;

  // Trial fallback (your 7-day access logic)
  return hasTrialAccess ? hasTrialAccess(user) : isTrialWindow(user);
}

export function getPlanLabel(user) {
  return hasPremiumAccess(user) ? "Premium" : "Free";
}

// Legacy alias
export const isTrialWindowNow = isTrialWindow;