// Pure classification and dedup logic for subscription contracts.
// Mirrors the logic inlined in base44/functions/getUserSubscriptionReportV3/entry.ts
// so it can be unit-tested. Backend functions are self-contained (cannot be imported),
// so this module is the testable surface; the backend function keeps an identical copy.

export function norm(v) { return String(v ?? '').trim().toLowerCase(); }

export function parseMetricDate(value) {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export const ACTIVE_PAID_STATUSES = new Set(['active', 'paid']);
export const TRIAL_STATUSES = new Set(['trialing', 'trial']);
export const PAST_DUE_STATUSES = new Set(['past_due']);
export const CANCELED_STATUSES = new Set(['canceled']);
export const EXPIRED_STATUSES = new Set(['expired']);

/**
 * Classify a raw subscription status into a canonical normalized status.
 * A row whose billing period has ended is expired — even if the raw status
 * is still "active". This prevents stale contract rows from inflating
 * current-paying counts.
 */
export function classifyStatus(rawStatus, periodEnd, now) {
  const s = norm(rawStatus);
  const pe = periodEnd ? parseMetricDate(periodEnd) : null;
  const withinPeriod = !!(pe && pe >= now);
  if (ACTIVE_PAID_STATUSES.has(s)) return withinPeriod ? 'active_paid' : 'expired';
  if (TRIAL_STATUSES.has(s)) return withinPeriod ? 'trial' : 'expired';
  if (PAST_DUE_STATUSES.has(s)) return 'past_due';
  if (CANCELED_STATUSES.has(s)) return withinPeriod ? 'canceling_but_entitled' : 'canceled';
  if (EXPIRED_STATUSES.has(s)) return 'expired';
  return 'unknown';
}

export function isCurrentlyPaying(normalizedStatus) {
  return normalizedStatus === 'active_paid' || normalizedStatus === 'canceling_but_entitled';
}

export function isCurrentlyEntitled(normalizedStatus) {
  return ['active_paid', 'canceling_but_entitled', 'trial'].includes(normalizedStatus);
}

/**
 * Dedup key: provider + subscription id (or fallback composite key).
 */
export function dedupeKey(contract) {
  const p = norm(contract.provider);
  if (contract.provider_subscription_id) return `${p}|sub|${norm(contract.provider_subscription_id)}`;
  if (contract.original_transaction_id) return `${p}|apple|${norm(contract.original_transaction_id)}`;
  const periodStart = contract.period_start ? String(contract.period_start).slice(0, 10) : 'na';
  return `${p}|${contract.userId}|${norm(contract.product)}|${periodStart}`;
}

/**
 * Score a contract for dedup — prefer currently-paying, then latest period_end
 * (renewal supersedes stale), then data completeness.
 */
export function dedupeScore(r) {
  const pe = r.current_period_end ? parseMetricDate(r.current_period_end)?.getTime() || 0 : 0;
  return (r.is_currently_paying ? 1000000 : 0)
    + (pe || 0)
    + (r.amount ? 400 : 0)
    + (r.billing_interval ? 300 : 0)
    + (r.first_paid_at ? 200 : 0)
    + (r.product && r.product !== 'unknown' ? 100 : 0);
}

/**
 * Deduplicate contracts by subscription lifecycle. When a Subscription fallback
 * row duplicates an ActiveContract row (same provider + subscription id), the
 * higher-scoring row wins. This collapses duplicate lifecycle rows without
 * losing genuine multi-subscription users.
 */
export function deduplicateContracts(contracts) {
  const map = new Map();
  let duplicatesMerged = 0;
  for (const c of contracts) {
    const key = dedupeKey(c);
    const existing = map.get(key);
    if (!existing) { map.set(key, c); continue; }
    duplicatesMerged += 1;
    if (dedupeScore(c) > dedupeScore(existing)) map.set(key, c);
  }
  return { deduped: [...map.values()], duplicatesMerged };
}

/**
 * Coverage key for fallback suppression: email + provider + product family.
 * If an ActiveContract covers this email+provider+product, a Subscription
 * fallback row with the same key is a duplicate lifecycle and can be skipped.
 */
export function fallbackCoverageKey(email, provider, product) {
  return `${norm(email)}|${norm(provider || 'unknown')}|${norm(product || 'unknown')}`;
}

/**
 * Determine whether a Subscription fallback row should be skipped because an
 * ActiveContract already covers the same email+provider+product lifecycle.
 */
export function shouldSkipFallbackSubscription(sub, acCoverageKeys) {
  const email = norm(sub.user_email || sub.email);
  if (!email) return false;
  const provider = norm(sub.provider || 'stripe');
  const product = norm(sub.product || sub.product_kind || 'unknown');
  return acCoverageKeys.has(fallbackCoverageKey(email, provider, product));
}

/**
 * Classify an account as test/internal/admin vs production customer.
 */
export function classifyAccount(email, subscriptionId) {
  const e = norm(email);
  const s = norm(subscriptionId);
  if (e.includes('pipekeepertest') || e.includes('test@pipekeeper') || e === 'admin@pipekeeperapp.com') {
    return 'test_account';
  }
  if (/^test_|_test@|test_sub_|test_12345|test_1771/.test(s + '|' + e)) {
    return 'test_account';
  }
  if (e.startsWith('admin@') || e.includes('+admin@')) {
    return 'internal_admin';
  }
  return 'production_customer';
}