// src/components/utils/access.js

// Trial ends at 11:59:59 PM Eastern on Jan 15, 2026
export const TRIAL_END_UTC = '2026-01-16T04:59:59.000Z';

export const isTrialWindow = () => {
  return Date.now() <= Date.parse(TRIAL_END_UTC);
};

export const getTrialDaysRemaining = () => {
  const msLeft = Date.parse(TRIAL_END_UTC) - Date.now();
  if (msLeft <= 0) return 0;
  return Math.ceil(msLeft / (1000 * 60 * 60 * 24));
};

export function hasPaidAccess(user) {
  return (user?.subscription_level || "").toLowerCase() === "paid";
}

/**
 * Canonical access evaluation.
 * - During trial: premium access granted to logged-in users
 * - After trial: only paid users have premium access
 */
export function hasPremiumAccess(user) {
  // Primary paid indicator
  if (user?.subscription_level === 'paid') return true;

  // Temporary premium access during trial window
  return isTrialWindow();
}

export function getPlanLabel(user) {
  return hasPremiumAccess(user) ? "Premium" : "Free";
}

// Legacy aliases for compatibility
export const isTrialWindowNow = isTrialWindow;