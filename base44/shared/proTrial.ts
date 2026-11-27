/**
 * Server-side resolver for the 7-day complimentary Pro window.
 * Mirrors src/components/utils/proTrial.js so backend gates and the UI agree.
 */

export const PRO_TRIAL_DAYS = 7;
export const PRO_TRIAL_HOURS = 168;
export const PRO_TRIAL_MS = PRO_TRIAL_HOURS * 60 * 60 * 1000;

const START_KEYS = ["pro_trial_started_at", "proTrialStartedAt"];
const END_KEYS = ["pro_trial_ends_at", "proTrialEndsAt"];
const CREATED_KEYS = ["created_date", "created_at", "createdAt", "inserted_at", "created"];

function pick(user: any, keys: string[]) {
  for (const key of keys) {
    const value = user?.[key];
    if (value) return value;
  }
  return null;
}

function toDate(raw: any): Date | null {
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getProTrialWindow(user: any) {
  const storedEnd = toDate(pick(user, END_KEYS));
  const storedStart = toDate(pick(user, START_KEYS));

  if (storedEnd) {
    return {
      startedAt: (storedStart || new Date(storedEnd.getTime() - PRO_TRIAL_MS)).toISOString(),
      endsAt: storedEnd.toISOString(),
      source: "account",
    };
  }

  const created = toDate(pick(user, CREATED_KEYS));
  if (!created) return { startedAt: null, endsAt: null, source: "unknown" };

  return {
    startedAt: created.toISOString(),
    endsAt: new Date(created.getTime() + PRO_TRIAL_MS).toISOString(),
    source: "account-created",
  };
}

export function resolveProTrial(user: any, nowMs = Date.now()) {
  const window = getProTrialWindow(user);
  if (!window.endsAt) {
    return {
      active: false,
      known: false,
      expired: false,
      startedAt: null,
      endsAt: null,
      source: "unknown",
      msRemaining: 0,
      daysRemaining: 0,
    };
  }

  const msRemaining = Math.max(0, new Date(window.endsAt).getTime() - nowMs);
  const active = msRemaining > 0;

  return {
    active,
    known: true,
    expired: !active,
    startedAt: window.startedAt,
    endsAt: window.endsAt,
    source: window.source,
    msRemaining,
    daysRemaining: active ? Math.ceil(msRemaining / 86400000) : 0,
  };
}

export function isProTrialActive(user: any, nowMs = Date.now()) {
  return resolveProTrial(user, nowMs).active;
}