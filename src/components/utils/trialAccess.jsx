// src/components/utils/trialAccess.jsx
//
// DEPRECATED SHIM — all trial logic now lives in proTrial.js, which resolves the
// account-stamped complimentary Pro window. Kept so existing imports keep working.

import { resolveProTrial } from "./proTrial";

export function getTrialInfo(user) {
  const trial = resolveProTrial(user);
  return {
    inTrial: trial.active,
    trialEndsAt: trial.endsAt,
    reason: trial.known ? (trial.active ? "ok" : "expired") : "no-created-date",
  };
}

export function hasTrialAccess(user) {
  return resolveProTrial(user).active;
}

export function isTrialWindow(user) {
  return resolveProTrial(user).active;
}

export function getTrialDaysRemaining(user) {
  return resolveProTrial(user).daysRemaining;
}