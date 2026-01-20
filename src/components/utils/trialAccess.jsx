// src/components/utils/trialAccess.jsx

// Returns true if the user should have Premium access via a free trial window.
// This is separate from Stripe-paid status and should be used as a fallback
// for new accounts (e.g., "7 days free Premium").

const TRIAL_DAYS = 7;

function parseUserCreatedAt(user) {
  // Base44 / auth providers may expose different keys depending on runtime
  const raw =
    user?.created_at ||
    user?.createdAt ||
    user?.created_date ||
    user?.created ||
    user?.inserted_at ||
    null;

  if (!raw) return null;

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function getTrialInfo(user) {
  const createdAt = parseUserCreatedAt(user);
  if (!createdAt) {
    return {
      inTrial: false,
      trialEndsAt: null,
      reason: "no-created-date",
    };
  }

  const trialEndsAt = new Date(createdAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const now = new Date();

  return {
    inTrial: now < trialEndsAt,
    trialEndsAt: trialEndsAt.toISOString(),
    reason: "ok",
  };
}

export function hasTrialAccess(user) {
  return getTrialInfo(user).inTrial;
}

export function isTrialWindow(user) {
  return getTrialInfo(user).inTrial;
}

export function getTrialDaysRemaining(user) {
  const info = getTrialInfo(user);
  if (!info.inTrial || !info.trialEndsAt) return 0;
  
  const now = new Date();
  const end = new Date(info.trialEndsAt);
  const msRemaining = end.getTime() - now.getTime();
  const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
  
  return Math.max(0, daysRemaining);
}