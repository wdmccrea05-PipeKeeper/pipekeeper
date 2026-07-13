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

// ─── Date range resolution ───────────────────────────────────────────────────

export function startOfDay(d) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d) {
  const x = new Date(d);
  x.setUTCHours(23, 59, 59, 999);
  return x;
}

export function startOfMonth(d) {
  return startOfDay(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
}

export function startOfQuarter(d) {
  const q = Math.floor(d.getUTCMonth() / 3);
  return startOfDay(new Date(Date.UTC(d.getUTCFullYear(), q * 3, 1)));
}

export function startOfYear(d) {
  return startOfDay(new Date(Date.UTC(d.getUTCFullYear(), 0, 1)));
}

export function addDays(d, days) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

export function resolveDateRange(dateRange, startDate, endDate, now) {
  const today = startOfDay(now);
  const ranges = {
    today: { start: today, end: endOfDay(now) },
    '7d': { start: addDays(today, -7), end: endOfDay(now) },
    '30d': { start: addDays(today, -30), end: endOfDay(now) },
    '90d': { start: addDays(today, -90), end: endOfDay(now) },
    mtd: { start: startOfMonth(now), end: endOfDay(now) },
    qtd: { start: startOfQuarter(now), end: endOfDay(now) },
    ytd: { start: startOfYear(now), end: endOfDay(now) },
  };

  if (dateRange === 'prior_month') {
    const firstOfThisMonth = startOfMonth(now);
    const endOfPriorMonth = addDays(firstOfThisMonth, -1);
    const startOfPriorMonth = startOfMonth(endOfPriorMonth);
    return { start: startOfPriorMonth, end: endOfDay(endOfPriorMonth) };
  }
  if (dateRange === 'prior_quarter') {
    const firstOfThisQuarter = startOfQuarter(now);
    const endOfPriorQuarter = addDays(firstOfThisQuarter, -1);
    const startOfPriorQuarter = startOfQuarter(endOfPriorQuarter);
    return { start: startOfPriorQuarter, end: endOfDay(endOfPriorQuarter) };
  }
  if (dateRange === 'custom') {
    const s = startDate ? startOfDay(parseMetricDate(startDate) || today) : null;
    const e = endDate ? endOfDay(parseMetricDate(endDate) || now) : null;
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

const PAYMENT_EVENT_PATTERNS = [
  'invoice.payment_succeeded', 'charge.succeeded', 'checkout.session.completed',
  'customer.subscription.created', 'customer.subscription.updated',
  'subscribed', 'renewed', 'renewal', 'initial_buy', 'repurchase', 'product_purchase',
];
const CANCEL_EVENT_PATTERNS = ['subscription.deleted', 'canceled', 'cancel'];
const EXPIRE_EVENT_PATTERNS = ['expired', 'expiration'];

export function isPaymentEvent(e) {
  if (e && e.amount_cents && Number(e.amount_cents) > 0) return true;
  const t = norm(e?.event_type);
  if (!t) return false;
  // Exclude refund/failed events from payment-success
  if (t.includes('refund') || t.includes('failed') || t.includes('void')) return false;
  return PAYMENT_EVENT_PATTERNS.some((p) => t.includes(p));
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

export function resolveFirstPaidAt(eventsForUser, sub, acRow) {
  // 1. Earliest payment event (confirmed)
  const paymentEvents = (eventsForUser || [])
    .filter((e) => isPaymentEvent(e))
    .map((e) => ({ date: parseMetricDate(e.period_start) || parseMetricDate(e.ingested_at) || parseMetricDate(e.created_date), e }))
    .filter((x) => x.date)
    .sort((a, b) => a.date - b.date);
  if (paymentEvents.length > 0) {
    return { date: paymentEvents[0].date, source: 'subscription_event', confidence: 'confirmed' };
  }
  // 2. Subscription started_at / subscriptionStartedAt (confirmed)
  const subStarted = parseMetricDate(sub?.started_at || sub?.subscriptionStartedAt);
  if (subStarted) return { date: subStarted, source: 'subscription_started_at', confidence: 'confirmed' };
  // 3. Subscription first_paid_at / initial_transaction_at (confirmed)
  const firstPaid = parseMetricDate(sub?.first_paid_at || sub?.initial_transaction_at);
  if (firstPaid) return { date: firstPaid, source: 'subscription_first_paid_at', confidence: 'confirmed' };
  // 4. ActiveContract period_start (inferred — recurring, not first paid)
  const acPeriodStart = parseMetricDate(acRow?.period_start || acRow?.current_period_start);
  if (acPeriodStart) return { date: acPeriodStart, source: 'period_start_inferred', confidence: 'inferred' };
  // 5. Created date (inferred — last resort)
  const created = parseMetricDate(sub?.created_date || sub?.created_at || acRow?.created_date || acRow?.created_at || acRow?.normalized_at);
  if (created) return { date: created, source: 'created_date_inferred', confidence: 'inferred' };
  return { date: null, source: 'none', confidence: 'none' };
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

export function isActiveInWindow(activityEntry, now, days) {
  if (!activityEntry) return false;
  const cutoff = addDays(startOfDay(now), -days + 1);
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

  const freeToPaidConversionRate = activeFreeUsers > 0 ? roundMoney((newFirstTimePaidUsers / activeFreeUsers) * 100) : 0;
  const registrationToPaidConversionRate = newRegisteredUsers > 0 ? roundMoney((newFirstTimePaidUsers / newRegisteredUsers) * 100) : 0;

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
    acquisition: { newFirstTimePaidUsers, reactivatedPaidUsers, newPaidSubscriptions, canceledSubscriptions, expiredSubscriptions, freeToPaidConversionRate, registrationToPaidConversionRate },
    providerBreakdown,
    productBreakdown,
    dataQuality,
  };
}