/**
 * CANONICAL COMPLIMENTARY PRO ACCESS (7-DAY TRIAL) RESOLVER
 *
 * One source of truth for the complimentary Pro window that every new
 * CollectionKeeper account receives.
 *
 * Authoritative inputs (stored on the account, never on the device):
 *   pro_trial_started_at — ISO timestamp stamped once when the account is created
 *   pro_trial_ends_at    — ISO timestamp, exactly 168 hours after the start
 *
 * Fallback (accounts created before the stamps existed): the window is derived
 * from the account creation date, so an old account resolves as an EXPIRED
 * trial instead of silently restarting one.
 *
 * The window is timezone independent: it is compared as absolute UTC instants,
 * so changing the device time zone can never move the expiration.
 */

import { MODULE_RELEASE_STATES, isModuleLaunched } from './moduleReleaseState';

export const PRO_TRIAL_DAYS = 7;
export const PRO_TRIAL_HOURS = 168;
export const PRO_TRIAL_MS = PRO_TRIAL_HOURS * 60 * 60 * 1000;

const START_KEYS = ['pro_trial_started_at', 'proTrialStartedAt'];
const END_KEYS = ['pro_trial_ends_at', 'proTrialEndsAt'];
const CREATED_KEYS = ['created_date', 'created_at', 'createdAt', 'inserted_at', 'created'];

function pick(user, keys) {
  for (const key of keys) {
    const value = user?.[key];
    if (value) return value;
  }
  return null;
}

function toDate(raw) {
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * The stored (or derived) complimentary window for an account.
 * @returns {{startedAt: string|null, endsAt: string|null, source: string}}
 */
export function getProTrialWindow(user) {
  const storedEnd = toDate(pick(user, END_KEYS));
  const storedStart = toDate(pick(user, START_KEYS));
  const created = toDate(pick(user, CREATED_KEYS));

  // Hard cap: the window can never run past 168 hours from the immutable
  // creation date. A writable stamp can shorten access, never lengthen it,
  // so no client-side value can extend complimentary access.
  const cap = created ? created.getTime() + PRO_TRIAL_MS : null;

  if (storedEnd) {
    const endMs = cap === null ? storedEnd.getTime() : Math.min(storedEnd.getTime(), cap);
    return {
      startedAt: (storedStart || new Date(endMs - PRO_TRIAL_MS)).toISOString(),
      endsAt: new Date(endMs).toISOString(),
      source: 'account',
    };
  }

  if (!created) {
    return { startedAt: null, endsAt: null, source: 'unknown' };
  }

  return {
    startedAt: created.toISOString(),
    endsAt: new Date(cap).toISOString(),
    source: 'account-created',
  };
}

/**
 * Resolve the complimentary Pro window for a user.
 * @param {Object} user
 * @param {number} [nowMs] - injectable clock (tests)
 * @returns {Object} trial state
 */
export function resolveProTrial(user, nowMs = Date.now()) {
  const window = getProTrialWindow(user);

  if (!window.endsAt) {
    return {
      active: false,
      known: false,
      expired: false,
      startedAt: null,
      endsAt: null,
      source: 'unknown',
      msRemaining: 0,
      hoursRemaining: 0,
      daysRemaining: 0,
    };
  }

  const endMs = new Date(window.endsAt).getTime();
  const msRemaining = Math.max(0, endMs - nowMs);
  const active = msRemaining > 0;

  return {
    active,
    known: true,
    expired: !active,
    startedAt: window.startedAt,
    endsAt: window.endsAt,
    source: window.source,
    msRemaining,
    hoursRemaining: active ? Math.ceil(msRemaining / 3600000) : 0,
    daysRemaining: active ? Math.ceil(msRemaining / 86400000) : 0,
  };
}

export function isProTrialActive(user, nowMs = Date.now()) {
  return resolveProTrial(user, nowMs).active;
}

/**
 * Modules covered by complimentary access. Derived from the release-state table
 * so modules launched in the future are included without further code changes.
 */
export function getProTrialModules() {
  return Object.keys(MODULE_RELEASE_STATES).filter((key) => isModuleLaunched(key));
}