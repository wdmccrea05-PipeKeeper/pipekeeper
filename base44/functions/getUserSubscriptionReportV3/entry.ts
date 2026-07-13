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

// ─── Date range ────────────────────────────────────────────────────────────────
function startOfDay(d) { const x = new Date(d); x.setUTCHours(0, 0, 0, 0); return x; }
function endOfDay(d) { const x = new Date(d); x.setUTCHours(23, 59, 59, 999); return x; }
function startOfMonth(d) { return startOfDay(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))); }
function startOfQuarter(d) { const q = Math.floor(d.getUTCMonth() / 3); return startOfDay(new Date(Date.UTC(d.getUTCFullYear(), q * 3, 1))); }
function startOfYear(d) { return startOfDay(new Date(Date.UTC(d.getUTCFullYear(), 0, 1))); }
function addDays(d, days) { const x = new Date(d); x.setUTCDate(x.getUTCDate() + days); return x; }

function resolveDateRange(dateRange, startDate, endDate, now) {
  const today = startOfDay(now);
  const ranges = {
    today: { start: today, end: endOfDay(now) },
    '7d': { start: addDays(today, -7), end: endOfDay(now) },
    '30d': { start: addDays(today, -30), end: endOfDay(now) },
    '90d': { start: addDays(today, -90), end: endOfDay(now) },
    '365d': { start: addDays(today, -365), end: endOfDay(now) },
    mtd: { start: startOfMonth(now), end: endOfDay(now) },
    qtd: { start: startOfQuarter(now), end: endOfDay(now) },
    ytd: { start: startOfYear(now), end: endOfDay(now) },
  };
  if (dateRange === 'prior_month') {
    const firstOfThisMonth = startOfMonth(now);
    const endOfPriorMonth = addDays(firstOfThisMonth, -1);
    return { start: startOfMonth(endOfPriorMonth), end: endOfDay(endOfPriorMonth) };
  }
  if (dateRange === 'prior_quarter') {
    const firstOfThisQuarter = startOfQuarter(now);
    const endOfPriorQuarter = addDays(firstOfThisQuarter, -1);
    return { start: startOfQuarter(endOfPriorQuarter), end: endOfDay(endOfPriorQuarter) };
  }
  if (dateRange === 'custom') {
    const s = startDate ? startOfDay(parseMetricDate(startDate)) : null;
    const e = endDate ? endOfDay(parseMetricDate(endDate)) : null;
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
const PAYMENT_EVENT_PATTERNS = [
  'invoice.payment_succeeded', 'charge.succeeded', 'checkout.session.completed',
  'customer.subscription.created', 'customer.subscription.updated',
  'subscribed', 'renewed', 'renewal', 'initial_buy', 'repurchase', 'product_purchase',
];
const CANCEL_EVENT_PATTERNS = ['subscription.deleted', 'canceled', 'cancel'];
const EXPIRE_EVENT_PATTERNS = ['expired', 'expiration'];

function isPaymentEvent(e) {
  if (e && e.amount_cents && Number(e.amount_cents) > 0) return true;
  const t = norm(e?.event_type);
  if (!t) return false;
  if (t.includes('refund') || t.includes('failed') || t.includes('void')) return false;
  return PAYMENT_EVENT_PATTERNS.some((p) => t.includes(p));
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
function resolveFirstPaidAt(eventsForUser, sub, acRow) {
  const paymentEvents = (eventsForUser || [])
    .filter((e) => isPaymentEvent(e))
    .map((e) => ({ date: parseMetricDate(e.period_start) || parseMetricDate(e.ingested_at) || parseMetricDate(e.created_date), e }))
    .filter((x) => x.date)
    .sort((a, b) => a.date - b.date);
  if (paymentEvents.length > 0) {
    return { date: paymentEvents[0].date, source: 'subscription_event', confidence: 'confirmed' };
  }
  const subStarted = parseMetricDate(sub?.started_at || sub?.subscriptionStartedAt);
  if (subStarted) return { date: subStarted, source: 'subscription_started_at', confidence: 'confirmed' };
  const firstPaid = parseMetricDate(sub?.first_paid_at || sub?.initial_transaction_at);
  if (firstPaid) return { date: firstPaid, source: 'subscription_first_paid_at', confidence: 'confirmed' };
  const acPeriodStart = parseMetricDate(acRow?.period_start || acRow?.current_period_start);
  if (acPeriodStart) return { date: acPeriodStart, source: 'period_start_inferred', confidence: 'inferred' };
  const created = parseMetricDate(sub?.created_date || sub?.created_at || acRow?.created_date || acRow?.created_at || acRow?.normalized_at);
  if (created) return { date: created, source: 'created_date_inferred', confidence: 'inferred' };
  return { date: null, source: 'none', confidence: 'none' };
}

function resolveLatestPaymentAt(eventsForUser) {
  const dates = (eventsForUser || [])
    .filter((e) => isPaymentEvent(e))
    .map((e) => parseMetricDate(e.period_start) || parseMetricDate(e.ingested_at))
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
    const first_paid_source = userContracts.find((c) => c.first_paid_at && c.first_paid_at.getTime() === first_paid_at?.getTime())?.first_paid_source || null;

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

    // Activity flags (trailing windows)
    const active_1d = activity && activity.lastActivityAt >= addDays(startOfDay(now), -1);
    const active_7d = activity && activity.lastActivityAt >= addDays(startOfDay(now), -7);
    const active_30d = activity && activity.lastActivityAt >= addDays(startOfDay(now), -30);
    const active_90d = activity && activity.lastActivityAt >= addDays(startOfDay(now), -90);

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
      latest_payment_at,
      reactivated_at,
      current_provider,
      current_products,
      is_trial,
      is_past_due,
      is_manual_access: false, // would come from a manual grant entity if exists
      is_referral_access: !!referralByUserId.get(userId),
      is_promotional_access: false,
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
function computeMetrics(userRecords, contracts, users, range, now, duplicatesMerged) {
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
  const reactivatedPaidUsers = realUsers.filter((r) => r.reactivated_at && inDateRange(r.reactivated_at, range)).length;
  const newPaidSubscriptions = contracts.filter((c) => c.first_paid_at && inDateRange(c.first_paid_at, range)).length;
  const canceledSubscriptions = contracts.filter((c) => c.canceled_at && inDateRange(c.canceled_at, range)).length;
  const expiredSubscriptions = contracts.filter((c) => c.expired_at && inDateRange(c.expired_at, range)).length;

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

// ─── Revenue / run-rate ──────────────────────────────────────────────────────────
function periodRange(kind, now) {
  if (kind === 'week') {
    const start = startOfDay(now);
    const dow = start.getUTCDay();
    const fromMonday = dow === 0 ? 6 : dow - 1;
    start.setUTCDate(start.getUTCDate() - fromMonday);
    const end = addDays(start, 7);
    return { start, end };
  }
  if (kind === 'month') return { start: startOfMonth(now), end: addDays(startOfMonth(addDays(startOfMonth(now), 32)), -1) };
  if (kind === 'quarter') { const s = startOfQuarter(now); return { start: s, end: addDays(startOfQuarter(addDays(s, 95)), -1) }; }
  return { start: startOfYear(now), end: addDays(startOfYear(new Date(now.getUTCFullYear() + 1, 0, 1)), -1) };
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
    const now = new Date();
    const range = resolveDateRange(dateRange, startDate, endDate, now);

    const [rawUsers, rawDailyMetrics, rawSubEvents, rawSubscriptions, rawActiveContracts, rawEntitlements, rawReferralAccess] = await Promise.all([
      fetchAllSafe(base44.asServiceRole.entities.User),
      fetchAllSafe(base44.asServiceRole.entities.DailyUserMetrics),
      fetchAllSafe(base44.asServiceRole.entities.SubscriptionEvent),
      fetchAllSafe(base44.asServiceRole.entities.Subscription),
      fetchAllSafe(base44.asServiceRole.entities.ActiveContract),
      fetchAllSafe(base44.asServiceRole.entities.UserEntitlement),
      fetchAllSafe(base44.asServiceRole.entities.ReferralEarnedAccess),
    ]);

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
    const metrics = computeMetrics(userRecords, contracts, users, range, now, duplicatesMerged);

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
      const r = periodRange(kind, now);
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

    // (6) The 5 new first-time paid users — full evidence
    const newFirstTimePaidUsersDetail = realRecords
      .filter((r) => r.first_paid_at && inDateRange(r.first_paid_at, range))
      .map((r) => {
        const userContracts = contracts.filter((c) => c.userId === r.user_id);
        const firstContract = userContracts.find((c) => c.first_paid_at && c.first_paid_at.getTime() === r.first_paid_at.getTime()) || userContracts[0];
        return {
          user_id: r.user_id,
          email: r.email,
          registration_date: r.created_at?.toISOString() || null,
          first_paid_at: r.first_paid_at?.toISOString() || null,
          provider: firstContract?.provider || r.current_provider || '-',
          product: (r.current_products || []).join(', ') || (firstContract?.product || '-'),
          provider_subscription_id: firstContract?.provider_subscription_id || '-',
          original_transaction_id: firstContract?.original_transaction_id || '-',
          first_payment_event: r.first_paid_source || '-',
          amount: firstContract?.amount ?? null,
          billing_interval: firstContract?.billing_interval || '-',
          first_paid_evidence_source: r.first_paid_source || '-',
          evidence_confidence: firstContract?.first_paid_confidence || 'none',
          current_subscription_status: firstContract?.normalized_status || '-',
          current_entitlement_status: r.is_currently_entitled ? 'entitled' : 'none',
          later_canceled: !!firstContract?.canceled_at || userContracts.some((c) => c.normalized_status === 'canceled' || c.normalized_status === 'expired'),
          reason_old_report_excluded: 'canonical_started_at was derived from ActiveContract.started_at/current_period_start, which do not exist on that entity — first_paid_at resolved to null and the user was silently excluded',
          reason_new_report_includes: `first_paid_at derived from ${r.first_paid_source || 'best-available source'} per the evidence hierarchy (SubscriptionEvent → Subscription.started_at → period_start_inferred)`,
        };
      })
      .sort((a, b) => (a.first_paid_at || '').localeCompare(b.first_paid_at || ''));

    // (9) The 10 new subscriptions — why 5 users produced 10 subscriptions
    const newPaidSubscriptionsDetail = contracts
      .filter((c) => c.first_paid_at && inDateRange(c.first_paid_at, range))
      .map((c) => {
        const userContracts = contracts.filter((x) => x.userId === c.userId).filter((x) => x.first_paid_at).sort((a, b) => a.first_paid_at - b.first_paid_at);
        const isFirstForUser = userContracts[0]?.canonical_subscription_id === c.canonical_subscription_id;
        return {
          canonical_subscription_id: c.canonical_subscription_id,
          user_id: c.userId,
          email: c.email,
          provider: c.provider,
          product: c.product,
          first_paid_at: c.first_paid_at?.toISOString() || null,
          payment_confirmation: c.first_paid_confidence === 'confirmed' ? 'confirmed' : 'inferred',
          is_users_first_paid_subscription: isFirstForUser,
          is_additional_module: userContracts.length > 1 && !isFirstForUser,
          is_migrated_or_duplicate: c.reconciliation_issues.includes('subscription_fallback') && userContracts.length > 1 && !isFirstForUser,
          deduplication_key: dedupeKey(c),
          inclusion_reason: c.first_paid_confidence === 'confirmed'
            ? 'Confirmed first payment within selected range'
            : 'Inferred first-paid date within selected range (ActiveContract.period_start fallback — labeled inferred)',
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

    // (12) First-paid evidence hierarchy summary
    const firstPaidEvidenceSummary = {
      confirmed: contracts.filter((c) => c.first_paid_confidence === 'confirmed').length,
      inferred: contracts.filter((c) => c.first_paid_confidence === 'inferred').length,
      missing: contracts.filter((c) => !c.first_paid_at).length,
    };

    // (8) Entitlement reconciliation — explains entitled vs paying difference
    const entitlementReconciliation = {
      paying: realRecords.filter((r) => r.is_currently_paying).length,
      trial: realRecords.filter((r) => r.is_trial && !r.is_currently_paying).length,
      referral_access: realRecords.filter((r) => r.is_referral_access && !r.is_currently_paying).length,
      manual_access: realRecords.filter((r) => r.is_manual_access && !r.is_currently_paying).length,
      promotional_access: realRecords.filter((r) => r.is_promotional_access && !r.is_currently_paying).length,
      canceling_but_entitled: realRecords.filter((r) => r.has_canceling_but_entitled && !r.is_currently_paying).length,
      note: 'Current entitled = paying OR trial OR referral-earned OR manual OR promotional OR canceling-but-within-period. Past-due is NOT entitled unless within grace. The difference between entitled and paying is explained by the non-paying categories above.',
    };

    return Response.json({
      meta: {
        generatedAt: now.toISOString(),
        reportVersion: 'v9-canonical',
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