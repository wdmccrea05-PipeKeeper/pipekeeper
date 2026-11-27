/**
 * EXISTING-COLLECTOR APPRECIATION GRANT — client resolver.
 *
 * Reads the server-issued mirror on the account record so every feature gate
 * recognizes a promotional grant through the SAME canonical resolver as the
 * welcome trial. The grant entity (written only by the backend) stays the
 * authoritative source for backend authorization.
 *
 * The window can never exceed 168 hours from the server-issued activation
 * timestamp, so a client-side edit can shorten a grant but never extend one.
 */

import { resolveProTrial } from './proTrial';

export const APPRECIATION_CAMPAIGN_ID = 'collector_appreciation_black_friday_2026';
export const APPRECIATION_GRANT_HOURS = 168;
export const APPRECIATION_GRANT_MS = APPRECIATION_GRANT_HOURS * 60 * 60 * 1000;

/**
 * Redemption deadline: Monday, November 30, 2026, 11:59 p.m. Eastern.
 * Eastern Standard Time (UTC-5) on that date ⇒ 2026-12-01T04:59:00Z.
 * Mirrors the server constant in base44/shared/appreciationCampaign.ts; the
 * server is what actually enforces it.
 */
export const APPRECIATION_REDEMPTION_DEADLINE_ISO = '2026-12-01T04:59:00.000Z';
export const APPRECIATION_DEADLINE_TIME_ZONE = 'America/New_York';

/**
 * Redemption window. `closed` only stops NEW redemptions — grants already
 * issued run their full 168 hours.
 */
export function resolveRedemptionWindow(nowMs = Date.now()) {
  const deadlineMs = new Date(APPRECIATION_REDEMPTION_DEADLINE_ISO).getTime();
  const closed = nowMs > deadlineMs;
  return {
    deadlineIso: APPRECIATION_REDEMPTION_DEADLINE_ISO,
    deadlineMs,
    closed,
    open: !closed,
    msRemaining: Math.max(0, deadlineMs - nowMs),
  };
}

/**
 * The deadline rendered in the collector's language but always in Eastern
 * Time, so every collector sees the same instant and the same "ET" label.
 */
export function formatRedemptionDeadline(locale = 'en') {
  const date = new Date(APPRECIATION_REDEMPTION_DEADLINE_ISO);
  try {
    return new Intl.DateTimeFormat(locale || 'en', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: APPRECIATION_DEADLINE_TIME_ZONE,
      timeZoneName: 'short',
    }).format(date);
  } catch {
    return 'Monday, November 30, 2026, 11:59 PM EST';
  }
}

const ACTIVATED_KEYS = ['appreciation_grant_activated_at', 'appreciationGrantActivatedAt'];
const EXPIRES_KEYS = ['appreciation_grant_expires_at', 'appreciationGrantExpiresAt'];
const STATUS_KEYS = ['appreciation_grant_status'];

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
 * State of the appreciation grant for a user.
 * @returns {Object} { active, known, expired, startedAt, endsAt, daysRemaining, hoursRemaining, campaignId }
 */
export function resolveAppreciationGrant(user, nowMs = Date.now()) {
  const activated = toDate(pick(user, ACTIVATED_KEYS));
  const storedEnd = toDate(pick(user, EXPIRES_KEYS));
  const status = String(pick(user, STATUS_KEYS) || '').toLowerCase();

  if (!activated && !storedEnd) {
    return {
      active: false,
      known: false,
      expired: false,
      startedAt: null,
      endsAt: null,
      campaignId: null,
      daysRemaining: 0,
      hoursRemaining: 0,
      msRemaining: 0,
    };
  }

  const cap = activated ? activated.getTime() + APPRECIATION_GRANT_MS : null;
  const rawEnd = storedEnd ? storedEnd.getTime() : cap;
  const endMs = cap === null ? rawEnd : Math.min(rawEnd, cap);
  const revoked = status === 'revoked';
  const msRemaining = endMs === null ? 0 : Math.max(0, endMs - nowMs);
  const active = !revoked && msRemaining > 0;

  return {
    active,
    known: true,
    expired: !active,
    startedAt: activated ? activated.toISOString() : null,
    endsAt: endMs === null ? null : new Date(endMs).toISOString(),
    campaignId: pick(user, ['appreciation_campaign_id']) || APPRECIATION_CAMPAIGN_ID,
    daysRemaining: active ? Math.ceil(msRemaining / 86400000) : 0,
    hoursRemaining: active ? Math.ceil(msRemaining / 3600000) : 0,
    msRemaining,
  };
}

/**
 * The single complimentary-Pro decision used by every feature gate.
 * Whichever window ends later wins; paid access always outranks both.
 * @returns {Object} { active, kind: 'welcome_trial'|'appreciation'|null, endsAt, daysRemaining, hoursRemaining, trial, appreciation }
 */
export function resolveComplimentaryPro(user, nowMs = Date.now()) {
  const trial = resolveProTrial(user, nowMs);
  const appreciation = resolveAppreciationGrant(user, nowMs);

  const trialEnd = trial.endsAt ? new Date(trial.endsAt).getTime() : 0;
  const appreciationEnd = appreciation.endsAt ? new Date(appreciation.endsAt).getTime() : 0;

  if (!trial.active && !appreciation.active) {
    return {
      active: false,
      kind: null,
      endsAt: null,
      daysRemaining: 0,
      hoursRemaining: 0,
      trial,
      appreciation,
    };
  }

  const useAppreciation = appreciation.active && appreciationEnd >= trialEnd;
  const chosen = useAppreciation ? appreciation : trial;

  return {
    active: true,
    kind: useAppreciation ? 'appreciation' : 'welcome_trial',
    endsAt: chosen.endsAt,
    daysRemaining: chosen.daysRemaining,
    hoursRemaining: chosen.hoursRemaining,
    trial,
    appreciation,
  };
}