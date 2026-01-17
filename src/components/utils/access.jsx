// src/components/utils/access.js

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
  return (user?.subscription_level || "").toLowerCase() === "paid";
}

/**
 * Canonical access evaluation.
 * - During trial: premium access granted to logged-in users (7 days from signup)
 * - After trial: only paid users have premium access
 */
export function hasPremiumAccess(user) {
  // No user? No premium access (prevents accidental unlock during loading/logged-out states)
  if (!user?.email) return false;

  // Primary paid indicator
  if ((user?.subscription_level || "").toLowerCase() === "paid") return true;

  // Trial window grants premium only to signed-in users within 7 days of signup
  return isTrialWindow(user);
}

export function getPlanLabel(user) {
  return hasPremiumAccess(user) ? "Premium" : "Free";
}

// Legacy aliases for compatibility (deprecated - pass user object)
export const isTrialWindowNow = isTrialWindow;