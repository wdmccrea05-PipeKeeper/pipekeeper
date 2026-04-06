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
 *   billingInterval     ← billing_interval / billing_period → PLAN_CATALOG fallback ('monthly' | 'annual' | null)
 *   price               ← raw.amount → PLAN_CATALOG fallback (null when neither source has a known price)
 *   createdAt           ← started_at || created_date || current_period_start
 *   renewalAt           ← current_period_end
 *   planKey             ← raw.planKey / raw.plan_key (null when unknown)
 *   module              ← primary module derived from planKey → primary_module field → 'pipekeeper'
 *   modules             ← all modules for this subscription
 *   platform            ← derived from subscription provider or user record ('ios'|'web'|'google'|null)
 *
 * Valid paid subscription (for paid metrics):
 *   isPaid === true AND price !== null AND billingInterval !== null
 *
 * Excluded subscription:
 *   isPaid === true BUT price === null OR billingInterval === null
 *   Excluded subs MUST NOT count toward paid metrics or renewal metrics.
 *   They are counted separately in excludedSubscriptions.
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

// ─── Product catalog ──────────────────────────────────────────────────────────

/**
 * Explicit mapping of every known plan key to its canonical attributes.
 *
 * This is the authoritative source of truth for:
 *   - which modules a plan covers
 *   - the billing interval
 *   - the known price
 *
 * Prices mirror the display prices in src/components/subscription/stripeConfig.jsx.
 * Do NOT infer prices from raw subscription records — use this catalog first.
 *
 * NOTE: This object is intentionally duplicated in
 * base44/functions/getUserSubscriptionReportV3/entry.ts because Deno edge functions
 * cannot import from the src/ tree. Keep them in sync when editing either.
 */
export const PLAN_CATALOG = {
  // Single-module plans
  pipekeeper_pro_monthly:      { modules: ['pipekeeper'],                                                      billingInterval: 'monthly', price: 2.99  },
  pipekeeper_pro_annual:       { modules: ['pipekeeper'],                                                      billingInterval: 'annual',  price: 29.99 },
  whiskeykeeper_pro_monthly:   { modules: ['whiskeykeeper'],                                                   billingInterval: 'monthly', price: 2.99  },
  whiskeykeeper_pro_annual:    { modules: ['whiskeykeeper'],                                                   billingInterval: 'annual',  price: 29.99 },
  cigarkeeper_pro_monthly:     { modules: ['cigarkeeper'],                                                     billingInterval: 'monthly', price: 2.99  },
  cigarkeeper_pro_annual:      { modules: ['cigarkeeper'],                                                     billingInterval: 'annual',  price: 29.99 },
  winekeeper_pro_monthly:      { modules: ['winekeeper'],                                                      billingInterval: 'monthly', price: 2.99  },
  winekeeper_pro_annual:       { modules: ['winekeeper'],                                                      billingInterval: 'annual',  price: 29.99 },
  // Bundle plans
  three_module_bundle_monthly: { modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],                      billingInterval: 'monthly', price: 7.99  },
  three_module_bundle_annual:  { modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],                      billingInterval: 'annual',  price: 79.99 },
  four_module_bundle_monthly:  { modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'],        billingInterval: 'monthly', price: 8.99  },
  four_module_bundle_annual:   { modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'],        billingInterval: 'annual',  price: 89.99 },
  founders_bundle_annual:      { modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'],        billingInterval: 'annual',  price: 49.99 },
};

/**
 * Look up a planKey in the catalog.
 * Returns null when the planKey is unknown.
 *
 * @param {string|null} planKey
 * @returns {{ modules: string[], billingInterval: 'monthly'|'annual', price: number } | null}
 */
export function lookupPlanCatalog(planKey) {
  if (!planKey) return null;
  return PLAN_CATALOG[norm(planKey)] ?? null;
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
    if (userPlatform && userPlatform !== 'unknown') return 'web';
  }

  return null;
}

// ─── Normalization ────────────────────────────────────────────────────────────

/**
 * Normalize ONE raw subscription record into the V3 canonical shape.
 *
 * Price resolution order:
 *   1. raw.amount (actual billed amount if present and > 0)
 *   2. PLAN_CATALOG[planKey].price (known catalog price when amount is missing/zero)
 *   3. null (excluded from revenue and renewal metrics)
 *
 * Billing interval resolution order:
 *   1. raw.billing_interval / raw.billing_period
 *   2. PLAN_CATALOG[planKey].billingInterval
 *   3. null
 *
 * @param {object}      raw   Raw subscription record
 * @param {object|null} user  Associated user record (optional)
 * @returns {object}    Normalized subscription
 */
export function normalizeSub(raw, user = null) {
  const planKey = norm(raw.planKey || raw.plan_key || '') || null;
  const catalog = lookupPlanCatalog(planKey);

  // Price: actual billed amount first, then catalog price as fallback
  const rawPrice = Math.max(0, Number(raw.amount || 0));
  const price = rawPrice > 0 ? rawPrice : (catalog?.price ?? null);

  // Billing interval: field-based normalization first, then catalog fallback
  const fieldInterval = normalizeInterval(raw);
  const billingInterval = fieldInterval ?? (catalog?.billingInterval ?? null);

  // Module(s): use catalog when available, fall back to primary_module field, then 'pipekeeper'
  const modules = catalog?.modules ?? (norm(raw.primary_module || '') ? [norm(raw.primary_module)] : ['pipekeeper']);
  const module  = modules[0];

  return {
    rawId:           String(raw.id || raw.stripe_subscription_id || ''),
    userId:          String(raw.user_id || ''),
    userEmail:       norm(raw.user_email || ''),
    isPaid:          isActivePaid(raw),
    planKey,
    billingInterval,
    price,
    createdAt:       parseDate(raw.started_at || raw.created_date || raw.current_period_start),
    renewalAt:       parseDate(raw.current_period_end),
    module,
    modules,
    platform:        normalizePlatform(raw, user),
  };
}

/**
 * Normalize an array of raw subscription records.
 *
 * @param {object[]} rawSubs        Raw subscription records
 * @param {Map}      userByIdMap    Map of userId → user record
 * @param {Map}      userByEmailMap Map of email → user record
 * @returns {object[]} Normalized subscriptions
 */
export function normalizeSubscriptionRecords(rawSubs, userByIdMap = new Map(), userByEmailMap = new Map()) {
  return rawSubs.map((raw) => {
    const userId = String(raw.user_id || '');
    const email  = norm(raw.user_email || '');
    const user   = (userId && userByIdMap.get(userId)) ||
                   (email  && userByEmailMap.get(email)) ||
                   null;
    return normalizeSub(raw, user);
  });
}

// ─── Valid-paid check ─────────────────────────────────────────────────────────

/**
 * A normalized subscription is "valid for paid metrics" when:
 *   - it is active paid (isPaid === true)
 *   - it has a known price (price !== null)
 *   - it has a known billing interval (billingInterval !== null)
 *
 * Subscriptions that fail this check are excluded from paid metrics (Active Paid
 * Subscriptions, Paid Accounts, MRR, ARR) and from renewal metrics. They are
 * counted separately in the Excluded Subscription Issues section.
 *
 * @param {object} sub  Normalized subscription
 * @returns {boolean}
 */
export function isValidForPaidMetrics(sub) {
  return sub.isPaid && sub.price !== null && sub.billingInterval !== null;
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
 *   mrr      = round(totalMRR, 2)     (displayed MRR — single canonical source)
 *   arr      = round(mrr * 12, 2)     (derived from rounded MRR — display consistent)
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
 * Rule: only subscriptions with a valid renewal date AND a known price AND a known
 * billing interval are counted. If any of those three fields is missing, the
 * subscription cannot contribute revenue and MUST NOT be counted as a renewing
 * subscription. This guarantees that count and revenue always reconcile.
 *
 * @param {object[]} paidSubs  Normalized subscriptions
 * @param {{ start: Date, end: Date }} range  Calendar range
 * @returns {{ customers: number, subscriptions: number, revenue: number }}
 */
export function calcRenewalPeriod(paidSubs, range) {
  const renewing = paidSubs.filter(
    (s) =>
      s.renewalAt !== null &&
      inRange(s.renewalAt, range) &&
      s.price !== null &&
      s.billingInterval !== null
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

// ─── High-level metric builders ───────────────────────────────────────────────

/**
 * Build account metrics from deduplicated account records.
 *
 * Account metrics are derived ONLY from account records:
 *   - Total Accounts
 *   - Paid Accounts (accounts with at least one valid paid subscription)
 *   - Free Accounts (total - paid)
 *   - Signup Sources (web / apple / googlePlay / unknown)
 *   - New Accounts by calendar period (from account.created_at only)
 *
 * No account is excluded because subscription data is incomplete.
 *
 * @param {object[]} uniqueAccounts   Deduplicated account records
 * @param {Set<string>} paidAccountKeys  Set of userId or email for valid-paid accounts
 * @param {object} ranges             Calendar ranges from getCalendarRange
 * @returns {object} Account metrics
 */
export function buildAccountMetrics(uniqueAccounts, paidAccountKeys, ranges) {
  const total    = uniqueAccounts.length;
  const paid     = paidAccountKeys.size;
  const free     = total - paid;
  const paidPct  = total > 0 ? parseFloat(((paid / total) * 100).toFixed(1)) : 0;

  const signupSources = { web: 0, apple: 0, googlePlay: 0, unknown: 0 };
  for (const u of uniqueAccounts) {
    const platform = norm(u.data?.platform || u.platform || '');
    if (platform === 'apple' || platform === 'ios') {
      signupSources.apple++;
    } else if (platform === 'android' || platform === 'googleplay' || platform === 'google') {
      signupSources.googlePlay++;
    } else if (!platform) {
      signupSources.unknown++;
    } else {
      signupSources.web++;
    }
  }

  // New accounts use account.created_at only — never subscription data
  const newAccounts = { today: 0, week: 0, month: 0, quarter: 0, year: 0 };
  for (const u of uniqueAccounts) {
    const d = parseDate(u.created_date || u.created_at);
    if (!d) continue;
    if (inRange(d, ranges.today))   newAccounts.today++;
    if (inRange(d, ranges.week))    newAccounts.week++;
    if (inRange(d, ranges.month))   newAccounts.month++;
    if (inRange(d, ranges.quarter)) newAccounts.quarter++;
    if (inRange(d, ranges.year))    newAccounts.year++;
  }

  return { total, paid, free, paidPct, signupSources, newAccounts };
}

/**
 * Build paid subscription metrics from valid paid subscriptions only.
 *
 * Only subscriptions that pass isValidForPaidMetrics are included.
 * Excluded subscriptions (missing price or billing interval) are NOT counted here.
 *
 * @param {object[]} validPaidSubs  Normalized subs that pass isValidForPaidMetrics
 * @returns {object} Paid subscription metrics
 */
export function buildPaidMetrics(validPaidSubs) {
  const totalActivePaid = validPaidSubs.length;
  const monthly = validPaidSubs.filter((s) => s.billingInterval === 'monthly').length;
  const annual  = validPaidSubs.filter((s) => s.billingInterval === 'annual').length;

  const byProduct = { pipekeeper: 0, whiskeykeeper: 0, cigarkeeper: 0, winekeeper: 0, bundles: 0 };
  for (const sub of validPaidSubs) {
    if (sub.modules.length > 1) {
      byProduct.bundles++;
    } else {
      const m = sub.modules[0] ?? sub.module;
      if (m === 'pipekeeper')         byProduct.pipekeeper++;
      else if (m === 'whiskeykeeper') byProduct.whiskeykeeper++;
      else if (m === 'cigarkeeper')   byProduct.cigarkeeper++;
      else if (m === 'winekeeper')    byProduct.winekeeper++;
      else                            byProduct.pipekeeper++; // unknown fallback
    }
  }

  const { mrr, arr } = computeMRRARR(validPaidSubs);

  return { totalActivePaid, monthly, annual, byProduct, mrr, arr };
}

/**
 * Build renewal metrics from valid paid subscriptions.
 *
 * @param {object[]} validPaidSubs  Normalized subs that pass isValidForPaidMetrics
 * @param {object} ranges           Calendar ranges
 * @returns {object} Renewal metrics by calendar period
 */
export function buildRenewalMetrics(validPaidSubs, ranges) {
  return {
    week:    calcRenewalPeriod(validPaidSubs, ranges.week),
    month:   calcRenewalPeriod(validPaidSubs, ranges.month),
    quarter: calcRenewalPeriod(validPaidSubs, ranges.quarter),
    year:    calcRenewalPeriod(validPaidSubs, ranges.year),
  };
}

/**
 * Build excluded subscription issue counts.
 *
 * Excluded subscriptions are active-paid subscriptions that failed isValidForPaidMetrics.
 * They are counted here by exclusion reason for diagnostic purposes.
 *
 * @param {object[]} excludedSubs      Active paid subs that failed isValidForPaidMetrics
 * @param {number}   duplicatesRemoved Count of duplicate subs removed during dedup
 * @returns {object} Excluded subscription counts by reason
 */
export function buildExcludedSubscriptionMetrics(excludedSubs, duplicatesRemoved = 0) {
  let missingPrice          = 0;
  let missingBillingInterval = 0;
  let missingPlanKey        = 0;
  let orphaned              = 0;

  for (const sub of excludedSubs) {
    if (sub.price === null)           missingPrice++;
    if (sub.billingInterval === null) missingBillingInterval++;
    if (sub.planKey === null)         missingPlanKey++;
    if (!sub.userId && !sub.userEmail) orphaned++;
  }

  return {
    total: excludedSubs.length + duplicatesRemoved,
    byReason: {
      missingPrice,
      missingBillingInterval,
      missingPlanKey,
      orphaned,
      duplicatesRemoved,
    },
  };
}

// ─── Full pipeline ────────────────────────────────────────────────────────────

/**
 * Build the complete V3 user subscription report from raw data.
 *
 * This function exists so the entire pipeline can be unit-tested without Deno.
 * The Deno entry.ts duplicates the same logic inline.
 *
 * Pipeline:
 *   1. Deduplicate accounts by email
 *   2. Normalize all active paid subscriptions (dedup by subscription ID)
 *   3. Dedup per (userKey, module) — keep most recent valid sub
 *   4. Split into validPaidSubs and excludedSubs
 *   5. Build account metrics (from accounts + valid paid keys)
 *   6. Build paid metrics (from valid paid subs only)
 *   7. Build renewal metrics (from valid paid subs only)
 *   8. Build excluded subscription metrics
 *   9. Build user detail lists
 *  10. Run sanity checks
 *
 * @param {object[]} allAccounts      Raw account/user records
 * @param {object[]} allSubscriptions Raw subscription records
 * @param {Date}     now              Current time (for calendar ranges)
 * @returns {object} Full report payload
 */
export function buildUserSubscriptionReport(allAccounts, allSubscriptions, now) {
  const ranges = {
    today:   getCalendarRange('today',   now),
    week:    getCalendarRange('week',    now),
    month:   getCalendarRange('month',   now),
    quarter: getCalendarRange('quarter', now),
    year:    getCalendarRange('year',    now),
  };

  // ── Deduplicate accounts by email (first occurrence wins) ──────────────────
  const uniqueUsersMap = new Map();
  for (const u of allAccounts) {
    const email = norm(u.email || '');
    if (!email) continue;
    if (!uniqueUsersMap.has(email)) uniqueUsersMap.set(email, u);
  }
  const uniqueAccounts = [...uniqueUsersMap.values()];

  // ── User lookup maps (for platform fallback during sub normalization) ───────
  const userByIdMap    = new Map();
  const userByEmailMap = new Map();
  for (const u of uniqueAccounts) {
    if (u.id) userByIdMap.set(String(u.id), u);
    const email = norm(u.email || '');
    if (email) userByEmailMap.set(email, u);
  }

  // ── Build subscription lookup maps (for user detail lists) ────────────────
  const subsByUserId = new Map();
  const subsByEmail  = new Map();
  for (const raw of allSubscriptions) {
    if (raw.user_id) {
      if (!subsByUserId.has(raw.user_id)) subsByUserId.set(raw.user_id, []);
      subsByUserId.get(raw.user_id).push(raw);
    }
    const e = norm(raw.user_email || '');
    if (e) {
      if (!subsByEmail.has(e)) subsByEmail.set(e, []);
      subsByEmail.get(e).push(raw);
    }
  }

  function getUserRawSubs(u) {
    const email  = norm(u.email || '');
    const byId   = subsByUserId.get(u.id) || [];
    const byMail = subsByEmail.get(email) || [];
    const seen   = new Set();
    return [...byId, ...byMail].filter((s) => {
      const key = s.id || s.stripe_subscription_id || '';
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // ── Phase 1: Normalize all active paid subs (dedup by subscription ID) ─────
  const seenSubIds       = new Set();
  const allActivePaidNorm = [];
  for (const raw of allSubscriptions.filter(isActivePaid)) {
    const key = String(raw.id || raw.stripe_subscription_id || '');
    if (key && seenSubIds.has(key)) continue;
    if (key) seenSubIds.add(key);
    const userId = String(raw.user_id || '');
    const email  = norm(raw.user_email || '');
    const user   = (userId && userByIdMap.get(userId)) ||
                   (email  && userByEmailMap.get(email)) ||
                   null;
    allActivePaidNorm.push(normalizeSub(raw, user));
  }

  // ── Phase 2: Dedup per (userKey, module) — keep most recent valid sub ──────
  const paidSubsByKey  = new Map();
  let duplicatesRemoved = 0;
  for (const sub of allActivePaidNorm) {
    const userKey = sub.userId || sub.userEmail;
    if (!userKey) continue; // orphan — no account link
    const dedupKey = `${userKey}::${sub.module}`;
    const existing = paidSubsByKey.get(dedupKey);
    if (!existing) {
      paidSubsByKey.set(dedupKey, sub);
    } else {
      duplicatesRemoved++;
      const existingDate = existing.createdAt?.getTime() ?? 0;
      const subDate      = sub.createdAt?.getTime() ?? 0;
      if (subDate > existingDate) paidSubsByKey.set(dedupKey, sub);
    }
  }
  const allDedupedSubs = [...paidSubsByKey.values()];

  // ── Phase 3: Split into valid and excluded ─────────────────────────────────
  const validPaidSubs = allDedupedSubs.filter(isValidForPaidMetrics);
  const excludedSubs  = allDedupedSubs.filter((s) => !isValidForPaidMetrics(s));

  // ── Build paid account key set (from valid paid subs only) ─────────────────
  const paidAccountKeys = new Set();
  for (const sub of validPaidSubs) {
    const key = sub.userId || sub.userEmail;
    if (key) paidAccountKeys.add(key);
  }

  // ── Compute metrics ────────────────────────────────────────────────────────
  const accountMetrics  = buildAccountMetrics(uniqueAccounts, paidAccountKeys, ranges);
  const paidMetrics     = buildPaidMetrics(validPaidSubs);
  const renewalMetrics  = buildRenewalMetrics(validPaidSubs, ranges);
  const excludedMetrics = buildExcludedSubscriptionMetrics(excludedSubs, duplicatesRemoved);

  // ── Build user detail lists ────────────────────────────────────────────────
  const paidUsersList = [];
  const freeUsersList = [];

  for (const u of uniqueAccounts) {
    const isPaidUser =
      (u.id    && paidAccountKeys.has(String(u.id)))   ||
      (u.email && paidAccountKeys.has(norm(u.email)));

    const rawUserSubs        = getUserRawSubs(u);
    const activePaidUserSubs = rawUserSubs.filter(isActivePaid);
    const bestRaw            = activePaidUserSubs[0] ?? null;
    const bestSub            = bestRaw ? normalizeSub(bestRaw, u) : null;

    const row = {
      full_name:           u.full_name || '',
      email:               norm(u.email || ''),
      role:                u.role || 'user',
      created_date:        u.created_date || u.created_at || '',
      subscription_status: isPaidUser ? (norm(bestRaw?.status) || 'active') : 'none',
      billing_interval:    bestSub?.billingInterval ?? null,
      subscription_end:    bestSub?.renewalAt?.toISOString() ?? null,
      platform:            bestSub?.platform ?? null,
    };

    if (isPaidUser) paidUsersList.push(row);
    else            freeUsersList.push(row);
  }

  const sortByDate = (a, b) =>
    new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime();
  paidUsersList.sort(sortByDate);
  freeUsersList.sort(sortByDate);

  // ── Sanity checks ──────────────────────────────────────────────────────────
  const sanity = runSanityChecks({
    paidAccounts:  accountMetrics.paid,
    totalAccounts: accountMetrics.total,
    mrr:           paidMetrics.mrr,
    arr:           paidMetrics.arr,
    renewals:      renewalMetrics,
  });

  return {
    meta: {
      generatedAt:         now.toISOString(),
      dateRangeDefinition: 'calendar',
      timezoneNote:        'UTC',
      reportVersion:       'v3',
      calendarRanges: {
        today:   { start: ranges.today.start.toISOString(),   end: ranges.today.end.toISOString()   },
        week:    { start: ranges.week.start.toISOString(),    end: ranges.week.end.toISOString()    },
        month:   { start: ranges.month.start.toISOString(),   end: ranges.month.end.toISOString()   },
        quarter: { start: ranges.quarter.start.toISOString(), end: ranges.quarter.end.toISOString() },
        year:    { start: ranges.year.start.toISOString(),    end: ranges.year.end.toISOString()    },
      },
    },
    sanityChecks:          sanity,
    accounts:              accountMetrics,
    subscriptions: {
      totalActivePaid: paidMetrics.totalActivePaid,
      monthly:         paidMetrics.monthly,
      annual:          paidMetrics.annual,
      byProduct:       paidMetrics.byProduct,
    },
    runRate: {
      mrr: paidMetrics.mrr,
      arr: paidMetrics.arr,
    },
    renewalRevenue:        renewalMetrics,
    excludedSubscriptions: excludedMetrics,
    paid_users:            paidUsersList,
    free_users:            freeUsersList,
  };
}
