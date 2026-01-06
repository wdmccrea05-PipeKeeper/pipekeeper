// src/components/utils/access.js

// Trial ends Jan 15, 2026 11:59:59 PM America/Indiana/Indianapolis (approx) using a UTC cutoff.
export const TRIAL_END_UTC = Date.parse("2026-01-16T05:00:00Z");

export function isTrialWindowNow(nowMs = Date.now()) {
  return nowMs < TRIAL_END_UTC;
}

export function hasPaidAccess(user) {
  return (user?.subscription_level || "").toLowerCase() === "paid";
}

/**
 * Canonical access evaluation.
 * - During trial: premium access granted to logged-in users
 * - After trial: only paid users have premium access
 */
export function hasPremiumAccess(user, nowMs = Date.now()) {
  return !!user && (hasPaidAccess(user) || isTrialWindowNow(nowMs));
}

export function getPlanLabel(user, nowMs = Date.now()) {
  return hasPremiumAccess(user, nowMs) ? "Premium" : "Free";
}