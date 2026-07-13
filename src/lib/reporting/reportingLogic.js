// Pure reporting logic — shared between backend function (inlined) and tests.
// No SDK imports; all functions are pure and testable.

export function norm(v) { return String(v ?? '').trim().toLowerCase(); }
export function uniq(arr) { return [...new Set(arr.filter(Boolean))]; }

export function parseMetricDate(value) {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

export function normalizeMetricInterval(value) {
  const n = norm(value);
  if (['month', 'monthly', 'mo'].includes(n)) return 'month';
  if (['year', 'yearly', 'annual', 'yr'].includes(n)) return 'year';
  return null;
}

// ─── Timezone-aware date range resolution ──────────────────────────────────────
// "Today" and all trailing/period ranges are computed in the configured reporting
// timezone (America/Indianapolis), so a UTC instant in the early hours does not
// roll the report over to the next local calendar day. Range bounds are returned
// as UTC instants that correspond to local-day boundaries.

export const REPORTING_TIMEZONE = 'America/Indianapolis';

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

export function startOfDayLocal(date, tz) {
  const p = tzParts(date, tz);
  const noonUtc = new Date(Date.UTC(p.year, p.month - 1, p.day, 12, 0, 0));
  const off = tzOffsetMinutes(noonUtc, tz);
  return new Date(Date.UTC(p.year, p.month - 1, p.day, 0, 0, 0) - off * 60000);
}

export function endOfDayLocal(date, tz) {
  return new Date(startOfDayLocal(date, tz).getTime() + MS_PER_DAY - 1);
}

export function startOfMonthLocal(date, tz) {
  const p = tzParts(date, tz);
  return startOfDayLocal(new Date(Date.UTC(p.year, p.month - 1, 1, 12, 0, 0)), tz);
}

export function startOfQuarterLocal(date, tz) {
  const p = tzParts(date, tz);
  const q = Math.floor((p.month - 1) / 3);
  return startOfDayLocal(new Date(Date.UTC(p.year, q * 3, 1, 12, 0, 0)), tz);
}

export function startOfYearLocal(date, tz) {
  const p = tzParts(date, tz);
  return startOfDayLocal(new Date(Date.UTC(p.year, 0, 1, 12, 0, 0)), tz);
}

export function trailingDayStart(now, days, tz) {
  return startOfDayLocal(new Date(now.getTime() - days * MS_PER_DAY), tz);
}

// Parse a custom date input as a local-calendar-date boundary.
// Date-only strings ("YYYY-MM-DD") are interpreted as a local calendar date
// (not UTC midnight, which would shift the day in a non-UTC timezone).
export function parseLocalDateBoundary(value, tz, end) {
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

// Legacy UTC helpers (kept for attribution-window arithmetic on instants).
export function startOfDay(d) { const x = new Date(d); x.setUTCHours(0, 0, 0, 0); return x; }
export function endOfDay(d) { const x = new Date(d); x.setUTCHours(23, 59, 59, 999); return x; }
export function startOfMonth(d) { return startOfDay(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))); }
export function startOfQuarter(d) { const q = Math.floor(d.getUTCMonth() / 3); return startOfDay(new Date(Date.UTC(d.getUTCFullYear(), q * 3, 1))); }
export function startOfYear(d) { return startOfDay(new Date(Date.UTC(d.getUTCFullYear(), 0, 1))); }
export function addDays(d, days) { const x = new Date(d); x.setUTCDate(x.getUTCDate() + days); return x; }

export function resolveDateRange(dateRange, startDate, endDate, now, timezone) {
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

export function inDateRange(date, range) {
  if (!date) return false;
  return date >= range.start && date <= range.end;
}

// ─── Status classification ────────────────────────────────────────────────────

const ACTIVE_PAID_STATUSES = new Set(['active', 'paid']);
const TRIAL_STATUSES = new Set(['trialing', 'trial']);
const PAST_DUE_STATUSES = new Set(['past_due']);
const CANCELED_STATUSES = new Set(['canceled']);
const EXPIRED_STATUSES = new Set(['expired']);

export function classifyStatus(rawStatus, periodEnd, now) {
  const s = norm(rawStatus);
  const withinPeriod = periodEnd && parseMetricDate(periodEnd) && parseMetricDate(periodEnd) >= now;
  if (ACTIVE_PAID_STATUSES.has(s)) return 'active_paid';
  if (TRIAL_STATUSES.has(s)) return 'trial';
  if (PAST_DUE_STATUSES.has(s)) return 'past_due';
  if (CANCELED_STATUSES.has(s)) return withinPeriod ? 'canceling_but_entitled' : 'canceled';
  if (EXPIRED_STATUSES.has(s)) return 'expired';
  return 'unknown';
}

export function isPayingStatus(canonicalStatus) {
  return canonicalStatus === 'active_paid' || canonicalStatus === 'canceling_but_entitled';
}

export function isEntitledStatus(canonicalStatus) {
  return ['active_paid', 'canceling_but_entitled', 'trial'].includes(canonicalStatus);
}

// ─── Event classification ─────────────────────────────────────────────────────
// Canonical payment-event classifier. A positive amount is supporting evidence,
// never the definition of a successful payment. Refunds, failures, disputes,
// pending/incomplete, and trial events are rejected before any success check.
const REFUND_SLUGS = ['refund', 'refunded', 'chargeback', 'dispute', 'disputed', 'reversal', 'reversed'];
const FAILED_SLUGS = ['payment failed', 'invoice payment failed', 'charge failed', 'card declined', 'declined', 'payment canceled', 'canceled payment', 'void', 'voided'];
const PENDING_SLUGS = ['pending', 'incomplete', 'authorization only', 'authorized only', 'checkout expired', 'payment pending'];
const TRIAL_SLUGS = ['trial', 'trialing'];
const PAYMENT_SUCCESS_SLUGS = ['invoice payment succeeded', 'charge succeeded', 'checkout session completed', 'initial buy', 'repurchase', 'product purchase', 'renewed', 'renewal'];
const LIFECYCLE_SLUGS = ['customer subscription created', 'customer subscription updated', 'subscribed'];
const PAYMENT_EVENT_PATTERNS = PAYMENT_SUCCESS_SLUGS.concat(LIFECYCLE_SLUGS);
const CANCEL_EVENT_PATTERNS = ['subscription.deleted', 'canceled', 'cancel'];
const EXPIRE_EVENT_PATTERNS = ['expired', 'expiration'];

function eventSlug(t) { return norm(t).replace(/[._-]+/g, ' '); }

export function classifyPaymentEvent(event) {
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

export function isPaymentEvent(e) {
  return classifyPaymentEvent(e).isSuccessfulPayment;
}

export function isRefundEvent(e) {
  return classifyPaymentEvent(e).isRefund;
}

export function isCancelEvent(e) {
  const t = norm(e?.event_type);
  return CANCEL_EVENT_PATTERNS.some((p) => t.includes(p));
}

export function isExpireEvent(e) {
  const t = norm(e?.event_type);
  return EXPIRE_EVENT_PATTERNS.some((p) => t.includes(p));
}

// ─── First paid date resolution ───────────────────────────────────────────────

// Confidence categories (canonical):
//   confirmed_payment_event   — first-paid date backed by a verified successful
//                                payment / invoice / purchase / transaction event.
//   strong_subscription_evidence — Subscription.first_paid_at / initial_transaction_at
//                                / started_at / subscriptionStartedAt. Indicates a
//                                subscription start but is NOT a verified transaction.
//   inferred_contract_period  — ActiveContract.period_start. May represent an
//                                initial period, renewal, migration, or backfill.
//   weak_fallback             — record created_date (last resort).
//   unresolved                — no first-paid date could be derived.
const FIRST_PAID_DATE_FIELDS = ['period_start', 'ingested_at', 'created_date'];

function firstPaidEventDateField(e) {
  for (const f of FIRST_PAID_DATE_FIELDS) if (parseMetricDate(e[f])) return f;
  return 'period_start';
}

export function resolveFirstPaidAt(eventsForUser, sub, acRow) {
  // 1. Earliest verified payment event → confirmed_payment_event
  const paymentEvents = (eventsForUser || [])
    .filter((e) => isPaymentEvent(e))
    .map((e) => ({ date: parseMetricDate(e.period_start) || parseMetricDate(e.ingested_at) || parseMetricDate(e.created_date), field: firstPaidEventDateField(e), e }))
    .filter((x) => x.date)
    .sort((a, b) => a.date - b.date);
  if (paymentEvents.length > 0) {
    return { date: paymentEvents[0].date, source: 'subscription_event', confidence: 'confirmed',
      confidenceCategory: 'confirmed_payment_event', sourceEntity: 'SubscriptionEvent',
      sourceField: paymentEvents[0].field, possibleAmbiguity: null };
  }
  // 2. Subscription first_paid_at / initial_transaction_at → strong subscription evidence
  const firstPaidField = sub?.first_paid_at ? 'first_paid_at' : (sub?.initial_transaction_at ? 'initial_transaction_at' : null);
  const firstPaid = parseMetricDate(sub?.first_paid_at || sub?.initial_transaction_at);
  if (firstPaid) return { date: firstPaid, source: 'subscription_first_paid_at', confidence: 'confirmed',
    confidenceCategory: 'strong_subscription_evidence', sourceEntity: 'Subscription',
    sourceField: firstPaidField, possibleAmbiguity: null };
  // 3. Subscription started_at / subscriptionStartedAt → strong subscription evidence
  const startedField = sub?.started_at ? 'started_at' : (sub?.subscriptionStartedAt ? 'subscriptionStartedAt' : null);
  const subStarted = parseMetricDate(sub?.started_at || sub?.subscriptionStartedAt);
  if (subStarted) return { date: subStarted, source: 'subscription_started_at', confidence: 'confirmed',
    confidenceCategory: 'strong_subscription_evidence', sourceEntity: 'Subscription',
    sourceField: startedField, possibleAmbiguity: 'Subscription start date — reflects activation, not an independently verified payment transaction' };
  // 4. ActiveContract period_start → inferred contract period (NOT proof of first payment)
  const periodField = acRow?.period_start ? 'period_start' : (acRow?.current_period_start ? 'current_period_start' : 'period_start');
  const acPeriodStart = parseMetricDate(acRow?.period_start || acRow?.current_period_start);
  if (acPeriodStart) return { date: acPeriodStart, source: 'period_start_inferred', confidence: 'inferred',
    confidenceCategory: 'inferred_contract_period', sourceEntity: 'ActiveContract',
    sourceField: periodField, possibleAmbiguity: 'Inferred — may represent initial period, renewal, migration, or backfill' };
  // 5. Record created_date → weak fallback
  const createdFromSub = !!(sub?.created_date || sub?.created_at);
  const created = parseMetricDate(sub?.created_date || sub?.created_at || acRow?.created_date || acRow?.created_at || acRow?.normalized_at);
  if (created) return { date: created, source: 'created_date_inferred', confidence: 'inferred',
    confidenceCategory: 'weak_fallback', sourceEntity: createdFromSub ? 'Subscription' : 'ActiveContract',
    sourceField: 'created_date', possibleAmbiguity: 'Weak fallback — record creation date, not a payment date' };
  return { date: null, source: 'none', confidence: 'none',
    confidenceCategory: 'unresolved', sourceEntity: null, sourceField: null, possibleAmbiguity: null };
}

export function resolveLatestPaymentAt(eventsForUser) {
  const paymentEvents = (eventsForUser || [])
    .filter((e) => isPaymentEvent(e))
    .map((e) => parseMetricDate(e.period_start) || parseMetricDate(e.ingested_at))
    .filter(Boolean)
    .sort((a, b) => b - a);
  return paymentEvents.length > 0 ? paymentEvents[0] : null;
}

export function resolveCanceledAt(eventsForUser, acRow) {
  const cancelEvents = (eventsForUser || [])
    .filter((e) => isCancelEvent(e))
    .map((e) => parseMetricDate(e.ingested_at) || parseMetricDate(e.period_end))
    .filter(Boolean)
    .sort((a, b) => b - a);
  if (cancelEvents.length > 0) return cancelEvents[0];
  return parseMetricDate(acRow?.canceled_at);
}

export function resolveExpiredAt(eventsForUser, acRow, periodEnd) {
  const expireEvents = (eventsForUser || [])
    .filter((e) => isExpireEvent(e))
    .map((e) => parseMetricDate(e.ingested_at) || parseMetricDate(e.period_end))
    .filter(Boolean)
    .sort((a, b) => b - a);
  if (expireEvents.length > 0) return expireEvents[0];
  return parseMetricDate(periodEnd);
}

// ─── Identity resolution ──────────────────────────────────────────────────────

export function resolveUserIdentity(row, usersByEmail, usersById) {
  const directUserId = row.user_id || row.userId || row.owner_id || row.account_user_id || null;
  const email = norm(row.user_email || row.email || row.customer_email || row.billing_email || '');

  // 1. Canonical user ID
  if (directUserId) {
    const u = usersById.get(String(directUserId));
    if (u) return { userId: String(u.id), email: norm(u.email), matched: true, confidence: 'user_id', synthetic: false };
    // user_id present but not found — keep it but mark unmatched
    return { userId: String(directUserId), email, matched: false, confidence: 'user_id_unmatched', synthetic: false };
  }
  // 2. Email → user
  if (email && usersByEmail.has(email)) {
    const u = usersByEmail.get(email);
    return { userId: String(u.id), email, matched: true, confidence: 'email', synthetic: false };
  }
  // 3. Synthetic identity for tracking
  if (email) return { userId: `email:${email}`, email, matched: false, confidence: 'email_synthetic', synthetic: true };
  return { userId: `row:${row.id}`, email: '', matched: false, confidence: 'row_synthetic', synthetic: true };
}

// ─── Deduplication ────────────────────────────────────────────────────────────

export function dedupeKey(contract) {
  // Provider-specific identifiers first
  const p = norm(contract.provider);
  if (contract.provider_subscription_id) return `${p}|sub|${norm(contract.provider_subscription_id)}`;
  if (contract.original_transaction_id) return `${p}|apple|${norm(contract.original_transaction_id)}`;
  if (contract.purchase_token) return `${p}|google|${norm(contract.purchase_token)}`;
  // Fallback: user + provider + product + overlapping period
  const periodStart = contract.period_start ? String(contract.period_start).slice(0, 10) : 'na';
  return `${p}|${contract.userId}|${norm(contract.product)}|${periodStart}`;
}

export function deduplicateContracts(contracts) {
  const map = new Map();
  let duplicatesMerged = 0;
  const diagnostics = [];
  for (const c of contracts) {
    const key = dedupeKey(c);
    const existing = map.get(key);
    if (!existing) { map.set(key, c); continue; }
    duplicatesMerged += 1;
    diagnostics.push({ key, kept: existing.canonical_subscription_id, dropped: c.canonical_subscription_id });
    // Keep the more complete one
    const score = (r) => (r.amount ? 4 : 0) + (r.billing_interval ? 3 : 0) + (r.first_paid_at ? 2 : 0) + (r.product ? 1 : 0);
    if (score(c) > score(existing)) map.set(key, c);
  }
  return { deduped: [...map.values()], duplicatesMerged, diagnostics };
}

// ─── Activity detection ──────────────────────────────────────────────────────

const ACTIVITY_FIELDS = [
  'curator_sessions', 'curator_messages', 'recommendations_shown',
  'recommendations_clicked', 'recommendations_accepted',
  'items_added', 'items_edited', 'exports_generated',
  'valuations_viewed', 'collectible_toggles',
];

export function hasRealActivity(metricsRow) {
  return ACTIVITY_FIELDS.some((f) => Number(metricsRow[f] || 0) > 0);
}

export function buildActivityIndex(dailyMetrics, usersByEmail) {
  // Returns Map<userId, { firstActivityAt, lastActivityAt, activeDates: Set<dateStr> }>
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

export function isActiveInWindow(activityEntry, now, days, timezone) {
  if (!activityEntry) return false;
  const tz = timezone || REPORTING_TIMEZONE;
  const cutoff = trailingDayStart(now, days - 1, tz);
  return activityEntry.lastActivityAt >= cutoff;
}

// ─── Metric computation ───────────────────────────────────────────────────────

export function computeMetrics(userRecords, contracts, users, range, now) {
  const totalRegisteredUsers = users.length;
  const newRegisteredUsers = users.filter((u) => inDateRange(parseMetricDate(u.created_date), range)).length;

  // Activity (trailing windows from now, always)
  const dau = userRecords.filter((r) => r.active_1d).length;
  const wau = userRecords.filter((r) => r.active_7d).length;
  const mau = userRecords.filter((r) => r.active_30d).length;
  const active90d = userRecords.filter((r) => r.active_90d).length;
  const activeFreeUsers = userRecords.filter((r) => r.active_30d && !r.is_currently_entitled).length;
  const activePayingUsers = userRecords.filter((r) => r.active_30d && r.is_currently_paying).length;

  // Subscription status (current state)
  const currentEntitledUsers = userRecords.filter((r) => r.is_currently_entitled).length;
  const currentPayingUsers = userRecords.filter((r) => r.is_currently_paying).length;
  const currentTrials = userRecords.filter((r) => r.is_trial).length;
  const currentPastDue = userRecords.filter((r) => r.is_past_due).length;
  const cancelingButEntitled = userRecords.filter((r) => r.has_canceling_but_entitled).length;
  const expiredUsers = userRecords.filter((r) => r.has_expired).length;

  // Acquisition (within selected date range)
  const newFirstTimePaidUsers = userRecords.filter((r) => r.first_paid_at && inDateRange(r.first_paid_at, range)).length;
  const reactivatedPaidUsers = userRecords.filter((r) => r.reactivated_at && inDateRange(r.reactivated_at, range)).length;
  const newPaidSubscriptions = contracts.filter((c) => c.first_paid_at && inDateRange(c.first_paid_at, range)).length;
  const canceledSubscriptions = contracts.filter((c) => c.canceled_at && inDateRange(c.canceled_at, range)).length;
  const expiredSubscriptions = contracts.filter((c) => c.expired_at && inDateRange(c.expired_at, range)).length;

  // ─── Cohort-based conversion (fix: never mix historical numerator with current-state denominator) ──
  const ATTRIBUTION_WINDOW_DAYS = 30;
  const realUsersForCohort = userRecords.filter((r) => !r.is_synthetic);
  const usersRegisteredInRange = realUsersForCohort.filter((r) => inDateRange(r.created_at, range));
  const convertedRegistrants = usersRegisteredInRange.filter((r) =>
    r.first_paid_at && r.created_at &&
    r.first_paid_at >= r.created_at &&
    r.first_paid_at <= addDays(r.created_at, ATTRIBUTION_WINDOW_DAYS)
  );
  const registrationCohortConversion = usersRegisteredInRange.length >= 5
    ? roundMoney((convertedRegistrants.length / usersRegisteredInRange.length) * 100)
    : null;
  const eligibleFreeAtStart = realUsersForCohort.filter((r) =>
    r.created_at && r.created_at < range.start &&
    (!r.first_paid_at || r.first_paid_at >= range.start)
  );
  const convertedFromFree = eligibleFreeAtStart.filter((r) =>
    r.first_paid_at && inDateRange(r.first_paid_at, range)
  );
  const existingFreeUserConversion = eligibleFreeAtStart.length >= 5
    ? roundMoney((convertedFromFree.length / eligibleFreeAtStart.length) * 100)
    : null;
  const paidAcquisitionRate = totalRegisteredUsers > 0
    ? roundMoney((newFirstTimePaidUsers / totalRegisteredUsers) * 100)
    : null;
  const freeToPaidConversionRate = existingFreeUserConversion;
  const registrationToPaidConversionRate = registrationCohortConversion;

  // Provider breakdown
  const providerBreakdown = { stripe: { paying: 0, entitled: 0 }, apple: { paying: 0, entitled: 0 }, google: { paying: 0, entitled: 0 }, manual: { paying: 0, entitled: 0 }, unknown: { paying: 0, entitled: 0 } };
  for (const r of userRecords) {
    const p = r.current_provider || 'unknown';
    if (!providerBreakdown[p]) providerBreakdown[p] = { paying: 0, entitled: 0 };
    if (r.is_currently_paying) providerBreakdown[p].paying += 1;
    if (r.is_currently_entitled) providerBreakdown[p].entitled += 1;
  }

  // Product breakdown
  const productBreakdown = { pipekeeper: { paying: 0, entitled: 0 }, whiskeykeeper: { paying: 0, entitled: 0 }, cigarkeeper: { paying: 0, entitled: 0 }, winekeeper: { paying: 0, entitled: 0 }, bundle: { paying: 0, entitled: 0 } };
  for (const r of userRecords) {
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
    duplicateContracts: 0, // filled by caller
    conflictingStatuses: userRecords.filter((r) => r.has_conflicting_status).length,
    missingFirstPaidDate: contracts.filter((c) => !c.first_paid_at).length,
    missingAmount: contracts.filter((c) => !c.amount).length,
    missingInterval: contracts.filter((c) => !c.billing_interval).length,
    unknownProduct: contracts.filter((c) => !c.product || c.product === 'unknown').length,
    unknownProvider: contracts.filter((c) => !c.provider || c.provider === 'unknown').length,
    syntheticIdentities: userRecords.filter((r) => r.is_synthetic).length,
  };

  return {
    userActivity: { totalRegisteredUsers, newRegisteredUsers, dau, wau, mau, active90d, activeFreeUsers, activePayingUsers },
    subscriptionStatus: { currentEntitledUsers, currentPayingUsers, currentTrials, currentPastDue, cancelingButEntitled, expiredUsers },
    acquisition: {
      newFirstTimePaidUsers, reactivatedPaidUsers, newPaidSubscriptions, canceledSubscriptions, expiredSubscriptions,
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