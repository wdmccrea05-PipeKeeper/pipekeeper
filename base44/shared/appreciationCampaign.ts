/**
 * Existing-collector appreciation campaign — shared server rules.
 *
 * One campaign, one promotional grant per collector, 168 hours, server-issued
 * timestamps. This module is the ONLY place these rules live on the server so
 * every function (status, activation, events, admin reporting) agrees.
 */

import { resolveProTrial } from "./proTrial.ts";

export const APPRECIATION_CAMPAIGN_ID = "collector_appreciation_black_friday_2026";
export const APPRECIATION_GRANT_HOURS = 168;
export const APPRECIATION_GRANT_MS = APPRECIATION_GRANT_HOURS * 60 * 60 * 1000;
export const CAMPAIGN_LAUNCH_ISO = "2026-11-27T00:00:00.000Z";
/**
 * Redemption deadline: Monday, November 30, 2026, 11:59 p.m. Eastern.
 * Eastern Standard Time (UTC-5) in effect on that date, so the instant is
 * 2026-12-01T04:59:00Z. Fixed here so enforcement never depends on a record
 * existing or on the caller's time zone.
 */
export const CAMPAIGN_REDEMPTION_DEADLINE_ISO = "2026-12-01T04:59:00.000Z";

export function normEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function toDate(raw) {
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Effective state of a grant, recomputed from its timestamps.
 * The window can never exceed 168 hours from activated_at, so a modified
 * record can shorten a grant but never extend one.
 */
export function resolveGrantState(grant, nowMs = Date.now()) {
  if (!grant) {
    return { exists: false, active: false, expired: false, status: "none", activatedAt: null, expiresAt: null, msRemaining: 0, daysRemaining: 0, hoursRemaining: 0 };
  }

  const activated = toDate(grant.activated_at);
  const storedEnd = toDate(grant.expires_at);
  const cap = activated ? activated.getTime() + APPRECIATION_GRANT_MS : null;
  const endMs = storedEnd ? (cap === null ? storedEnd.getTime() : Math.min(storedEnd.getTime(), cap)) : cap;
  const revoked = String(grant.status || "").toLowerCase() === "revoked";
  const msRemaining = endMs === null ? 0 : Math.max(0, endMs - nowMs);
  const active = !revoked && msRemaining > 0;

  return {
    exists: true,
    active,
    expired: !active,
    status: revoked ? "revoked" : active ? "active" : "expired",
    activatedAt: activated ? activated.toISOString() : null,
    expiresAt: endMs === null ? null : new Date(endMs).toISOString(),
    msRemaining,
    daysRemaining: active ? Math.ceil(msRemaining / 86400000) : 0,
    hoursRemaining: active ? Math.ceil(msRemaining / 3600000) : 0,
    grantId: grant.id || null,
    campaignId: grant.campaign_id || APPRECIATION_CAMPAIGN_ID,
  };
}

const GRACE_PERIOD_DAYS = 5;

export function subscriptionGrantsPaidAccess(sub, nowMs = Date.now()) {
  if (!sub) return false;
  const status = String(sub.status || "").toLowerCase();
  if (status === "active" || status === "trialing" || status === "trial") {
    const end = toDate(sub.current_period_end);
    if (end && end.getTime() + 86400000 < nowMs) return false;
    return true;
  }
  if (status === "past_due" || status === "incomplete" || status === "unpaid") {
    const end = toDate(sub.current_period_end);
    if (!end) return false;
    return nowMs <= end.getTime() + GRACE_PERIOD_DAYS * 86400000;
  }
  return false;
}

export function isPaidSubscriber(user, subscriptions, nowMs = Date.now()) {
  const list = Array.isArray(subscriptions) ? subscriptions : subscriptions ? [subscriptions] : [];
  if (list.some((sub) => subscriptionGrantsPaidAccess(sub, nowMs))) return true;
  if (user?.has_paid_access === true) return true;
  const tier = String(user?.entitlement_tier || "").toLowerCase();
  return tier === "pro" || tier === "premium";
}

export function isGrandfathered(user) {
  return user?.isFoundingMember === true || user?.legacy_broad_module_access === true;
}

export function defaultConfig() {
  return {
    campaign_id: APPRECIATION_CAMPAIGN_ID,
    is_enabled: true,
    eligibility_cutoff: CAMPAIGN_LAUNCH_ISO,
    redemption_deadline: CAMPAIGN_REDEMPTION_DEADLINE_ISO,
  };
}

/**
 * Redemption window for the campaign. Closed means no NEW redemption may be
 * created; grants already issued keep running to their own 168-hour end.
 */
export function resolveRedemptionWindow(config, nowMs = Date.now()) {
  const deadline = toDate(config?.redemption_deadline) || toDate(CAMPAIGN_REDEMPTION_DEADLINE_ISO);
  const deadlineMs = deadline ? deadline.getTime() : null;
  const closed = deadlineMs !== null && nowMs > deadlineMs;
  return {
    deadlineIso: deadline ? deadline.toISOString() : null,
    deadlineMs,
    closed,
    open: !closed,
    msRemaining: deadlineMs === null ? null : Math.max(0, deadlineMs - nowMs),
  };
}

/** Campaign configuration with safe defaults when no record exists yet. */
export async function loadCampaignConfig(base44) {
  const rows = await base44.asServiceRole.entities.AppreciationCampaignConfig
    .filter({ campaign_id: APPRECIATION_CAMPAIGN_ID }, "-created_date", 5)
    .catch(() => []);
  const record = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  const base = defaultConfig();
  if (!record) return { ...base, record: null };
  return {
    campaign_id: record.campaign_id || APPRECIATION_CAMPAIGN_ID,
    is_enabled: record.is_enabled !== false,
    eligibility_cutoff: record.eligibility_cutoff || base.eligibility_cutoff,
    redemption_deadline: record.redemption_deadline || base.redemption_deadline,
    record,
  };
}

/** Every grant this collector has for the campaign, oldest first. */
export async function loadUserGrants(base44, email) {
  const rows = await base44.asServiceRole.entities.AppreciationGrant
    .filter({ campaign_id: APPRECIATION_CAMPAIGN_ID, user_email: normEmail(email) }, "created_date", 50)
    .catch(() => []);
  return Array.isArray(rows) ? rows : [];
}

export async function loadUserSubscriptions(base44, email) {
  const rows = await base44.asServiceRole.entities.Subscription
    .filter({ user_email: normEmail(email) }, "-created_date", 50)
    .catch(() => []);
  return Array.isArray(rows) ? rows : [];
}

export async function loadUserRecord(base44, email) {
  const rows = await base44.asServiceRole.entities.User
    .filter({ email: normEmail(email) }, "-created_date", 5)
    .catch(() => []);
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

/**
 * Eligibility for the appreciation offer.
 * Paid access always wins; an active welcome trial defers the offer; a grant
 * that already exists can never be redeemed twice.
 */
export function evaluateEligibility({ config, user, grants, subscriptions, nowMs = Date.now() }) {
  if (!config || config.is_enabled === false) {
    return { eligible: false, code: "campaign_disabled" };
  }

  if (isPaidSubscriber(user, subscriptions, nowMs)) {
    return { eligible: false, code: "paid_subscriber" };
  }

  if (isGrandfathered(user)) {
    return { eligible: false, code: "grandfathered_access" };
  }

  const existing = Array.isArray(grants) && grants.length > 0 ? grants[0] : null;
  if (existing) {
    const state = resolveGrantState(existing, nowMs);
    return { eligible: false, code: state.active ? "already_active" : "already_redeemed", grant: state };
  }

  const welcomeTrial = resolveProTrial(user || {}, nowMs);
  if (welcomeTrial.active) {
    return { eligible: false, code: "welcome_trial_active", welcomeTrialEndsAt: welcomeTrial.endsAt };
  }

  const created = toDate(user?.created_date);
  const cutoff = toDate(config.eligibility_cutoff);
  if (!created) {
    return { eligible: false, code: "account_created_after_cutoff" };
  }
  if (cutoff && created.getTime() >= cutoff.getTime()) {
    return { eligible: false, code: "account_created_after_cutoff" };
  }

  if (resolveRedemptionWindow(config, nowMs).closed) {
    return { eligible: false, code: "redemption_deadline_passed" };
  }

  return { eligible: true, code: "eligible" };
}

/**
 * Mirror the active grant onto the account record so the client resolver can
 * read it without an extra request. The grant entity stays authoritative for
 * backend authorization.
 */
export async function syncUserMirror(base44, userId, state) {
  if (!userId) return;
  try {
    await base44.asServiceRole.entities.User.update(userId, {
      appreciation_campaign_id: state.exists ? APPRECIATION_CAMPAIGN_ID : null,
      appreciation_grant_activated_at: state.activatedAt || null,
      appreciation_grant_expires_at: state.expiresAt || null,
      appreciation_grant_status: state.status || "none",
    });
  } catch {
    /* mirror is a convenience cache — authorization never depends on it */
  }
}

export function publicCampaign(config) {
  return {
    id: config?.campaign_id || APPRECIATION_CAMPAIGN_ID,
    is_enabled: config?.is_enabled !== false,
    eligibility_cutoff: config?.eligibility_cutoff || CAMPAIGN_LAUNCH_ISO,
    redemption_deadline: config?.redemption_deadline || CAMPAIGN_REDEMPTION_DEADLINE_ISO,
    redemption_closed: resolveRedemptionWindow(config).closed,
  };
}