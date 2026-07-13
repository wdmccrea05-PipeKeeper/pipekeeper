import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// ═══════════════════════════════════════════════════════════════════════════════
// getUserSubscriptionReportV3 — V9 canonical reporting layer
//
// Fixes:
//  - first_paid_at derived from SubscriptionEvent history (not ActiveContract period_start)
//  - status normalized into distinct categories (active_paid, trial, past_due, etc.)
//  - entitlement separated from payment (is_currently_entitled vs is_currently_paying)
//  - active users measured from DailyUserMetrics real activity (not User.updated_date)
//  - identity resolution with synthetic-identity tracking
//  - historical acquisitions preserved after cancellation
//  - date-range-aware historical metrics
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Inlined pure logic (files deploy independently) ──────────────────────────
function norm(v) { return String(v ?? '').trim().toLowerCase(); }
function uniq(arr) { return [...new Set(arr.filter(Boolean))]; }
function parseMetricDate(value) {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}
function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}
function normalizeMetricInterval(value) {
  const n = norm(value);
  if (['month', 'monthly', 'mo'].includes(n)) return 'month';
  if (['year', 'yearly', 'annual', 'yr'].includes(n)) return 'year';
  return null;
}
function toMonthlyRunRate(amount, interval) {
  if (!Number.isFinite(amount)) return 0;
  return interval === 'year' ? amount / 12 : amount;
}

// ─── Date range (timezone-aware) ───────────────────────────────────────────────
// "Today" and all trailing/period ranges are computed in the configured reporting
// timezone (America/Indianapolis), so a UTC instant in the early hours does not roll
// the report over to the next local calendar day. Range bounds are UTC instants that
// correspond to local-day boundaries.
const REPORTING_TIMEZONE = 'America/Indianapolis';
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function tzParts(date, tz) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t)?.value || '0';
  return { year: +get('year'), month: +get('month'), day: +get('day'), hour: +get('hour') % 24, minute: +get('minute'), second: +get('second') };
}
function tzOffsetMinutes(date, tz) {
  const p = tzParts(date, tz);
  const asUtcMs = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtcMs - date.getTime()) / 60000);
}
function startOfDayLocal(date, tz) {
  const p = tzParts(date, tz);
  const noonUtc = new Date(Date.UTC(p.year, p.month - 1, p.day, 12, 0, 0));
  const off = tzOffsetMinutes(noonUtc, tz);
  return new Date(Date.UTC(p.year, p.month - 1, p.day, 0, 0, 0) - off * 60000);
}
function endOfDayLocal(date, tz) { return new Date(startOfDayLocal(date, tz).getTime() + MS_PER_DAY - 1); }
function startOfMonthLocal(date, tz) { const p = tzParts(date, tz); return startOfDayLocal(new Date(Date.UTC(p.year, p.month - 1, 1, 12, 0, 0)), tz); }
function startOfQuarterLocal(date, tz) { const p = tzParts(date, tz); const q = Math.floor((p.month - 1) / 3); return startOfDayLocal(new Date(Date.UTC(p.year, q * 3, 1, 12, 0, 0)), tz); }
function startOfYearLocal(date, tz) { const p = tzParts(date, tz); return startOfDayLocal(new Date(Date.UTC(p.year, 0, 1, 12, 0, 0)), tz); }
function trailingDayStart(now, days, tz) { return startOfDayLocal(new Date(now.getTime() - days * MS_PER_DAY), tz); }
function parseLocalDateBoundary(value, tz, end) {
  if (!value) return null;
  const d = String(value);
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const y = +m[1], mo = +m[2], day = +m[3];
    const noonUtc = new Date(Date.UTC(y, mo - 1, day, 12, 0, 0));
    const off = tzOffsetMinutes(noonUtc, tz);
    const base = Date.UTC(y, mo - 1, day, 0, 0, 0) - off * 60000;
    return end ? new Date(base + MS_PER_DAY - 1) : new Date(base);
  }
  const parsed = parseMetricDate(d);
  if (!parsed) return null;
  return end ? endOfDayLocal(parsed, tz) : startOfDayLocal(parsed, tz);
}
function formatLocalDateTime(date, tz) {
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }).format(date);
}

// Legacy UTC helpers (kept for instant arithmetic).
function startOfDay(d) { const x = new Date(d); x.setUTCHours(0, 0, 0, 0); return x; }
function endOfDay(d) { const x = new Date(d); x.setUTCHours(23, 59, 59, 999); return x; }
function startOfMonth(d) { return startOfDay(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))); }
function startOfQuarter(d) { const q = Math.floor(d.getUTCMonth() / 3); return startOfDay(new Date(Date.UTC(d.getUTCFullYear(), q * 3, 1))); }
function startOfYear(d) { return startOfDay(new Date(Date.UTC(d.getUTCFullYear(), 0, 1))); }
function addDays(d, days) { const x = new Date(d); x.setUTCDate(x.getUTCDate() + days); return x; }

function resolveDateRange(dateRange, startDate, endDate, now, timezone) {
  const tz = timezone || REPORTING_TIMEZONE;
  const todayEnd = endOfDayLocal(now, tz);
  const ranges = {
    today: { start: startOfDayLocal(now, tz), end: todayEnd },
    '7d': { start: trailingDayStart(now, 7, tz), end: todayEnd },
    '30d': { start: trailingDayStart(now, 30, tz), end: todayEnd },
    '90d': { start: trailingDayStart(now, 90, tz), end: todayEnd },
    '365d': { start: trailingDayStart(now, 365, tz), end: todayEnd },
    mtd: { start: startOfMonthLocal(now, tz), end: todayEnd },
    qtd: { start: startOfQuarterLocal(now, tz), end: todayEnd },
    ytd: { start: startOfYearLocal(now, tz), end: todayEnd },
  };
  if (dateRange === 'prior_month') {
    const firstOfThis = startOfMonthLocal(now, tz);
    const endOfPrior = new Date(firstOfThis.getTime() - 1);
    return { start: startOfMonthLocal(endOfPrior, tz), end: endOfDayLocal(endOfPrior, tz) };
  }
  if (dateRange === 'prior_quarter') {
    const firstOfThis = startOfQuarterLocal(now, tz);
    const endOfPrior = new Date(firstOfThis.getTime() - 1);
    return { start: startOfQuarterLocal(endOfPrior, tz), end: endOfDayLocal(endOfPrior, tz) };
  }
  if (dateRange === 'custom') {
    const s = parseLocalDateBoundary(startDate, tz, false);
    const e = parseLocalDateBoundary(endDate, tz, true);
    if (s && e) return { start: s, end: e };
  }
  return ranges[dateRange] || ranges['30d'];
}

function inDateRange(date, range) {
  if (!date) return false;
  return date >= range.start && date <= range.end;
}

// ─── Status classification ──────────────────────────────────────────────────────
const ACTIVE_PAID_STATUSES = new Set(['active', 'paid']);
const TRIAL_STATUSES = new Set(['trialing', 'trial']);
const PAST_DUE_STATUSES = new Set(['past_due']);
const CANCELED_STATUSES = new Set(['canceled']);
const EXPIRED_STATUSES = new Set(['expired']);

function classifyStatus(rawStatus, periodEnd, now) {
  const s = norm(rawStatus);
  const withinPeriod = periodEnd && parseMetricDate(periodEnd) && parseMetricDate(periodEnd) >= now;
  if (ACTIVE_PAID_STATUSES.has(s)) return 'active_paid';
  if (TRIAL_STATUSES.has(s)) return 'trial';
  if (PAST_DUE_STATUSES.has(s)) return 'past_due';
  if (CANCELED_STATUSES.has(s)) return withinPeriod ? 'canceling_but_entitled' : 'canceled';
  if (EXPIRED_STATUSES.has(s)) return 'expired';
  return 'unknown';
}

// ─── Event classification ───────────────────────────────────────────────────────
// Canonical payment-event classifier. A positive amount is supporting evidence,
// never the definition of a successful payment. Refunds, failures, disputes,
// pending/incomplete, and trial events are rejected before any success check.
const REFUND_SLUGS = ['refund', 'refunded', 'chargeback', 'dispute', 'disputed', 'reversal', 'reversed'];
const FAILED_SLUGS = ['payment failed', 'invoice payment failed', 'charge failed', 'card declined', 'declined', 'payment canceled', 'canceled payment', 'void', 'voided'];
const PENDING_SLUGS = ['pending', 'incomplete', 'authorization only', 'authorized only', 'checkout expired', 'payment pending'];
const TRIAL_SLUGS = ['trial', 'trialing'];
const PAYMENT_SUCCESS_SLUGS = ['invoice paid', 'invoice payment succeeded', 'charge succeeded', 'checkout session completed', 'checkout.session.completed', 'initial purchase', 'initial buy', 'initial_purchase', 'repurchase', 'product purchase', 'renewed', 'renewal'];
const LIFECYCLE_SLUGS = ['customer subscription created', 'customer subscription updated', 'subscribed'];
const PAYMENT_EVENT_PATTERNS = PAYMENT_SUCCESS_SLUGS.concat(LIFECYCLE_SLUGS);
const CANCEL_EVENT_PATTERNS = ['subscription.deleted', 'canceled', 'cancel'];
const EXPIRE_EVENT_PATTERNS = ['expired', 'expiration'];

function eventSlug(t) { return norm(t).replace(/[._-]+/g, ' '); }

function classifyPaymentEvent(event) {
  const type = eventSlug(event?.event_type);
  const status = eventSlug(event?.raw_status || event?.status);
  const amount = Number(event?.amount_cents || 0);
  if (REFUND_SLUGS.some((s) => type.includes(s) || status.includes(s))) {
    return { isSuccessfulPayment: false, isRefund: true, reason: 'refund_event' };
  }
  if (FAILED_SLUGS.some((s) => type.includes(s) || status.includes(s))) {
    return { isSuccessfulPayment: false, isRefund: false, reason: 'failed_payment_event' };
  }
  if (PENDING_SLUGS.some((s) => type.includes(s) || status.includes(s))) {
    return { isSuccessfulPayment: false, isRefund: false, reason: 'pending_payment_event' };
  }
  if (TRIAL_SLUGS.some((s) => status.includes(s))) {
    return { isSuccessfulPayment: false, isRefund: false, reason: 'trial_event' };
  }
  if (PAYMENT_SUCCESS_SLUGS.some((s) => type.includes(s))) {
    return { isSuccessfulPayment: true, isRefund: false, reason: 'confirmed_success' };
  }
  if (LIFECYCLE_SLUGS.some((s) => type.includes(s)) && amount > 0) {
    return { isSuccessfulPayment: true, isRefund: false, reason: 'confirmed_success' };
  }
  return { isSuccessfulPayment: false, isRefund: false, reason: 'unrecognized_event' };
}

function isPaymentEvent(e) {
  return classifyPaymentEvent(e).isSuccessfulPayment;
}

function isRefundEvent(e) {
  return classifyPaymentEvent(e).isRefund;
}
function isCancelEvent(e) {
  const t = norm(e?.event_type);
  return CANCEL_EVENT_PATTERNS.some((p) => t.includes(p));
}
function isExpireEvent(e) {
  const t = norm(e?.event_type);
  return EXPIRE_EVENT_PATTERNS.some((p) => t.includes(p));
}

// ─── First paid date resolution ────────────────────────────────────────────────
// Confidence categories (canonical):
//   confirmed_payment_event     — verified successful payment/invoice/purchase/transaction event
//   strong_subscription_evidence — Subscription.first_paid_at / initial_transaction_at / started_at /
//                                  subscriptionStartedAt (subscription start, NOT a verified transaction)
//   inferred_contract_period    — ActiveContract.period_start (may be initial/renewal/migration/backfill)
//   weak_fallback               — record created_date (last resort)
//   unresolved                  — no first-paid date
const FIRST_PAID_DATE_FIELDS = ['transaction_at', 'effective_at', 'period_start', 'ingested_at', 'created_date'];
function firstPaidEventDateField(e) {
  for (const f of FIRST_PAID_DATE_FIELDS) if (parseMetricDate(e[f])) return f;
  return 'transaction_at';
}
function resolveFirstPaidAt(eventsForUser, sub, acRow) {
  const paymentEvents = (eventsForUser || [])
    .filter((e) => isPaymentEvent(e))
    .map((e) => ({ date: parseMetricDate(e.transaction_at) || parseMetricDate(e.effective_at) || parseMetricDate(e.period_start) || parseMetricDate(e.ingested_at) || parseMetricDate(e.created_date), field: firstPaidEventDateField(e), e }))
    .filter((x) => x.date)
    .sort((a, b) => a.date - b.date);
  if (paymentEvents.length > 0) {
    return { date: paymentEvents[0].date, source: 'subscription_event', confidence: 'confirmed',
      confidenceCategory: 'confirmed_payment_event', sourceEntity: 'SubscriptionEvent',
      sourceField: paymentEvents[0].field, possibleAmbiguity: null };
  }
  const firstPaidField = sub?.first_paid_at ? 'first_paid_at' : (sub?.initial_transaction_at ? 'initial_transaction_at' : null);
  const firstPaid = parseMetricDate(sub?.first_paid_at || sub?.initial_transaction_at);
  if (firstPaid) return { date: firstPaid, source: 'subscription_first_paid_at', confidence: 'confirmed',
    confidenceCategory: 'strong_subscription_evidence', sourceEntity: 'Subscription',
    sourceField: firstPaidField, possibleAmbiguity: null };
  const startedField = sub?.started_at ? 'started_at' : (sub?.subscriptionStartedAt ? 'subscriptionStartedAt' : null);
  const subStarted = parseMetricDate(sub?.started_at || sub?.subscriptionStartedAt);
  if (subStarted) return { date: subStarted, source: 'subscription_started_at', confidence: 'confirmed',
    confidenceCategory: 'strong_subscription_evidence', sourceEntity: 'Subscription',
    sourceField: startedField, possibleAmbiguity: 'Subscription start date — reflects activation, not an independently verified payment transaction' };
  const periodField = acRow?.period_start ? 'period_start' : (acRow?.current_period_start ? 'current_period_start' : 'period_start');
  const acPeriodStart = parseMetricDate(acRow?.period_start || acRow?.current_period_start);
  if (acPeriodStart) return { date: acPeriodStart, source: 'period_start_inferred', confidence: 'inferred',
    confidenceCategory: 'inferred_contract_period', sourceEntity: 'ActiveContract',
    sourceField: periodField, possibleAmbiguity: 'Inferred — may represent initial period, renewal, migration, or backfill' };
  const createdFromSub = !!(sub?.created_date || sub?.created_at);
  const created = parseMetricDate(sub?.created_date || sub?.created_at || acRow?.created_date || acRow?.created_at || acRow?.normalized_at);
  if (created) return { date: created, source: 'created_date_inferred', confidence: 'inferred',
    confidenceCategory: 'weak_fallback', sourceEntity: createdFromSub ? 'Subscription' : 'ActiveContract',
    sourceField: 'created_date', possibleAmbiguity: 'Weak fallback — record creation date, not a payment date' };
  return { date: null, source: 'none', confidence: 'none',
    confidenceCategory: 'unresolved', sourceEntity: null, sourceField: null, possibleAmbiguity: null };
}

function resolveLatestPaymentAt(eventsForUser) {
  const dates = (eventsForUser || [])
    .filter((e) => isPaymentEvent(e))
    .map((e) => parseMetricDate(e.transaction_at) || parseMetricDate(e.effective_at) || parseMetricDate(e.period_start) || parseMetricDate(e.ingested_at))
    .filter(Boolean)
    .sort((a, b) => b - a);
  return dates.length > 0 ? dates[0] : null;
}

function resolveCanceledAt(eventsForUser, acRow) {
  const dates = (eventsForUser || [])
    .filter((e) => isCancelEvent(e))
    .map((e) => parseMetricDate(e.ingested_at) || parseMetricDate(e.period_end))
    .filter(Boolean)
    .sort((a, b) => b - a);
  if (dates.length > 0) return dates[0];
  return parseMetricDate(acRow?.canceled_at);
}

function resolveExpiredAt(eventsForUser, acRow, periodEnd) {
  const dates = (eventsForUser || [])
    .filter((e) => isExpireEvent(e))
    .map((e) => parseMetricDate(e.ingested_at) || parseMetricDate(e.period_end))
    .filter(Boolean)
    .sort((a, b) => b - a);
  if (dates.length > 0) return dates[0];
  return parseMetricDate(periodEnd);
}

// ─── Identity resolution ───────────────────────────────────────────────────────
function resolveUserIdentity(row, usersByEmail, usersById) {
  const directUserId = row.user_id || row.userId || row.owner_id || row.account_user_id || null;
  const email = norm(row.user_email || row.email || row.customer_email || row.billing_email || '');
  if (directUserId) {
    const u = usersById.get(String(directUserId));
    if (u) return { userId: String(u.id), email: norm(u.email), matched: true, confidence: 'user_id', synthetic: false };
    return { userId: String(directUserId), email, matched: false, confidence: 'user_id_unmatched', synthetic: false };
  }
  if (email && usersByEmail.has(email)) {
    const u = usersByEmail.get(email);
    return { userId: String(u.id), email, matched: true, confidence: 'email', synthetic: false };
  }
  if (email) return { userId: `email:${email}`, email, matched: false, confidence: 'email_synthetic', synthetic: true };
  return { userId: `row:${row.id}`, email: '', matched: false, confidence: 'row_synthetic', synthetic: true };
}

// ─── Product / module resolution ───────────────────────────────────────────────
const MODULE_ALIASES = {
  pk: 'pipekeeper', pipekeeper: 'pipekeeper', pipe: 'pipekeeper',
  wk: 'whiskeykeeper', whiskeykeeper: 'whiskeykeeper', whiskey: 'whiskeykeeper',
  ck: 'cigarkeeper', cigarkeeper: 'cigarkeeper', cigar: 'cigarkeeper',
  winekeeper: 'winekeeper', wine: 'winekeeper',
};
const KNOWN_MODULES = new Set(['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper']);
const PRODUCT_ALIASES = [
  { family: 'bundle', markers: ['founders_bundle', 'founders', '4_module_bundle', 'four_module_bundle', 'four_module', 'bundle_4', '3_module_bundle', 'three_module_bundle', 'three_module', 'bundle_3'] },
  { family: 'pipekeeper', markers: ['pipekeeper', 'pipe keeper', 'pk'] },
  { family: 'whiskeykeeper', markers: ['whiskeykeeper', 'whiskey keeper', 'wk', 'whiskey'] },
  { family: 'cigarkeeper', markers: ['cigarkeeper', 'cigar keeper', 'ck', 'cigar'] },
  { family: 'winekeeper', markers: ['winekeeper', 'wine keeper', 'wine'] },
];

function resolveFamilyFromMarker(marker) {
  if (!marker) return null;
  for (const { family, markers } of PRODUCT_ALIASES) {
    if (markers.some((m) => marker.includes(m))) return family;
  }
  return null;
}

function resolveProductFamily(row) {
  const candidates = [
    row.product, row.product_kind, row.product_family, row.plan_key, row.plan, row.plan_id,
    row.price_id, row.stripe_price_id, row.apple_product_id, row.productId,
    row.name, row.description, row.bundle_name,
    row.metadata?.product_kind, row.metadata?.product_family,
    row.metadata?.plan_key, row.metadata?.price_id,
  ].map(norm);
  for (const c of candidates) {
    const family = resolveFamilyFromMarker(c);
    if (family) return family;
  }
  const modules = resolveModulesRaw(row, null);
  if (modules.length === 1) return modules[0];
  if (modules.length > 1) return 'bundle';
  return null;
}

function splitCsv(v) {
  return String(v || '').split(',').map((x) => norm(x)).filter(Boolean);
}

function resolveModulesRaw(row, familyHint) {
  if (Array.isArray(row.modules) && row.modules.length > 0) {
    const mapped = row.modules.map((m) => MODULE_ALIASES[norm(m)] || norm(m)).filter((m) => KNOWN_MODULES.has(m));
    if (mapped.length > 0) return uniq(mapped);
  }
  const csvVal = row.modules_csv || row.paid_modules_csv || row.module_csv || row.metadata?.modules_csv || row.metadata?.paid_modules_csv;
  const fromCsv = splitCsv(csvVal).map((m) => MODULE_ALIASES[m] || m).filter((m) => KNOWN_MODULES.has(m));
  if (fromCsv.length > 0) return uniq(fromCsv);
  if (familyHint === 'pipekeeper') return ['pipekeeper'];
  if (familyHint === 'whiskeykeeper') return ['whiskeykeeper'];
  if (familyHint === 'cigarkeeper') return ['cigarkeeper'];
  if (familyHint === 'winekeeper') return ['winekeeper'];
  if (familyHint === 'bundle') {
    const marker = norm(row.bundle_name || row.plan_key || row.product_kind || row.price_id || row.apple_product_id || row.productId || row.product_family || '');
    if (marker.includes('founders')) return ['pipekeeper', 'whiskeykeeper'];
    if (marker.includes('4_module') || marker.includes('four_module') || marker.includes('bundle_4')) return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];
    if (marker.includes('3_module') || marker.includes('three_module') || marker.includes('bundle_3')) return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'];
    return ['pipekeeper', 'whiskeykeeper'];
  }
  return [];
}

function resolveInterval(row) {
  const direct = norm(row.billing_interval || row.billing_period || row.interval || row.plan_interval || row.recurring_interval || row.period || '');
  const di = normalizeMetricInterval(direct);
  if (di) return di;
  const metaFields = [
    row.price_id, row.stripe_price_id, row.apple_product_id, row.plan_key, row.plan_id,
    row.product_kind, row.productId, row.product_family,
    row.metadata?.price_id, row.metadata?.product_kind, row.metadata?.plan_key,
  ].map(norm).join(' ');
  if (['month', 'monthly', 'mo'].some((m) => metaFields.includes(m))) return 'month';
  if (['year', 'yearly', 'annual', 'yr'].some((y) => metaFields.includes(y))) return 'year';
  return null;
}

function parseMoney(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const raw = typeof value === 'string' ? value.replace(/[$,\s]/g, '') : value;
    let n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) continue;
    if (Number.isInteger(n) && n >= 100) n = n / 100;
    if (n <= 0) continue;
    return roundMoney(n);
  }
  return null;
}

function extractFinancials(row) {
  const amount = parseMoney(
    row.amount, row.renewal_amount, row.price, row.billed_amount, row.current_amount,
    row.metadata?.amount, row.metadata?.renewal_amount,
    row.amount_cents != null && Number(row.amount_cents) > 0 ? Number(row.amount_cents) / 100 : null,
  );
  const interval = resolveInterval(row);
  const periodEnd = parseMetricDate(row.period_end || row.current_period_end || row.renewal_date || row.next_billing_date);
  const periodStart = parseMetricDate(row.period_start || row.current_period_start);
  return { amount, interval, periodStart, periodEnd };
}

// ─── Deduplication ─────────────────────────────────────────────────────────────
function dedupeKey(contract) {
  const p = norm(contract.provider);
  if (contract.provider_subscription_id) return `${p}|sub|${norm(contract.provider_subscription_id)}`;
  if (contract.original_transaction_id) return `${p}|apple|${norm(contract.original_transaction_id)}`;
  if (contract.purchase_token) return `${p}|google|${norm(contract.purchase_token)}`;
  const periodStart = contract.period_start ? String(contract.period_start).slice(0, 10) : 'na';
  return `${p}|${contract.userId}|${norm(contract.product)}|${periodStart}`;
}

function deduplicateContracts(contracts) {
  const map = new Map();
  let duplicatesMerged = 0;
  const diagnostics = [];
  for (const c of contracts) {
    const key = dedupeKey(c);
    const existing = map.get(key);
    if (!existing) { map.set(key, c); continue; }
    duplicatesMerged += 1;
    diagnostics.push({ key, kept: existing.canonical_subscription_id, dropped: c.canonical_subscription_id });
    const score = (r) => (r.amount ? 4 : 0) + (r.billing_interval ? 3 : 0) + (r.first_paid_at ? 2 : 0) + (r.product ? 1 : 0);
    if (score(c) > score(existing)) map.set(key, c);
  }
  return { deduped: [...map.values()], duplicatesMerged, diagnostics };
}

// ─── Activity detection ────────────────────────────────────────────────────────
const ACTIVITY_FIELDS = [
  'curator_sessions', 'curator_messages', 'recommendations_shown',
  'recommendations_clicked', 'recommendations_accepted',
  'items_added', 'items_edited', 'exports_generated',
  'valuations_viewed', 'collectible_toggles',
];

function hasRealActivity(metricsRow) {
  return ACTIVITY_FIELDS.some((f) => Number(metricsRow[f] || 0) > 0);
}

function buildActivityIndex(dailyMetrics, usersByEmail) {
  const index = new Map();
  for (const m of dailyMetrics || []) {
    if (!hasRealActivity(m)) continue;
    const email = norm(m.user_email);
    const user = email ? usersByEmail.get(email) : null;
    if (!user) continue;
    const userId = String(user.id);
    const date = parseMetricDate(m.date);
    if (!date) continue;
    if (!index.has(userId)) index.set(userId, { firstActivityAt: date, lastActivityAt: date, activeDates: new Set() });
    const entry = index.get(userId);
    entry.activeDates.add(date.toISOString().slice(0, 10));
    if (date < entry.firstActivityAt) entry.firstActivityAt = date;
    if (date > entry.lastActivityAt) entry.lastActivityAt = date;
  }
  return index;
}

// ─── Fetch helpers ──────────────────────────────────────────────────────────────
const PAGE_SIZE = 100;

async function fetchAll(entity) {
  const out = [];
  let skip = 0;
  while (true) {
    let page = await entity.list(null, PAGE_SIZE, skip);
    if (typeof page === 'string') { try { page = JSON.parse(page); } catch { break; } }
    if (!Array.isArray(page) || page.length === 0) break;
    out.push(...page);
    if (page.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }
  return out;
}

async function fetchAllSafe(entity) {
  try { return await fetchAll(entity); } catch (e) {
    console.warn('[v9] fetch failed:', e?.message || e);
    return [];
  }
}

// ─── Build payment event index ───────────────────────────────────────────────────
function buildEventIndex(subEvents, usersByEmail, usersById) {
  // Returns Map<userId, [events]>  and Map<providerSubId, [events]>
  const byUser = new Map();
  const byProviderSubId = new Map();
  for (const e of subEvents || []) {
    let userId = e.user_id || null;
    const email = norm(e.user_email || e.email || '');
    if (!userId && email && usersByEmail.has(email)) userId = usersByEmail.get(email).id;
    if (userId && usersById.has(String(userId))) userId = usersById.get(String(userId)).id;
    const userKey = userId ? String(userId) : (email ? `email:${email}` : null);
    if (userKey) {
      if (!byUser.has(userKey)) byUser.set(userKey, []);
      byUser.get(userKey).push(e);
    }
    const psubId = norm(e.provider_subscription_id);
    if (psubId) {
      if (!byProviderSubId.has(psubId)) byProviderSubId.set(psubId, []);
      byProviderSubId.get(psubId).push(e);
    }
  }
  return { byUser, byProviderSubId };
}

// ─── Build canonical subscription records ─────────────────────────────────────────
function buildCanonicalContracts(activeContracts, subscriptions, usersByEmail, usersById, eventIndex) {
  const contracts = [];
  const usedSubIds = new Set();

  // Primary: ActiveContract rows
  for (const ac of activeContracts) {
    const identity = resolveUserIdentity(ac, usersByEmail, usersById);
    const provider = norm(ac.provider || 'unknown');
    const family = resolveProductFamily(ac);
    const modules = resolveModulesRaw(ac, family);
    const fin = extractFinancials(ac);
    const psubId = norm(ac.provider_subscription_id);

    // Find matching Subscription for financial fallback + started_at
    let matchedSub = null;
    if (psubId) {
      for (const s of subscriptions) {
        const sSubId = norm(s.provider_subscription_id || s.stripe_subscription_id || s.original_transaction_id);
        if (sSubId === psubId && norm(s.provider || 'stripe') === provider) { matchedSub = s; break; }
      }
    }
    if (!matchedSub && identity.email) {
      for (const s of subscriptions) {
        if (norm(s.user_email || s.email || '') === identity.email && norm(s.provider || 'stripe') === provider) { matchedSub = s; break; }
      }
    }
    if (matchedSub) {
      const sSubId = norm(matchedSub.provider_subscription_id || matchedSub.stripe_subscription_id);
      if (sSubId) usedSubIds.add(`${norm(matchedSub.provider || 'stripe')}|${sSubId}`);
    }

    // Events for this user/provider
    const userEvents = eventIndex.byUser.get(identity.userId) || [];
    const subEvents = psubId ? (eventIndex.byProviderSubId.get(psubId) || []) : [];
    const allEvents = uniqByDate([...userEvents, ...subEvents]);

    const firstPaid = resolveFirstPaidAt(allEvents, matchedSub, ac);
    const latestPayment = resolveLatestPaymentAt(allEvents);
    const canceledAt = resolveCanceledAt(allEvents, ac);
    const expiredAt = resolveExpiredAt(allEvents, ac, fin.periodEnd);
    const periodEnd = fin.periodEnd || parseMetricDate(ac.period_end);
    const normalizedStatus = classifyStatus(ac.status, periodEnd, new Date());

    contracts.push({
      canonical_subscription_id: psubId || String(ac.id),
      userId: identity.userId,
      email: identity.email,
      matched_to_user: identity.matched,
      has_user_id: !!(ac.user_id || ac.userId),
      provider,
      provider_customer_id: ac.provider_customer_id || matchedSub?.stripe_customer_id || null,
      provider_subscription_id: psubId || null,
      original_transaction_id: ac.original_transaction_id || matchedSub?.original_transaction_id || null,
      product: family || 'unknown',
      modules,
      raw_status: norm(ac.status || 'unknown'),
      normalized_status: normalizedStatus,
      is_currently_entitled: ['active_paid', 'canceling_but_entitled', 'trial'].includes(normalizedStatus),
      is_currently_paying: ['active_paid', 'canceling_but_entitled'].includes(normalizedStatus),
      has_successful_payment: !!(firstPaid.date || (ac.amount_cents && Number(ac.amount_cents) > 0)),
      has_ever_paid: !!(firstPaid.date || allEvents.some((e) => isPaymentEvent(e))),
      first_paid_at: firstPaid.date,
      first_paid_source: firstPaid.source,
      first_paid_confidence: firstPaid.confidence,
      first_paid_confidence_category: firstPaid.confidenceCategory,
      first_paid_source_entity: firstPaid.sourceEntity,
      first_paid_source_field: firstPaid.sourceField,
      first_paid_possible_ambiguity: firstPaid.possibleAmbiguity,
      latest_payment_at: latestPayment,
      subscription_created_at: parseMetricDate(matchedSub?.created_date || matchedSub?.created_at || ac.normalized_at),
      current_period_start: fin.periodStart,
      current_period_end: periodEnd,
      canceled_at: canceledAt,
      expired_at: normalizedStatus === 'expired' ? expiredAt : null,
      reactivated_at: null, // computed at user level
      amount: fin.amount,
      billing_interval: fin.interval,
      source_confidence: identity.confidence === 'user_id' && firstPaid.confidence === 'confirmed' ? 'trusted'
        : (firstPaid.confidence === 'inferred' ? 'inferred' : (identity.matched ? 'inferred' : 'exception')),
      reconciliation_issues: [
        ...(!family ? ['unknown_product'] : []),
        ...(!fin.amount ? ['missing_amount'] : []),
        ...(!fin.interval ? ['missing_interval'] : []),
        ...(!firstPaid.date ? ['missing_first_paid_date'] : []),
        ...(!identity.matched ? ['unmatched_identity'] : []),
        ...(identity.synthetic ? ['synthetic_identity'] : []),
      ].filter(Boolean),
    });
  }

  // Fallback: Subscription rows not already covered by ActiveContract
  for (const sub of subscriptions) {
    const sSubId = norm(sub.provider_subscription_id || sub.stripe_subscription_id || sub.original_transaction_id);
    const provider = norm(sub.provider || 'stripe');
    if (sSubId && usedSubIds.has(`${provider}|${sSubId}`)) continue;

    const identity = resolveUserIdentity(sub, usersByEmail, usersById);
    const family = resolveProductFamily(sub);
    const modules = resolveModulesRaw(sub, family);
    const fin = extractFinancials(sub);
    const periodEnd = fin.periodEnd;
    const normalizedStatus = classifyStatus(sub.status, periodEnd, new Date());
    const userEvents = eventIndex.byUser.get(identity.userId) || [];
    const subEvents = sSubId ? (eventIndex.byProviderSubId.get(sSubId) || []) : [];
    const allEvents = uniqByDate([...userEvents, ...subEvents]);

    // CRITICAL FIX: Subscription fallback must populate canonical_started_at from best available source
    const firstPaid = resolveFirstPaidAt(allEvents, sub, null);
    const latestPayment = resolveLatestPaymentAt(allEvents);
    const canceledAt = resolveCanceledAt(allEvents, sub);
    const expiredAt = resolveExpiredAt(allEvents, sub, periodEnd);

    contracts.push({
      canonical_subscription_id: sSubId || String(sub.id),
      userId: identity.userId,
      email: identity.email,
      matched_to_user: identity.matched,
      has_user_id: !!(sub.user_id || sub.userId),
      provider,
      provider_customer_id: sub.stripe_customer_id || null,
      provider_subscription_id: sSubId || null,
      original_transaction_id: sub.original_transaction_id || null,
      product: family || 'unknown',
      modules,
      raw_status: norm(sub.status || 'unknown'),
      normalized_status: normalizedStatus,
      is_currently_entitled: ['active_paid', 'canceling_but_entitled', 'trial'].includes(normalizedStatus),
      is_currently_paying: ['active_paid', 'canceling_but_entitled'].includes(normalizedStatus),
      has_successful_payment: !!(firstPaid.date || (sub.amount && sub.amount > 0)),
      has_ever_paid: !!(firstPaid.date || allEvents.some((e) => isPaymentEvent(e))),
      first_paid_at: firstPaid.date,
      first_paid_source: firstPaid.source,
      first_paid_confidence: firstPaid.confidence,
      first_paid_confidence_category: firstPaid.confidenceCategory,
      first_paid_source_entity: firstPaid.sourceEntity,
      first_paid_source_field: firstPaid.sourceField,
      first_paid_possible_ambiguity: firstPaid.possibleAmbiguity,
      latest_payment_at: latestPayment,
      subscription_created_at: parseMetricDate(sub.created_date || sub.created_at),
      current_period_start: fin.periodStart,
      current_period_end: periodEnd,
      canceled_at: canceledAt,
      expired_at: normalizedStatus === 'expired' ? expiredAt : null,
      reactivated_at: null,
      amount: fin.amount,
      billing_interval: fin.interval,
      source_confidence: identity.matched && firstPaid.confidence === 'confirmed' ? 'trusted' : 'inferred',
      reconciliation_issues: [
        ...(!family ? ['unknown_product'] : []),
        ...(!fin.amount ? ['missing_amount'] : []),
        ...(!fin.interval ? ['missing_interval'] : []),
        ...(!firstPaid.date ? ['missing_first_paid_date'] : []),
        ...(!identity.matched ? ['unmatched_identity'] : []),
        ...(identity.synthetic ? ['synthetic_identity'] : []),
        'subscription_fallback',
      ].filter(Boolean),
    });
  }

  return contracts;
}

function uniqByDate(events) {
  const seen = new Set();
  const out = [];
  for (const e of events) {
    const k = `${norm(e.event_type)}|${norm(e.provider_subscription_id)}|${String(e.ingested_at || e.period_start || e.created_date || '')}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }
  return out;
}

// ─── Build canonical user records ──────────────────────────────────────────────────
function buildCanonicalUsers(users, contracts, activityIndex, eventIndex, entitlements, referralAccess, usersByEmail, usersById, now) {
  // Group contracts by userId
  const contractsByUser = new Map();
  for (const c of contracts) {
    if (!contractsByUser.has(c.userId)) contractsByUser.set(c.userId, []);
    contractsByUser.get(c.userId).push(c);
  }

  // Entitlement lookups
  const entitlementByUserId = new Map();
  for (const e of entitlements) {
    const id = resolveUserIdentity(e, usersByEmail, usersById).userId;
    entitlementByUserId.set(id, e);
  }

  // Referral-earned access by userId
  const referralByUserId = new Map();
  for (const r of referralAccess) {
    const id = resolveUserIdentity(r, usersByEmail, usersById).userId;
    referralByUserId.set(id, r);
  }

  const userRecords = [];
  for (const user of users) {
    const userId = String(user.id);
    const email = norm(user.email);
    const activity = activityIndex.get(userId);
    const userContracts = contractsByUser.get(userId) || [];

    // First paid across all contracts
    const firstPaidCandidates = userContracts.map((c) => c.first_paid_at).filter(Boolean);
    const first_paid_at = firstPaidCandidates.length > 0 ? firstPaidCandidates.sort((a, b) => a - b)[0] : null;
    const firstPaidContract = userContracts.find((c) => c.first_paid_at && c.first_paid_at.getTime() === first_paid_at?.getTime());
    const first_paid_source = firstPaidContract?.first_paid_source || null;
    const first_paid_confidence_category = firstPaidContract?.first_paid_confidence_category || 'unresolved';
    const first_paid_source_entity = firstPaidContract?.first_paid_source_entity || null;
    const first_paid_source_field = firstPaidContract?.first_paid_source_field || null;
    const first_paid_possible_ambiguity = firstPaidContract?.first_paid_possible_ambiguity || null;

    const latestPayments = userContracts.map((c) => c.latest_payment_at).filter(Boolean);
    const latest_payment_at = latestPayments.length > 0 ? latestPayments.sort((a, b) => b - a)[0] : null;

    // Current payment / entitlement flags
    const payingContracts = userContracts.filter((c) => c.is_currently_paying);
    const entitledContracts = userContracts.filter((c) => c.is_currently_entitled);
    const is_currently_paying = payingContracts.length > 0;
    const is_currently_entitled = entitledContracts.length > 0 || !!entitlementByUserId.get(userId)?.has_access || !!referralByUserId.get(userId);
    const is_trial = userContracts.some((c) => c.normalized_status === 'trial');
    const is_past_due = userContracts.some((c) => c.normalized_status === 'past_due');
    const has_canceling_but_entitled = userContracts.some((c) => c.normalized_status === 'canceling_but_entitled');
    const has_expired = userContracts.some((c) => c.normalized_status === 'expired');
    const has_ever_paid = first_paid_at !== null || userContracts.some((c) => c.has_ever_paid);

    // Reactivation: user has ever paid, had a gap, and a new payment after the gap
    let reactivated_at = null;
    if (has_ever_paid && userContracts.length > 0) {
      // Sort contracts by first_paid_at
      const sorted = userContracts.filter((c) => c.first_paid_at).sort((a, b) => a.first_paid_at - b.first_paid_at);
      if (sorted.length >= 2) {
        for (let i = 1; i < sorted.length; i++) {
          const prevEnd = sorted[i - 1].current_period_end || sorted[i - 1].expired_at;
          const currStart = sorted[i].first_paid_at;
          if (prevEnd && currStart && currStart > prevEnd) {
            reactivated_at = currStart;
            break;
          }
        }
      }
    }

    // Activity flags (trailing windows, local-day aware)
    const _todayStartLocal = startOfDayLocal(now, REPORTING_TIMEZONE);
    const active_1d = activity && activity.lastActivityAt >= new Date(_todayStartLocal.getTime() - 1 * MS_PER_DAY);
    const active_7d = activity && activity.lastActivityAt >= trailingDayStart(now, 7, REPORTING_TIMEZONE);
    const active_30d = activity && activity.lastActivityAt >= trailingDayStart(now, 30, REPORTING_TIMEZONE);
    const active_90d = activity && activity.lastActivityAt >= trailingDayStart(now, 90, REPORTING_TIMEZONE);

    const current_provider = payingContracts[0]?.provider || (is_currently_entitled ? (entitlementByUserId.get(userId)?.primary_provider || 'unknown') : null);
    const current_products = uniq(userContracts.filter((c) => c.is_currently_entitled).map((c) => c.product));

    // Data quality
    const reconciliation_issues = [];
    if (userContracts.some((c) => c.reconciliation_issues.includes('unmatched_identity'))) reconciliation_issues.push('unmatched_identity');
    if (userContracts.some((c) => c.reconciliation_issues.includes('missing_first_paid_date'))) reconciliation_issues.push('missing_first_paid_date');
    if (userContracts.some((c) => c.reconciliation_issues.includes('missing_amount'))) reconciliation_issues.push('missing_amount');
    if (userContracts.some((c) => c.reconciliation_issues.includes('missing_interval'))) reconciliation_issues.push('missing_interval');
    if (userContracts.some((c) => c.reconciliation_issues.includes('unknown_product'))) reconciliation_issues.push('unknown_product');
    const has_conflicting_status = userContracts.length > 1 && new Set(userContracts.map((c) => c.normalized_status)).size > 1 && is_currently_paying && is_past_due;
    if (has_conflicting_status) reconciliation_issues.push('conflicting_status');

    userRecords.push({
      user_id: userId,
      email,
      created_at: parseMetricDate(user.created_date),
      account_status: user.is_disabled ? 'disabled' : (user.merged_into_user_id ? 'merged' : 'active'),
      first_real_activity_at: activity?.firstActivityAt || null,
      last_real_activity_at: activity?.lastActivityAt || null,
      active_1d, active_7d, active_30d, active_90d,
      is_currently_entitled,
      is_currently_paying,
      has_ever_paid,
      first_paid_at,
      first_paid_source,
      first_paid_confidence_category,
      first_paid_source_entity,
      first_paid_source_field,
      first_paid_possible_ambiguity,
      latest_payment_at,
      reactivated_at,
      current_provider,
      current_products,
      is_trial,
      is_past_due,
      is_manual_access: false, // would come from a manual grant entity if exists
      is_referral_access: !!referralByUserId.get(userId),
      is_promotional_access: false,
      is_entitlement_only_access: is_currently_entitled && entitledContracts.length === 0 && !referralByUserId.get(userId),
      has_canceling_but_entitled,
      has_expired,
      has_conflicting_status,
      is_synthetic: false,
      data_quality_status: reconciliation_issues.length === 0 ? 'clean' : (reconciliation_issues.includes('unmatched_identity') ? 'exception' : 'inferred'),
      reconciliation_issues,
      _user: user,
    });
  }

  // Add synthetic-identity records (unmatched contracts) for tracking — NOT counted as registered users
  const syntheticUserIds = new Set();
  for (const c of contracts) {
    if (c.userId.startsWith('email:') || c.userId.startsWith('row:')) {
      syntheticUserIds.add(c.userId);
    }
  }
  for (const sid of syntheticUserIds) {
    const sidContracts = contractsByUser.get(sid) || [];
    const first_paid_at = sidContracts.map((c) => c.first_paid_at).filter(Boolean).sort((a, b) => a - b)[0] || null;
    userRecords.push({
      user_id: sid,
      email: sidContracts[0]?.email || '',
      created_at: null,
      account_status: 'synthetic',
      first_real_activity_at: null,
      last_real_activity_at: null,
      active_1d: false, active_7d: false, active_30d: false, active_90d: false,
      is_currently_entitled: sidContracts.some((c) => c.is_currently_entitled),
      is_currently_paying: sidContracts.some((c) => c.is_currently_paying),
      has_ever_paid: sidContracts.some((c) => c.has_ever_paid),
      first_paid_at,
      first_paid_source: sidContracts.find((c) => c.first_paid_at)?.first_paid_source || null,
      latest_payment_at: null,
      reactivated_at: null,
      current_provider: sidContracts[0]?.provider || 'unknown',
      current_products: uniq(sidContracts.map((c) => c.product)),
      is_trial: sidContracts.some((c) => c.normalized_status === 'trial'),
      is_past_due: false,
      is_manual_access: false,
      is_referral_access: false,
      is_promotional_access: false,
      has_canceling_but_entitled: false,
      has_expired: false,
      has_conflicting_status: false,
      is_synthetic: true,
      data_quality_status: 'exception',
      reconciliation_issues: ['unmatched_identity', 'synthetic_identity'],
      _user: null,
    });
  }

  return userRecords;
}

// ─── Metric computation ─────────────────────────────────────────────────────────────
function computeMetrics(userRecords, contracts, users, range, now, duplicatesMerged, refundEvents) {
  const realUsers = userRecords.filter((r) => !r.is_synthetic);
  const totalRegisteredUsers = realUsers.length;
  const newRegisteredUsers = realUsers.filter((r) => inDateRange(r.created_at, range)).length;

  const dau = realUsers.filter((r) => r.active_1d).length;
  const wau = realUsers.filter((r) => r.active_7d).length;
  const mau = realUsers.filter((r) => r.active_30d).length;
  const active90d = realUsers.filter((r) => r.active_90d).length;
  const activeFreeUsers = realUsers.filter((r) => r.active_30d && !r.is_currently_entitled).length;
  const activePayingUsers = realUsers.filter((r) => r.active_30d && r.is_currently_paying).length;

  const currentEntitledUsers = realUsers.filter((r) => r.is_currently_entitled).length;
  const currentPayingUsers = realUsers.filter((r) => r.is_currently_paying).length;
  const currentTrials = realUsers.filter((r) => r.is_trial && !r.is_currently_paying).length;
  const currentPastDue = realUsers.filter((r) => r.is_past_due && !r.is_currently_paying).length;
  const cancelingButEntitled = realUsers.filter((r) => r.has_canceling_but_entitled).length;
  const expiredUsers = realUsers.filter((r) => r.has_expired && !r.is_currently_paying).length;

  // Historical acquisition metrics (within selected date range)
  const newFirstTimePaidUsers = realUsers.filter((r) => r.first_paid_at && inDateRange(r.first_paid_at, range)).length;
  const confirmedFirstTimePaidUsers = realUsers.filter((r) => r.first_paid_at && inDateRange(r.first_paid_at, range) && r.first_paid_confidence_category === 'confirmed_payment_event').length;
  const inferredFirstTimePaidUsers = newFirstTimePaidUsers - confirmedFirstTimePaidUsers;
  const reactivatedPaidUsers = realUsers.filter((r) => r.reactivated_at && inDateRange(r.reactivated_at, range)).length;
  const newPaidSubscriptions = contracts.filter((c) => c.first_paid_at && inDateRange(c.first_paid_at, range)).length;
  const canceledSubscriptions = contracts.filter((c) => c.canceled_at && inDateRange(c.canceled_at, range)).length;
  const expiredSubscriptions = contracts.filter((c) => c.expired_at && inDateRange(c.expired_at, range)).length;

  // Refund accounting — refunds never count as successful payments. Tracked separately
  // so the report can distinguish gross acquisition from net retained acquisition.
  const refundedEventsInRange = (refundEvents || []).filter((e) =>
    inDateRange(parseMetricDate(e.transaction_at) || parseMetricDate(e.effective_at) || parseMetricDate(e.period_start) || parseMetricDate(e.ingested_at) || parseMetricDate(e.created_date), range)
  );
  const refundedUserKeys = new Set(refundedEventsInRange.map((e) => e.user_id || e.user_email).filter(Boolean));
  const refundedFirstTimePaidUsers = refundedUserKeys.size || refundedEventsInRange.length;
  const refundedSubscriptions = refundedEventsInRange.length;
  const grossFirstTimePaidUsers = newFirstTimePaidUsers;
  const netRetainedFirstTimePaidUsers = Math.max(0, grossFirstTimePaidUsers - refundedFirstTimePaidUsers);
  const grossPaidSubscriptions = newPaidSubscriptions;
  const netPaidSubscriptions = Math.max(0, grossPaidSubscriptions - refundedSubscriptions);

  // ─── Cohort-based conversion (fix: never mix historical numerator with current-state denominator) ──
  const ATTRIBUTION_WINDOW_DAYS = 30;

  // Registration cohort: of users who registered during the period, what % first-paid within the attribution window
  const usersRegisteredInRange = realUsers.filter((r) => inDateRange(r.created_at, range));
  const convertedRegistrants = usersRegisteredInRange.filter((r) =>
    r.first_paid_at && r.created_at &&
    r.first_paid_at >= r.created_at &&
    r.first_paid_at <= addDays(r.created_at, ATTRIBUTION_WINDOW_DAYS)
  );
  const registrationCohortConversion = usersRegisteredInRange.length >= 5
    ? roundMoney((convertedRegistrants.length / usersRegisteredInRange.length) * 100)
    : null;

  // Existing free-user conversion: users who existed and had NOT yet paid at period start, who first-paid during the period
  const eligibleFreeAtStart = realUsers.filter((r) =>
    r.created_at && r.created_at < range.start &&
    (!r.first_paid_at || r.first_paid_at >= range.start)
  );
  const convertedFromFree = eligibleFreeAtStart.filter((r) =>
    r.first_paid_at && inDateRange(r.first_paid_at, range)
  );
  const existingFreeUserConversion = eligibleFreeAtStart.length >= 5
    ? roundMoney((convertedFromFree.length / eligibleFreeAtStart.length) * 100)
    : null;

  // Paid acquisition rate (broad, explicitly NOT a conversion rate): new first-time paid / all registered
  const paidAcquisitionRate = totalRegisteredUsers > 0
    ? roundMoney((newFirstTimePaidUsers / totalRegisteredUsers) * 100)
    : null;

  // Legacy aliases (deprecated — kept for UI backward compat) now backed by proper cohorts
  const freeToPaidConversionRate = existingFreeUserConversion;
  const registrationToPaidConversionRate = registrationCohortConversion;

  // Provider breakdown (paying + entitled)
  const providerBreakdown = {};
  for (const p of ['stripe', 'apple', 'google', 'manual', 'unknown']) {
    providerBreakdown[p] = { paying: 0, entitled: 0 };
  }
  for (const r of realUsers) {
    const p = r.current_provider || 'unknown';
    if (!providerBreakdown[p]) providerBreakdown[p] = { paying: 0, entitled: 0 };
    if (r.is_currently_paying) providerBreakdown[p].paying += 1;
    if (r.is_currently_entitled) providerBreakdown[p].entitled += 1;
  }

  // Product breakdown
  const productBreakdown = {};
  for (const p of ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper', 'bundle']) {
    productBreakdown[p] = { paying: 0, entitled: 0 };
  }
  for (const r of realUsers) {
    for (const prod of (r.current_products || [])) {
      if (!productBreakdown[prod]) productBreakdown[prod] = { paying: 0, entitled: 0 };
      if (r.is_currently_paying) productBreakdown[prod].paying += 1;
      if (r.is_currently_entitled) productBreakdown[prod].entitled += 1;
    }
  }

  // Data quality
  const dataQuality = {
    unmatchedSubscriptions: contracts.filter((c) => !c.matched_to_user).length,
    subscriptionsWithoutUserIds: contracts.filter((c) => !c.has_user_id).length,
    duplicateContracts: duplicatesMerged,
    conflictingStatuses: realUsers.filter((r) => r.has_conflicting_status).length,
    missingFirstPaidDate: contracts.filter((c) => !c.first_paid_at).length,
    missingAmount: contracts.filter((c) => !c.amount).length,
    missingInterval: contracts.filter((c) => !c.billing_interval).length,
    unknownProduct: contracts.filter((c) => !c.product || c.product === 'unknown').length,
    unknownProvider: contracts.filter((c) => !c.provider || c.provider === 'unknown').length,
    invalidDates: contracts.filter((c) => c.first_paid_at && c.current_period_end && c.first_paid_at > c.current_period_end).length,
    syntheticIdentities: userRecords.filter((r) => r.is_synthetic).length,
  };

  return {
    userActivity: { totalRegisteredUsers, newRegisteredUsers, dau, wau, mau, active90d, activeFreeUsers, activePayingUsers },
    subscriptionStatus: { currentEntitledUsers, currentPayingUsers, currentTrials, currentPastDue, cancelingButEntitled, expiredUsers },
    acquisition: {
      newFirstTimePaidUsers, confirmedFirstTimePaidUsers, inferredFirstTimePaidUsers, reactivatedPaidUsers, newPaidSubscriptions, canceledSubscriptions, expiredSubscriptions,
      grossFirstTimePaidUsers, refundedFirstTimePaidUsers, netRetainedFirstTimePaidUsers,
      grossPaidSubscriptions, refundedSubscriptions, netPaidSubscriptions,
      registrationCohortConversion,
      registrationCohortNumerator: convertedRegistrants.length,
      registrationCohortDenominator: usersRegisteredInRange.length,
      existingFreeUserConversion,
      existingFreeNumerator: convertedFromFree.length,
      existingFreeDenominator: eligibleFreeAtStart.length,
      paidAcquisitionRate,
      attributionWindowDays: ATTRIBUTION_WINDOW_DAYS,
      freeToPaidConversionRate, registrationToPaidConversionRate,
    },
    providerBreakdown,
    productBreakdown,
    dataQuality,
  };
}

// ─── Refund metric computation (inlined from reconciliationEngine) ───────────────
function linkRefundToOriginalPaymentInline(refundEvent, paymentEvents) {
  const candidates = (paymentEvents || []).filter((e) => isPaymentEvent(e));
  if (candidates.length === 0) return { matched: false, original: null };
  const explicitRef = norm(refundEvent.original_transaction_id || refundEvent.provider_transaction_id);
  if (explicitRef) {
    const hit = candidates.find((e) => norm(e.provider_transaction_id) === explicitRef || norm(e.original_transaction_id) === explicitRef);
    if (hit) return { matched: true, original: hit };
  }
  const subId = norm(refundEvent.provider_subscription_id);
  if (subId) {
    const hits = candidates.filter((e) => norm(e.provider_subscription_id) === subId);
    if (hits.length === 1) return { matched: true, original: hits[0] };
    if (hits.length > 1) {
      const refundDate = parseMetricDate(refundEvent.transaction_at || refundEvent.effective_at) || new Date();
      const before = hits.filter((e) => { const d = parseMetricDate(e.transaction_at || e.effective_at); return d && d <= refundDate; }).sort((a, b) => parseMetricDate(b.transaction_at) - parseMetricDate(a.transaction_at));
      if (before.length === 1) return { matched: true, original: before[0] };
    }
  }
  const custId = norm(refundEvent.provider_customer_id);
  if (custId) {
    const hits = candidates.filter((e) => norm(e.provider_customer_id) === custId);
    if (hits.length === 1) return { matched: true, original: hits[0] };
  }
  return { matched: false, original: null };
}
function computeRefundMetricsInline(refundEvents, paymentEvents, range) {
  const refundsInPeriod = (refundEvents || []).filter((e) => {
    const d = parseMetricDate(e.transaction_at || e.effective_at || e.period_start);
    return d && inDateRange(d, range);
  });
  let refundAmountInPeriod = 0, firstPurchaseRefunds = 0, renewalRefunds = 0, priorPeriodRefunds = 0;
  let partialRefunds = 0, fullRefunds = 0, disputes = 0, chargebacks = 0;
  for (const r of refundsInPeriod) {
    const amt = Math.abs(Number(r.refund_amount_cents || r.amount_cents || 0));
    refundAmountInPeriod += amt;
    if (['chargeback_open', 'chargeback_won', 'chargeback_lost', 'dispute_open', 'dispute_closed'].includes(r.normalized_event_type)) chargebacks += 1;
    if (norm(r.dispute_status) && norm(r.dispute_status) !== 'none') disputes += 1;
    const link = linkRefundToOriginalPaymentInline(r, paymentEvents);
    if (!link.matched) continue;
    const orig = link.original;
    const origDate = parseMetricDate(orig.transaction_at || orig.effective_at);
    const refundAmt = Math.abs(Number(r.refund_amount_cents || r.amount_cents || 0));
    const origAmt = Math.abs(Number(orig.amount_cents || 0));
    const isFull = origAmt > 0 && refundAmt >= origAmt;
    if (isFull) fullRefunds += 1; else partialRefunds += 1;
    const origEventsForUser = (paymentEvents || []).filter((e) => (orig.user_id && e.user_id === orig.user_id) || (norm(orig.user_email) && norm(e.user_email) === norm(orig.user_email)));
    const sortedOrig = origEventsForUser.filter((e) => parseMetricDate(e.transaction_at || e.effective_at)).sort((a, b) => parseMetricDate(a.transaction_at) - parseMetricDate(b.transaction_at));
    const isOriginalInitial = sortedOrig.length > 0 && sortedOrig[0].event_id === orig.event_id;
    const origInPeriod = origDate && inDateRange(origDate, range);
    if (origInPeriod && isOriginalInitial && isFull) firstPurchaseRefunds += 1;
    else if (origInPeriod && !isOriginalInitial) renewalRefunds += 1;
    else if (!origInPeriod) priorPeriodRefunds += 1;
  }
  return {
    refunds_occurred_in_period: refundsInPeriod.length,
    refund_amount_occurred_in_period: roundMoney(refundAmountInPeriod / 100),
    first_purchase_refunds_for_acquisitions_in_period: firstPurchaseRefunds,
    renewal_refunds_in_period: renewalRefunds,
    refunds_of_purchases_from_prior_periods: priorPeriodRefunds,
    partially_refunded_transactions: partialRefunds,
    fully_refunded_transactions: fullRefunds,
    disputed_transactions: disputes,
    chargebacks,
  };
}

// ─── Revenue / run-rate ──────────────────────────────────────────────────────────
function periodRange(kind, now, tz) {
  const _tz = tz || REPORTING_TIMEZONE;
  if (kind === 'week') {
    const start = startOfDayLocal(now, _tz);
    const parts = tzParts(start, _tz);
    const dow = parts.day; // not used; recompute weekday from instant
    const jsDay = new Date(start.getTime() + 12 * 3600000).getUTCDay();
    const fromMonday = jsDay === 0 ? 6 : jsDay - 1;
    const weekStart = new Date(start.getTime() - fromMonday * MS_PER_DAY);
    return { start: weekStart, end: new Date(weekStart.getTime() + 7 * MS_PER_DAY - 1) };
  }
  if (kind === 'month') {
    const s = startOfMonthLocal(now, _tz);
    const p = tzParts(new Date(s.getTime() + 15 * MS_PER_DAY), _tz);
    const nextMonthStart = startOfDayLocal(new Date(Date.UTC(p.year, p.month, 15, 12, 0, 0)), _tz);
    return { start: s, end: new Date(nextMonthStart.getTime() - 1) };
  }
  if (kind === 'quarter') {
    const s = startOfQuarterLocal(now, _tz);
    const p = tzParts(new Date(s.getTime() + 45 * MS_PER_DAY), _tz);
    const q = Math.floor((p.month - 1) / 3);
    const nextQStart = startOfDayLocal(new Date(Date.UTC(p.year, q * 3 + 3, 1, 12, 0, 0)), _tz);
    return { start: s, end: new Date(nextQStart.getTime() - 1) };
  }
  const s = startOfYearLocal(now, _tz);
  const p = tzParts(new Date(s.getTime() + 180 * MS_PER_DAY), _tz);
  const nextYearStart = startOfDayLocal(new Date(Date.UTC(p.year + 1, 0, 1, 12, 0, 0)), _tz);
  return { start: s, end: new Date(nextYearStart.getTime() - 1) };
}

// ─── Main handler ──────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me || me.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    let body = {};
    try { body = await req.json(); } catch {}
    const { dateRange, startDate, endDate } = body;
    const reportingTimezone = REPORTING_TIMEZONE;
    const now = new Date();
    const range = resolveDateRange(dateRange, startDate, endDate, now, reportingTimezone);

    const [rawUsers, rawDailyMetrics, rawSubEvents, rawSubscriptions, rawActiveContracts, rawEntitlements, rawReferralAccess, rawSyncHealthRows] = await Promise.all([
      fetchAllSafe(base44.asServiceRole.entities.User),
      fetchAllSafe(base44.asServiceRole.entities.DailyUserMetrics),
      fetchAllSafe(base44.asServiceRole.entities.SubscriptionEvent),
      fetchAllSafe(base44.asServiceRole.entities.Subscription),
      fetchAllSafe(base44.asServiceRole.entities.ActiveContract),
      fetchAllSafe(base44.asServiceRole.entities.UserEntitlement),
      fetchAllSafe(base44.asServiceRole.entities.ReferralEarnedAccess),
      fetchAllSafe(base44.asServiceRole.entities.ProviderSyncHealth),
    ]);
    const rawSyncHealth = (rawSyncHealthRows || []).find((h) => norm(h.provider) === 'stripe') || (rawSyncHealthRows || [])[0] || null;

    console.log(`[v9] Users: ${rawUsers.length}, DailyMetrics: ${rawDailyMetrics.length}, SubEvents: ${rawSubEvents.length}, Subscriptions: ${rawSubscriptions.length}, ActiveContracts: ${rawActiveContracts.length}, Entitlements: ${rawEntitlements.length}, ReferralAccess: ${rawReferralAccess.length}`);

    // Filter registered users
    const users = rawUsers.filter((u) => !u.is_disabled && !u.merged_into_user_id);
    const usersByEmail = new Map(users.map((u) => [norm(u.email), u]));
    const usersById = new Map(users.map((u) => [String(u.id), u]));

    // Build indexes
    const activityIndex = buildActivityIndex(rawDailyMetrics, usersByEmail);
    const eventIndex = buildEventIndex(rawSubEvents, usersByEmail, usersById);

    // Build canonical contracts
    const allContracts = buildCanonicalContracts(rawActiveContracts, rawSubscriptions, usersByEmail, usersById, eventIndex);
    const { deduped: contracts, duplicatesMerged, diagnostics: dedupeDiag } = deduplicateContracts(allContracts);

    // Build canonical user records
    const userRecords = buildCanonicalUsers(users, contracts, activityIndex, eventIndex, rawEntitlements, rawReferralAccess, usersByEmail, usersById, now);

    // Compute metrics
    const refundedEvents = rawSubEvents.filter((e) => isRefundEvent(e));
    const metrics = computeMetrics(userRecords, contracts, users, range, now, duplicatesMerged, refundedEvents);

    // Revenue (from currently-paying contracts with amount+interval)
    const payingContracts = contracts.filter((c) => c.is_currently_paying && c.amount && c.billing_interval);
    const mrr = roundMoney(payingContracts.reduce((s, c) => s + toMonthlyRunRate(c.amount, c.billing_interval), 0));
    const arr = roundMoney(mrr * 12);

    const byProduct = {};
    for (const p of ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper', 'bundle']) byProduct[p] = 0;
    for (const c of payingContracts) { if (c.product && byProduct[c.product] !== undefined) byProduct[c.product] += 1; }

    // Renewals
    const renewals = {};
    for (const kind of ['week', 'month', 'quarter', 'year']) {
      const r = periodRange(kind, now, reportingTimezone);
      const rows = payingContracts.filter((c) => c.current_period_end && inDateRange(c.current_period_end, r));
      renewals[kind] = {
        customers: uniq(rows.map((c) => c.userId)).length,
        subscriptions: rows.length,
        revenue: roundMoney(rows.reduce((s, c) => s + (c.amount || 0), 0)),
      };
    }

    // Audit tables
    const auditUsers = userRecords.map((r) => ({
      user_id: r.user_id,
      email: r.email,
      created_at: r.created_at?.toISOString() || null,
      last_real_activity: r.last_real_activity_at?.toISOString() || null,
      current_entitlement: r.is_currently_entitled,
      current_payment_status: r.is_currently_paying ? 'paying' : (r.is_trial ? 'trial' : (r.is_past_due ? 'past_due' : (r.has_expired ? 'expired' : 'none'))),
      provider: r.current_provider || '-',
      products: (r.current_products || []).join(', ') || '-',
      first_paid_at: r.first_paid_at?.toISOString() || null,
      first_paid_source: r.first_paid_source || '-',
      first_paid_confidence_category: r.first_paid_confidence_category || 'unresolved',
      first_paid_source_entity: r.first_paid_source_entity || null,
      first_paid_source_field: r.first_paid_source_field || null,
      first_paid_possible_ambiguity: r.first_paid_possible_ambiguity || null,
      latest_payment: r.latest_payment_at?.toISOString() || null,
      current_period_end: contracts.find((c) => c.userId === r.user_id && c.is_currently_paying)?.current_period_end?.toISOString() || null,
      canceled_at: contracts.find((c) => c.userId === r.user_id)?.canceled_at?.toISOString() || null,
      amount: contracts.find((c) => c.userId === r.user_id && c.is_currently_paying)?.amount || null,
      interval: contracts.find((c) => c.userId === r.user_id && c.is_currently_paying)?.billing_interval || null,
      matching_confidence: r.is_synthetic ? 'synthetic' : (r.reconciliation_issues.includes('unmatched_identity') ? 'unmatched' : 'matched'),
      data_quality_status: r.data_quality_status,
      reconciliation_issue: r.reconciliation_issues.join(', ') || 'none',
      is_synthetic: r.is_synthetic,
    })).sort((a, b) => String(a.email).localeCompare(String(b.email)));

    const auditSubscriptions = contracts.map((c) => ({
      canonical_subscription_id: c.canonical_subscription_id,
      user_id: c.userId,
      email: c.email,
      provider: c.provider,
      provider_customer_id: c.provider_customer_id || '-',
      provider_subscription_id: c.provider_subscription_id || '-',
      original_transaction_id: c.original_transaction_id || '-',
      product: c.product,
      modules: c.modules.join(', ') || '-',
      normalized_status: c.normalized_status,
      is_currently_entitled: c.is_currently_entitled,
      is_currently_paying: c.is_currently_paying,
      has_successful_payment: c.has_successful_payment,
      first_paid_at: c.first_paid_at?.toISOString() || null,
      first_paid_source: c.first_paid_source,
      first_paid_confidence: c.first_paid_confidence,
      first_paid_confidence_category: c.first_paid_confidence_category || 'unresolved',
      first_paid_source_entity: c.first_paid_source_entity || null,
      first_paid_source_field: c.first_paid_source_field || null,
      first_paid_possible_ambiguity: c.first_paid_possible_ambiguity || null,
      latest_payment_at: c.latest_payment_at?.toISOString() || null,
      current_period_start: c.current_period_start?.toISOString() || null,
      current_period_end: c.current_period_end?.toISOString() || null,
      canceled_at: c.canceled_at?.toISOString() || null,
      expired_at: c.expired_at?.toISOString() || null,
      amount: c.amount ?? null,
      billing_interval: c.billing_interval || '-',
      source_confidence: c.source_confidence,
      matched_to_user: c.matched_to_user,
      reconciliation_issues: c.reconciliation_issues.join(', ') || 'none',
    }));

    // Paying users list (backward compat)
    const payingUsersList = userRecords
      .filter((r) => r.is_currently_paying)
      .map((r) => {
        const userContracts = contracts.filter((c) => c.userId === r.user_id);
        return {
          userKey: r.user_id,
          email: r.email,
          canonicalProduct: (r.current_products || []).join(', ') || '-',
          modules: uniq(userContracts.flatMap((c) => c.modules)),
          status: 'paying_user',
          subscriptionCount: userContracts.length,
          totalAmount: roundMoney(userContracts.reduce((s, c) => s + (c.amount || 0), 0)),
          intervals: uniq(userContracts.map((c) => c.billing_interval).filter(Boolean)),
          financialSources: uniq(userContracts.map((c) => c.first_paid_source)),
        };
      })
      .sort((a, b) => String(a.email).localeCompare(String(b.email)));

    // Excluded records detail
    const excludedRecords = contracts
      .filter((c) => c.reconciliation_issues.length > 0)
      .map((c) => ({ record: c.canonical_subscription_id, user_email: c.email, issues: c.reconciliation_issues, reason: c.reconciliation_issues.join(', ') }))
      .slice(0, 50);

    // ─── Reconciliation detail tables (admin-only) ────────────────────────────
    const realRecords = userRecords.filter((r) => !r.is_synthetic);

    // (6) The new first-time paid users — full evidence with confidence categories
    const newFirstTimePaidUsersDetail = realRecords
      .filter((r) => r.first_paid_at && inDateRange(r.first_paid_at, range))
      .map((r) => {
        const userContracts = contracts.filter((c) => c.userId === r.user_id);
        const firstContract = userContracts.find((c) => c.first_paid_at && c.first_paid_at.getTime() === r.first_paid_at.getTime()) || userContracts[0];
        return {
          user_id: r.user_id,
          email: r.email,
          registration_date: r.created_at?.toISOString() || null,
          reported_first_paid_date: r.first_paid_at?.toISOString() || null,
          source_field: r.first_paid_source_field || (r.first_paid_source || '-'),
          source_entity: r.first_paid_source_entity || null,
          source_key: r.first_paid_source || '-',
          provider: firstContract?.provider || r.current_provider || '-',
          product: (r.current_products || []).join(', ') || (firstContract?.product || '-'),
          current_status: firstContract?.normalized_status || '-',
          current_entitlement: r.is_currently_entitled ? 'entitled' : 'none',
          confidence_category: r.first_paid_confidence_category || 'unresolved',
          possible_ambiguity: r.first_paid_possible_ambiguity || null,
          provider_subscription_id: firstContract?.provider_subscription_id || '-',
          amount: firstContract?.amount ?? null,
          billing_interval: firstContract?.billing_interval || '-',
          later_canceled: !!firstContract?.canceled_at || userContracts.some((c) => c.normalized_status === 'canceled' || c.normalized_status === 'expired'),
          is_confirmed_payment_event: r.first_paid_confidence_category === 'confirmed_payment_event',
          reason: r.first_paid_confidence_category === 'confirmed_payment_event'
            ? 'Confirmed by a verified successful payment event within the selected range'
            : r.first_paid_confidence_category === 'strong_subscription_evidence'
              ? 'Inferred from subscription start/first-paid date — strong evidence, not an independently verified payment transaction'
              : r.first_paid_confidence_category === 'inferred_contract_period'
                ? 'Inferred from ActiveContract.period_start — may represent initial period, renewal, migration, or backfill'
                : r.first_paid_confidence_category === 'weak_fallback'
                  ? 'Inferred from record creation date (weak fallback)'
                  : 'No first-paid date resolved',
        };
      })
      .sort((a, b) => (a.reported_first_paid_date || '').localeCompare(b.reported_first_paid_date || ''));

    // (9) The new paid subscriptions — why N users produced M subscriptions
    const newPaidSubscriptionsDetail = contracts
      .filter((c) => c.first_paid_at && inDateRange(c.first_paid_at, range))
      .map((c) => {
        const userContracts = contracts.filter((x) => x.userId === c.userId).filter((x) => x.first_paid_at).sort((a, b) => a.first_paid_at - b.first_paid_at);
        const isFirstForUser = userContracts[0]?.canonical_subscription_id === c.canonical_subscription_id;
        const cat = c.first_paid_confidence_category || 'unresolved';
        return {
          canonical_subscription_id: c.canonical_subscription_id,
          user_id: c.userId,
          email: c.email,
          provider: c.provider,
          product: c.product,
          first_paid_at: c.first_paid_at?.toISOString() || null,
          confidence_category: cat,
          payment_confirmation: cat === 'confirmed_payment_event' ? 'confirmed' : 'inferred',
          is_users_first_paid_subscription: isFirstForUser,
          is_additional_module: userContracts.length > 1 && !isFirstForUser,
          is_migrated_or_duplicate: c.reconciliation_issues.includes('subscription_fallback') && userContracts.length > 1 && !isFirstForUser,
          deduplication_key: dedupeKey(c),
          inclusion_reason: cat === 'confirmed_payment_event'
            ? 'Confirmed first payment from a verified payment event within the selected range'
            : cat === 'strong_subscription_evidence'
              ? 'Inferred from subscription start/first-paid date (strong evidence, no verified payment event)'
              : cat === 'inferred_contract_period'
                ? 'Inferred from ActiveContract.period_start (may be initial/renewal/migration/backfill)'
                : cat === 'weak_fallback'
                  ? 'Inferred from record creation date (weak fallback)'
                  : 'No first-paid date resolved',
        };
      })
      .sort((a, b) => (a.first_paid_at || '').localeCompare(b.first_paid_at || ''));

    // (10) The 3 reactivations
    const reactivatedPaidUsersDetail = realRecords
      .filter((r) => r.reactivated_at && inDateRange(r.reactivated_at, range))
      .map((r) => {
        const userContracts = contracts.filter((c) => c.userId === r.user_id).filter((c) => c.first_paid_at).sort((a, b) => a.first_paid_at - b.first_paid_at);
        const first = userContracts[0];
        const priorEnd = userContracts.length >= 2 ? (userContracts[0].current_period_end || userContracts[0].expired_at) : null;
        const reactivationContract = userContracts.find((c) => c.first_paid_at && c.first_paid_at.getTime() === r.reactivated_at.getTime());
        return {
          user_id: r.user_id,
          email: r.email,
          original_first_paid_at: first?.first_paid_at?.toISOString() || r.first_paid_at?.toISOString() || null,
          prior_expiration_or_cancellation: priorEnd?.toISOString() || null,
          unpaid_lapse_days: (priorEnd && r.reactivated_at) ? Math.round((r.reactivated_at - priorEnd) / 86400000) : null,
          reactivation_at: r.reactivated_at?.toISOString() || null,
          reactivation_payment_event: reactivationContract?.first_paid_source || '-',
          provider: reactivationContract?.provider || r.current_provider || '-',
          product: reactivationContract?.product || '-',
          classification_reason: 'New payment after the prior billing period ended (lapse beyond grace) — classified as reactivation, not renewal. Minimum lapse required = payment start strictly after prior period_end.',
        };
      });

    // (12) First-paid evidence hierarchy summary — per canonical confidence category
    const newFirstTimePaidInRange = realRecords.filter((r) => r.first_paid_at && inDateRange(r.first_paid_at, range));
    const firstPaidEvidenceSummary = {
      confirmed_payment_event: newFirstTimePaidInRange.filter((r) => r.first_paid_confidence_category === 'confirmed_payment_event').length,
      strong_subscription_evidence: newFirstTimePaidInRange.filter((r) => r.first_paid_confidence_category === 'strong_subscription_evidence').length,
      inferred_contract_period: newFirstTimePaidInRange.filter((r) => r.first_paid_confidence_category === 'inferred_contract_period').length,
      weak_fallback: newFirstTimePaidInRange.filter((r) => r.first_paid_confidence_category === 'weak_fallback').length,
      unresolved: newFirstTimePaidInRange.filter((r) => r.first_paid_confidence_category === 'unresolved' || !r.first_paid_confidence_category).length,
      // legacy fields (kept for backward compatibility)
      confirmed: newFirstTimePaidInRange.filter((r) => r.first_paid_confidence === 'confirmed').length,
      inferred: newFirstTimePaidInRange.filter((r) => r.first_paid_confidence === 'inferred').length,
      missing: contracts.filter((c) => !c.first_paid_at).length,
    };
    firstPaidEvidenceSummary.totalInferred = firstPaidEvidenceSummary.strong_subscription_evidence + firstPaidEvidenceSummary.inferred_contract_period + firstPaidEvidenceSummary.weak_fallback;

    // (8) Entitlement reconciliation — explains entitled vs paying difference
    const entitledNotPaying = realRecords.filter((r) => r.is_currently_entitled && !r.is_currently_paying);
    const entitlementReconciliation = {
      paying: realRecords.filter((r) => r.is_currently_paying).length,
      trial: entitledNotPaying.filter((r) => r.is_trial).length,
      referral_access: entitledNotPaying.filter((r) => r.is_referral_access).length,
      manual_access: entitledNotPaying.filter((r) => r.is_manual_access).length,
      promotional_access: entitledNotPaying.filter((r) => r.is_promotional_access).length,
      canceling_but_entitled: entitledNotPaying.filter((r) => r.has_canceling_but_entitled).length,
      entitlement_without_contract: entitledNotPaying.filter((r) => !r.is_trial && !r.is_referral_access && !r.is_manual_access && !r.is_promotional_access && !r.has_canceling_but_entitled).length,
      totalEntitled: realRecords.filter((r) => r.is_currently_entitled).length,
      totalPaying: realRecords.filter((r) => r.is_currently_paying).length,
      difference: realRecords.filter((r) => r.is_currently_entitled).length - realRecords.filter((r) => r.is_currently_paying).length,
      note: 'entitlement_without_contract = UserEntitlement.has_access=true with no backing paying/entitled contract (orphaned or stale entitlement). Past-due is NOT entitled unless within grace. The difference between entitled and paying is explained by the non-paying categories above.',
    };

    // ─── Reliability block (ledger-backed provider sync health) ───────────────
    const ledgerEvents = rawSubEvents || [];
    const confirmedPaymentEvents = ledgerEvents.filter((e) => isPaymentEvent(e));
    const disputeEvents = ledgerEvents.filter((e) => ['chargeback_open', 'chargeback_won', 'chargeback_lost', 'dispute_open', 'dispute_closed'].includes(e.normalized_event_type));
    const allTimeFirstPaid = realRecords.filter((r) => r.first_paid_at);

    // Unmatched payments: ledger payment events whose user_id is not a canonical registered user
    const paymentEventList = ledgerEvents.filter((e) => isPaymentEvent(e));
    const unmatchedPaymentEvents = paymentEventList.filter((e) => {
      const uid = e.user_id;
      const email = norm(e.user_email || e.email);
      if (uid && usersById.has(String(uid))) return false;
      if (email && usersByEmail.has(email)) return false;
      return true;
    });
    const unmatchedPaymentCount = unmatchedPaymentEvents.length;
    const unmatchedSubscriptionContracts = contracts.filter((c) => !c.matched_to_user && norm(c.provider) === 'stripe').length;
    const orphanedEntitlementCount = entitlementReconciliation.entitlement_without_contract || 0;

    // Provider coverage + relevance (Apple/Google relevant if any user/contract references them)
    // Apple/Google are treated as relevant providers (platform intends to support them)
    // so missing coverage is always a reliability reason even if no such users exist yet.
    const appleRelevant = true;
    const googleRelevant = true;
    const appleConfigured = false; // not yet configured (open todo)
    const googleConfigured = false; // not yet configured (open todo)
    const manualConfigured = ledgerEvents.some((e) => norm(e.provider) === 'manual');
    const onlyStripeAccepted = !appleConfigured && !googleConfigured && !manualConfigured; // CollectionKeeper currently accepts only Stripe

    // Backfill / history completeness
    const stripeEvents = ledgerEvents.filter((e) => norm(e.provider) === 'stripe');
    const stripeEventDates = stripeEvents.map((e) => parseMetricDate(e.transaction_at || e.effective_at || e.ingested_at)).filter(Boolean).sort((a, b) => a - b);
    const historyCompleteFrom = stripeEventDates.length > 0 ? stripeEventDates[0].toISOString() : null;
    const backfillRangeStart = parseMetricDate(rawSyncHealth?.backfill_range_start);
    const backfillComplete = !!(rawSyncHealth?.backfill_status === 'complete' && (historyCompleteFrom || backfillRangeStart));
    const HISTORY_NEAR_START_DAYS = 45;
    // First-ever vs within-available-history distinction
    const confirmedFirstEverPaidUsers = allTimeFirstPaid.filter((r) => {
      if (r.first_paid_confidence_category !== 'confirmed_payment_event') return false;
      if (!historyCompleteFrom) return false;
      const fp = parseMetricDate(r.first_paid_at);
      const daysFromStart = (fp.getTime() - parseMetricDate(historyCompleteFrom).getTime()) / MS_PER_DAY;
      // near the beginning of available history + an older active subscription exists → may predate
      const hasOlderSub = contracts.some((c) => c.userId === r.user_id && c.first_paid_at && parseMetricDate(c.first_paid_at) < fp);
      if (daysFromStart <= HISTORY_NEAR_START_DAYS && hasOlderSub) return false;
      return true;
    }).length;
    const confirmedWithinAvailableHistory = allTimeFirstPaid.filter((r) => {
      if (r.first_paid_confidence_category !== 'confirmed_payment_event') return false;
      if (!historyCompleteFrom) return false;
      const fp = parseMetricDate(r.first_paid_at);
      const daysFromStart = (fp.getTime() - parseMetricDate(historyCompleteFrom).getTime()) / MS_PER_DAY;
      const hasOlderSub = contracts.some((c) => c.userId === r.user_id && c.first_paid_at && parseMetricDate(c.first_paid_at) < fp);
      return daysFromStart <= HISTORY_NEAR_START_DAYS && hasOlderSub;
    }).length;
    const historySufficient = confirmedWithinAvailableHistory === 0;

    // Provider sync freshness
    const lastStripeWebhook = parseMetricDate(rawSyncHealth?.last_successful_webhook_at);
    const providerSyncStale = lastStripeWebhook ? (now.getTime() - lastStripeWebhook.getTime() > 14 * MS_PER_DAY) : true;

    // Reliability reasons (explicit)
    const reliabilityReasons = [];
    if (unmatchedPaymentCount > 0) reliabilityReasons.push(`${unmatchedPaymentCount} Stripe payment${unmatchedPaymentCount === 1 ? ' is' : 's are'} not linked to canonical users`);
    if (appleRelevant && !appleConfigured) reliabilityReasons.push('Apple App Store transaction history is not configured');
    if (googleRelevant && !googleConfigured) reliabilityReasons.push('Google Play transaction history is not configured');
    if (orphanedEntitlementCount > 0) reliabilityReasons.push(`${orphanedEntitlementCount} entitlement${orphanedEntitlementCount === 1 ? ' has' : 's have'} no backing contract or classified grant`);
    if (unmatchedSubscriptionContracts > 0) reliabilityReasons.push(`${unmatchedSubscriptionContracts} provider subscription${unmatchedSubscriptionContracts === 1 ? '' : 's'} unmatched`);
    if (rawSyncHealth?.failed_webhook_count > 0) reliabilityReasons.push(`${rawSyncHealth.failed_webhook_count} provider sync failure${rawSyncHealth.failed_webhook_count === 1 ? '' : 's'} recorded`);
    if (providerSyncStale) reliabilityReasons.push('provider synchronization is not current');
    if (!backfillComplete) reliabilityReasons.push('historical backfill is incomplete');
    if (!historySufficient) reliabilityReasons.push('historical coverage is insufficient to establish first-ever payment for some users');
    const reliabilityStatus = reliabilityReasons.length === 0 ? 'verified' : 'partially_verified';

    const reliability = {
      status: reliabilityStatus,
      reasons: reliabilityReasons,
      ledgerEventsTotal: ledgerEvents.length,
      confirmedPaymentEvents: confirmedPaymentEvents.length,
      providerEventCounts: {
        stripe: ledgerEvents.filter((e) => norm(e.provider) === 'stripe').length,
        apple: ledgerEvents.filter((e) => norm(e.provider) === 'apple').length,
        google: ledgerEvents.filter((e) => norm(e.provider) === 'google').length,
        manual: ledgerEvents.filter((e) => norm(e.provider) === 'manual').length,
        unknown: ledgerEvents.filter((e) => norm(e.provider) === 'unknown').length,
      },
      firstPaidConfidence: {
        confirmed_payment_event: allTimeFirstPaid.filter((r) => r.first_paid_confidence_category === 'confirmed_payment_event').length,
        strong_subscription_evidence: allTimeFirstPaid.filter((r) => r.first_paid_confidence_category === 'strong_subscription_evidence').length,
        inferred_contract_period: allTimeFirstPaid.filter((r) => r.first_paid_confidence_category === 'inferred_contract_period').length,
        weak_fallback: allTimeFirstPaid.filter((r) => r.first_paid_confidence_category === 'weak_fallback').length,
        unresolved: realRecords.filter((r) => !r.first_paid_at).length,
      },
      chargebackCount: disputeEvents.length,
      note: 'Reliability metrics are derived exclusively from the canonical SubscriptionEvent ledger. confirmed_payment_event = verified provider transaction; the rest are evidence tiers, not payment confirmations.',
    };

    // ─── Detailed refund metrics (linked to original payments) ────────────────
    const refundEventsAll = ledgerEvents.filter((e) => isRefundEvent(e));
    const refundMetrics = computeRefundMetricsInline(refundEventsAll, paymentEventList, range);

    // ─── History completeness block ────────────────────────────────────────────
    const historyCompleteness = {
      history_complete_from: historyCompleteFrom,
      backfill_range_start: backfillRangeStart ? backfillRangeStart.toISOString() : null,
      backfill_status: rawSyncHealth?.backfill_status || 'never_run',
      completeness_status: historySufficient ? 'sufficient' : 'insufficient',
      first_paid_may_predate_history: confirmedWithinAvailableHistory,
      confirmed_first_ever_paid_users: confirmedFirstEverPaidUsers,
      confirmed_within_available_history: confirmedWithinAvailableHistory,
      inferred_first_paid_users: allTimeFirstPaid.filter((r) => r.first_paid_confidence_category === 'strong_subscription_evidence' || r.first_paid_confidence_category === 'inferred_contract_period' || r.first_paid_confidence_category === 'weak_fallback').length,
      unresolved_first_paid_users: realRecords.filter((r) => !r.first_paid_at).length,
    };

    // ─── Provider coverage block ───────────────────────────────────────────────
    const providerCoverage = {
      stripe: 'connected_and_partially_reconciled',
      apple: appleConfigured ? 'configured' : 'not_configured',
      google: googleConfigured ? 'configured' : 'not_configured',
      manual: manualConfigured ? 'configured' : 'not_configured',
      only_stripe_accepted: onlyStripeAccepted,
      warnings: (() => {
        const w = [];
        w.push('Stripe: connected and partially reconciled');
        w.push('Apple App Store: not configured');
        w.push('Google Play: not configured');
        w.push(manualConfigured ? 'Manual billing: configured' : 'Manual billing: not configured');
        if (!onlyStripeAccepted) w.push('Only Stripe has been verified — the report does not cover all possible paid users');
        if (onlyStripeAccepted) w.push('CollectionKeeper currently accepts only Stripe payments — Apple/Google coverage not required');
        return w;
      })(),
    };

    // ─── Reconciliation totals (dashboard) ─────────────────────────────────────
    const matchedEvents = paymentEventList.length - unmatchedPaymentCount;
    const matchedSubscriptions = contracts.filter((c) => c.matched_to_user).length;
    const reconciliationTotals = {
      total_provider_events: ledgerEvents.length,
      matched_events: matchedEvents,
      unmatched_events: unmatchedPaymentCount,
      matched_payments: matchedEvents,
      unmatched_payments: unmatchedPaymentCount,
      matched_subscriptions: matchedSubscriptions,
      unmatched_subscriptions: contracts.length - matchedSubscriptions,
      duplicate_events_rejected: duplicatesMerged,
      users_with_confirmed_first_payments: confirmedFirstEverPaidUsers + confirmedWithinAvailableHistory,
      users_with_inferred_first_payments: allTimeFirstPaid.filter((r) => r.first_paid_confidence_category !== 'confirmed_payment_event' && r.first_paid_confidence_category !== 'unresolved').length,
      users_with_unresolved_first_payments: realRecords.filter((r) => !r.first_paid_at).length,
      orphaned_entitlements: orphanedEntitlementCount,
      reliability_status: reliabilityStatus,
      last_provider_sync: rawSyncHealth?.last_successful_webhook_at || null,
      last_reconciliation_run: rawSyncHealth?.last_reconciliation_at || null,
    };

    // ─── Stripe paying-user verification ───────────────────────────────────────
    const stripeContracts = contracts.filter((c) => norm(c.provider) === 'stripe');
    let stripeMatched = 0, stripeUnmatched = 0, stripeStatusConflicts = 0, stripePeriodConflicts = 0, stripeRefundConflicts = 0;
    for (const c of stripeContracts) {
      if (!c.is_currently_paying) continue;
      if (!c.matched_to_user) { stripeUnmatched += 1; continue; }
      stripeMatched += 1;
      const canceledAt = parseMetricDate(c.canceled_at);
      const expiredAt = parseMetricDate(c.expired_at);
      if (canceledAt && canceledAt < now && c.is_currently_paying) stripeStatusConflicts += 1;
      if (expiredAt && expiredAt < now && c.is_currently_paying) stripeStatusConflicts += 1;
      const periodEnd = parseMetricDate(c.current_period_end);
      if (periodEnd && periodEnd < now && c.is_currently_paying && c.normalized_status !== 'canceling_but_entitled') stripePeriodConflicts += 1;
    }
    const stripePayingUserVerification = {
      current_stripe_paying_users: stripeMatched + stripeUnmatched,
      matched_to_canonical_users: stripeMatched,
      unmatched_provider_subscriptions: stripeUnmatched,
      status_conflicts: stripeStatusConflicts,
      period_conflicts: stripePeriodConflicts,
      refund_conflicts: stripeRefundConflicts,
    };

    return Response.json({
      meta: {
        generatedAt: now.toISOString(),
        reportVersion: 'v9-canonical',
        reportingTimezone,
        generatedLocalDateTime: formatLocalDateTime(now, reportingTimezone),
        endDateInclusionRule: 'End date is inclusive (local end-of-day, 23:59:59.999 in the reporting timezone).',
        dateRange: { start: range.start.toISOString(), end: range.end.toISOString(), preset: dateRange || '30d' },
        rawCounts: {
          users: rawUsers.length,
          dailyMetrics: rawDailyMetrics.length,
          subEvents: rawSubEvents.length,
          subscriptions: rawSubscriptions.length,
          activeContracts: rawActiveContracts.length,
          entitlements: rawEntitlements.length,
          referralAccess: rawReferralAccess.length,
        },
        contractsTotal: contracts.length,
        duplicatesMerged,
      },
      dateRange: { start: range.start.toISOString(), end: range.end.toISOString(), preset: dateRange || '30d' },
      userActivity: metrics.userActivity,
      subscriptionStatus: metrics.subscriptionStatus,
      acquisition: metrics.acquisition,
      providerBreakdown: metrics.providerBreakdown,
      productBreakdown: metrics.productBreakdown,
      dataQuality: metrics.dataQuality,
      revenue: { mrr, arr, byProduct, knownRevenueRows: payingContracts.length },
      renewals,
      auditUsers,
      auditSubscriptions,
      payingUsersList,
      excludedRecords,
      newFirstTimePaidUsersDetail,
      newPaidSubscriptionsDetail,
      reactivatedPaidUsersDetail,
      firstPaidEvidenceSummary,
      entitlementReconciliation,
      reliability,
      refundMetrics,
      historyCompleteness,
      providerCoverage,
      reconciliationTotals,
      stripePayingUserVerification,
      unmatchedPaymentsDetail: (unmatchedPaymentEvents || []).slice(0, 100).map((e) => ({
        event_id: e.event_id || e.provider_event_id || null,
        provider: e.provider || 'stripe',
        provider_customer_id: e.provider_customer_id || null,
        provider_subscription_id: e.provider_subscription_id || null,
        provider_transaction_id: e.provider_transaction_id || null,
        user_email: e.user_email || e.email || null,
        product_id: e.product_id || null,
        payment_date: (parseMetricDate(e.transaction_at || e.effective_at))?.toISOString() || null,
        amount_cents: e.amount_cents ?? null,
        currency: e.currency || 'usd',
        payment_status: e.payment_status || 'unknown',
        reconciliation_status: 'unmatched_provider_no_user',
      })),
      dedupeDiagnostics: dedupeDiag,
    });

  } catch (error) {
    console.error('[getUserSubscriptionReportV3] fatal:', error);
    return Response.json({
      error: error?.message || 'Failed to build subscription report',
      meta: { generatedAt: new Date().toISOString(), reportVersion: 'v9-canonical' },
    }, { status: 500 });
  }
});