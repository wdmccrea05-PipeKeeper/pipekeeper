/**
 * V3 Subscription Report — pure helper functions (no side effects).
 *
 * These are the canonical implementations used for testing.
 * The Deno entry.ts duplicates the same logic inline (Deno cannot import from src/).
 *
 * Canonical data model (NormalizedSub):
 *   userId              ← user_id
 *   userEmail           ← user_email
 *   isPaid              ← derived via isActivePaid(raw)
 *   billingInterval     ← billing_interval / billing_period ('monthly' | 'annual' | null)
 *   price               ← amount (null when missing/zero)
 *   createdAt           ← started_at || created_date || current_period_start
 *   renewalAt           ← current_period_end
 *   module              ← always 'pipekeeper' (only active paid module)
 *   platform            ← derived from subscription provider or user record ('ios'|'web'|'google'|null)
 *
 * Required fields: userId/userEmail, billingInterval, price, platform.
 * If ANY required field is missing, the subscription is excluded from revenue metrics
 * and counted in the corresponding excluded-record warning.
 */

// ─── Low-level helpers ────────────────────────────────────────────────────────

export function norm(v) {
  return String(v ?? '').trim().toLowerCase();
}

export function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function inRange(d, range) {
  return d >= range.start && d <= range.end;
}

// ─── Calendar ranges ──────────────────────────────────────────────────────────

/**
 * Returns UTC-aligned calendar boundaries.
 *
 * today   = current day 00:00 → 23:59:59.999 UTC
 * week    = current ISO week (Monday 00:00 → Sunday 23:59:59.999 UTC)
 * month   = current calendar month (1st 00:00 → last day 23:59:59.999 UTC)
 * quarter = current calendar quarter
 * year    = current calendar year (Jan 1 → Dec 31 UTC)
 *
 * This is the single shared date-range helper — use it everywhere.
 * Never mix rolling windows with calendar ranges.
 *
 * @param {'today'|'week'|'month'|'quarter'|'year'} type
 * @param {Date} now
 * @returns {{ start: Date, end: Date }}
 */
export function getCalendarRange(type, now) {
  const start = new Date(now);
  let end;

  switch (type) {
    case 'today': {
      start.setUTCHours(0, 0, 0, 0);
      end = new Date(
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 23, 59, 59, 999)
      );
      break;
    }
    case 'week': {
      const dow = start.getUTCDay();
      const daysFromMonday = dow === 0 ? 6 : dow - 1;
      start.setUTCDate(start.getUTCDate() - daysFromMonday);
      start.setUTCHours(0, 0, 0, 0);
      end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 6);
      end.setUTCHours(23, 59, 59, 999);
      break;
    }
    case 'month': {
      start.setUTCDate(1);
      start.setUTCHours(0, 0, 0, 0);
      end = new Date(
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0, 23, 59, 59, 999)
      );
      break;
    }
    case 'quarter': {
      const q = Math.floor(start.getUTCMonth() / 3);
      start.setUTCMonth(q * 3, 1);
      start.setUTCHours(0, 0, 0, 0);
      end = new Date(
        Date.UTC(start.getUTCFullYear(), q * 3 + 3, 0, 23, 59, 59, 999)
      );
      break;
    }
    case 'year': {
      start.setUTCMonth(0, 1);
      start.setUTCHours(0, 0, 0, 0);
      end = new Date(
        Date.UTC(start.getUTCFullYear(), 11, 31, 23, 59, 59, 999)
      );
      break;
    }
    default:
      throw new Error(`Unknown calendar range type: ${type}`);
  }

  return { start, end };
}

// ─── Interval normalization ───────────────────────────────────────────────────

/**
 * Normalize billing_interval / billing_period to 'monthly' | 'annual' | null.
 * Only reads the direct canonical fields — no period-length inference.
 *
 * @param {object} raw  Raw subscription record
 * @returns {'monthly'|'annual'|null}
 */
export function normalizeInterval(raw) {
  const v = norm(raw.billing_interval || raw.billing_period || '');
  if (v === 'month' || v === 'monthly') return 'monthly';
  if (v === 'year' || v === 'yearly' || v === 'annual') return 'annual';
  return null;
}

// ─── Active paid detection ────────────────────────────────────────────────────

/**
 * A subscription is "active paid" when:
 *   - status is 'active'
 *   - status is 'trialing' AND amount > 0
 *   - status is 'past_due'
 *
 * @param {object} raw  Raw subscription record
 * @returns {boolean}
 */
export function isActivePaid(raw) {
  const status = norm(raw.status);
  const amount = Math.max(0, Number(raw.amount || 0));
  if (status === 'active') return true;
  if (status === 'trialing' && amount > 0) return true;
  if (status === 'past_due') return true;
  return false;
}

// ─── Platform normalization ───────────────────────────────────────────────────
// NOTE: This function is intentionally mirrored in
// base44/functions/getUserSubscriptionReportV3/entry.ts.
// Deno edge functions cannot import from src/, so both files maintain the same
// logic independently. Keep them in sync when editing either.

/**
 * Normalize platform from subscription provider or user record.
 *
 * Primary source: raw.provider ('apple', 'ios', 'google', 'android', 'stripe', 'web', …)
 * Secondary source: user.data.platform or user.platform (fallback when no provider)
 *
 * Known web indicators: any non-empty, non-mobile, non-'unknown' value.
 * This mirrors the signup-source logic already used elsewhere in this report.
 * Returns null when platform cannot be determined — do NOT guess.
 *
 * @param {object}      raw   Raw subscription record
 * @param {object|null} user  Associated user record (optional)
 * @returns {'ios'|'web'|'google'|null}
 */
export function normalizePlatform(raw, user = null) {
  const provider = norm(raw.provider || '');
  if (provider === 'apple' || provider === 'ios') return 'ios';
  if (provider === 'google' || provider === 'android' || provider === 'googleplay') return 'google';
  if (provider === 'stripe' || provider === 'web') return 'web';

  if (user) {
    const userPlatform = norm(user.data?.platform || user.platform || '');
    if (userPlatform === 'apple' || userPlatform === 'ios') return 'ios';
    if (userPlatform === 'android' || userPlatform === 'googleplay' || userPlatform === 'google') return 'google';
    // Any non-empty, non-mobile, non-'unknown' value is treated as web.
    // Consistent with signupSources logic: non-mobile platform → web.
    if (userPlatform && userPlatform !== 'unknown') return 'web';
  }

  return null;
}

// ─── Normalization ────────────────────────────────────────────────────────────

/**
 * Normalize ONE raw subscription record into the V3 canonical shape:
 * {
 *   rawId, userId, userEmail,
 *   isPaid,
 *   billingInterval: 'monthly' | 'annual' | null,
 *   price: number | null,
 *   createdAt: Date | null,
 *   renewalAt: Date | null,
 *   module: 'pipekeeper',
 *   platform: 'ios' | 'web' | 'google' | null,
 * }
 *
 * @param {object}      raw   Raw subscription record
 * @param {object|null} user  Associated user record (optional, used for platform fallback)
 * @returns {object}    Normalized subscription
 */
export function normalizeSub(raw, user = null) {
  const rawPrice = Math.max(0, Number(raw.amount || 0));
  return {
    rawId:           String(raw.id || raw.stripe_subscription_id || ''),
    userId:          String(raw.user_id || ''),
    userEmail:       norm(raw.user_email || ''),
    isPaid:          isActivePaid(raw),
    billingInterval: normalizeInterval(raw),
    price:           rawPrice > 0 ? rawPrice : null,
    createdAt:       parseDate(raw.started_at || raw.created_date || raw.current_period_start),
    renewalAt:       parseDate(raw.current_period_end),
    module:          'pipekeeper',
    platform:        normalizePlatform(raw, user),
  };
}

// ─── MRR math ─────────────────────────────────────────────────────────────────

/**
 * MRR contribution for a single normalized subscription:
 *   monthly → full price
 *   annual  → price / 12
 *   null interval or null price → 0
 *
 * @param {object} sub  Normalized subscription
 * @returns {number}
 */
export function mrrContribution(sub) {
  if (!sub.isPaid || sub.price === null) return 0;
  if (sub.billingInterval === 'monthly') return sub.price;
  if (sub.billingInterval === 'annual') return sub.price / 12;
  return 0;
}

/**
 * Compute MRR and ARR from an array of normalized paid subscriptions.
 * Only subs with known billing interval and non-null price contribute.
 *
 * Canonical formula:
 *   totalMRR = Σ mrrContribution(s)   (unrounded internal accumulator)
 *   mrr      = round(totalMRR, 2)     (displayed MRR — single canonical source of truth)
 *   arr      = round(mrr * 12, 2)     (derived from rounded MRR — guarantees display consistency)
 *
 * ARR is always derived from the ROUNDED mrr so that displayed ARR == displayed MRR × 12
 * within normal currency rounding rules (±$0.01).
 *
 * @param {object[]} paidSubs  Normalized subscriptions
 * @returns {{ mrr: number, arr: number }}
 */
export function computeMRRARR(paidSubs) {
  const eligible = paidSubs.filter((s) => s.billingInterval !== null && s.price !== null);
  const totalMRR = eligible.reduce((sum, s) => sum + mrrContribution(s), 0);
  const mrr = parseFloat(totalMRR.toFixed(2));
  const arr = parseFloat((mrr * 12).toFixed(2)); // derived from rounded mrr — ensures display consistency
  return { mrr, arr };
}

// ─── Renewal period math ──────────────────────────────────────────────────────

/**
 * For a calendar range, compute:
 *   customers     = unique user identities with renewal_at in range
 *   subscriptions = count of subs with renewal_at in range
 *   revenue       = sum of actual billed prices (not MRR-normalized)
 *
 * @param {object[]} paidSubs  Normalized subscriptions
 * @param {{ start: Date, end: Date }} range  Calendar range
 * @returns {{ customers: number, subscriptions: number, revenue: number }}
 */
export function calcRenewalPeriod(paidSubs, range) {
  const renewing = paidSubs.filter(
    (s) => s.renewalAt !== null && inRange(s.renewalAt, range)
  );
  const customers = new Set(
    renewing.map((s) => s.userId || s.userEmail).filter(Boolean)
  ).size;
  const revenue = parseFloat(
    renewing.reduce((sum, s) => sum + (s.price ?? 0), 0).toFixed(2)
  );
  return { customers, subscriptions: renewing.length, revenue };
}

// ─── Sanity checks ────────────────────────────────────────────────────────────

/**
 * Run hard assertions on computed metrics.
 * Returns { passed, failures } — never throws.
 *
 * Note: new account counts are NOT expected to be monotonic — calendar week
 * ranges can cross month/quarter boundaries, so week > month is valid.
 *
 * Assertions:
 *   - paidAccounts <= totalAccounts
 *   - arr === mrr * 12 (within $0.01 float tolerance)
 *   - renewing customers <= renewing subscriptions (per period)
 *
 * @param {object} params
 * @returns {{ passed: boolean, failures: string[] }}
 */
export function runSanityChecks(params) {
  const failures = [];
  const { paidAccounts, totalAccounts, mrr, arr } = params;
  const renewals = params.renewals ?? {};
  if (paidAccounts > totalAccounts) {
    failures.push(
      `SANITY_FAIL: paidAccounts(${paidAccounts}) > totalAccounts(${totalAccounts})`
    );
  }
  const expectedArr = parseFloat((mrr * 12).toFixed(2));
  if (Math.abs(arr - expectedArr) > 0.01) {
    failures.push(`SANITY_FAIL: arr(${arr}) !== mrr×12(${expectedArr})`);
  }
  for (const [label, period] of Object.entries(renewals)) {
    if (period && period.customers > period.subscriptions) {
      failures.push(
        `SANITY_FAIL: renewal ${label} — customers(${period.customers}) > subscriptions(${period.subscriptions})`
      );
    }
  }

  return { passed: failures.length === 0, failures };
}
