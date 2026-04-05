/**
 * V3 Subscription Report — pure helper functions (no side effects).
 *
 * These are the canonical implementations used for testing.
 * The Deno entry.ts duplicates the same logic inline (Deno cannot import from src/).
 *
 * Field mapping from the Subscription entity:
 *   user_id             → userId
 *   user_email          → userEmail
 *   is_paid             → derived via isActivePaid(raw)
 *   billing_interval / billing_period → billingInterval ('monthly' | 'annual' | null)
 *   amount              → price (null when missing/zero)
 *   started_at || created_date || current_period_start → createdAt
 *   current_period_end  → renewalAt
 *   product             → always 'pipekeeper'
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
 *   product: 'pipekeeper',
 * }
 *
 * @param {object} raw  Raw subscription record
 * @returns {object}    Normalized subscription
 */
export function normalizeSub(raw) {
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
    product:         'pipekeeper',
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
 * @param {object[]} paidSubs  Normalized subscriptions
 * @returns {{ mrr: number, arr: number }}
 */
export function computeMRRARR(paidSubs) {
  const eligible = paidSubs.filter((s) => s.billingInterval !== null && s.price !== null);
  const totalMRR = eligible.reduce((sum, s) => sum + mrrContribution(s), 0);
  const mrr = parseFloat(totalMRR.toFixed(2));
  const arr = parseFloat((totalMRR * 12).toFixed(2));
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
 * Assertions:
 *   - today <= week <= month <= quarter <= year (new account counts)
 *   - paidAccounts <= totalAccounts
 *   - arr === mrr * 12 (within $0.01 float tolerance)
 *   - renewing customers <= renewing subscriptions (per period)
 *
 * @param {object} params
 * @returns {{ passed: boolean, failures: string[] }}
 */
export function runSanityChecks(params) {
  const failures = [];
  const { newAccounts, paidAccounts, totalAccounts, mrr, arr } = params;
  const renewals = params.renewals ?? {};

  if (newAccounts.today > newAccounts.week) {
    failures.push(
      `MONOTONIC_FAIL: today(${newAccounts.today}) > week(${newAccounts.week})`
    );
  }
  if (newAccounts.week > newAccounts.month) {
    failures.push(
      `MONOTONIC_FAIL: week(${newAccounts.week}) > month(${newAccounts.month})`
    );
  }
  if (newAccounts.month > newAccounts.quarter) {
    failures.push(
      `MONOTONIC_FAIL: month(${newAccounts.month}) > quarter(${newAccounts.quarter})`
    );
  }
  if (newAccounts.quarter > newAccounts.year) {
    failures.push(
      `MONOTONIC_FAIL: quarter(${newAccounts.quarter}) > year(${newAccounts.year})`
    );
  }
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
