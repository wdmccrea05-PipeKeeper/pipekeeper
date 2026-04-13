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
 *   inferredPrice       ← true when price came from catalog inference (not raw.amount)
 *   createdAt           ← started_at || created_date || current_period_start
 *   renewalAt           ← current_period_end
 *   planKey             ← raw.planKey / raw.plan_key (null when unknown)
 *   module              ← primary module: planKey→catalog → modules_csv → primary_module → amount-bundle inference → 'unknown'
 *   modules             ← all modules for this subscription (e.g. ['pipekeeper','whiskeykeeper','cigarkeeper'] for a bundle)
 *   isBundle            ← true when modules.length > 1
 *   platform            ← derived from subscription provider or user record ('ios'|'web'|'google'|null)
 *
 * Module resolution priority (NEVER defaults to 'pipekeeper'):
 *   1. PLAN_CATALOG via planKey (authoritative)
 *   2. modules_csv stored field
 *   3. primary_module stored field
 *   4. Amount-based inference for recognized BUNDLE prices (4.99/49.99/7.99/79.99/8.99/89.99)
 *   5. 'unknown' — products that cannot be recovered stay unknown; they are NOT assumed to be PipeKeeper
 *
 * Required fields for revenue: billingInterval, price.
 * Required fields for renewal: billingInterval, price, renewalAt.
 * If price or billingInterval is missing, the subscription is excluded from revenue/renewal metrics
 * and counted in the corresponding excluded-record warning.
 * Excluded subscriptions are NEVER removed from active paid subscription counts.
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
  // ── Legacy "premium" single-module plans ─────────────────────────────────
  pipekeeper_premium_monthly:    { modules: ['pipekeeper'],                                                 billingInterval: 'monthly', price: 1.99,  label: 'PipeKeeper (Legacy)'          },
  pipekeeper_premium_annual:     { modules: ['pipekeeper'],                                                 billingInterval: 'annual',  price: 19.99, label: 'PipeKeeper (Legacy Annual)'   },
  whiskeykeeper_premium_monthly: { modules: ['whiskeykeeper'],                                              billingInterval: 'monthly', price: 1.99,  label: 'WhiskeyKeeper (Legacy)'       },
  whiskeykeeper_premium_annual:  { modules: ['whiskeykeeper'],                                              billingInterval: 'annual',  price: 19.99, label: 'WhiskeyKeeper (Legacy Annual)'},

  // ── Current "pro" single-module plans ────────────────────────────────────
  pipekeeper_pro_monthly:        { modules: ['pipekeeper'],                                                 billingInterval: 'monthly', price: 2.99,  label: 'PipeKeeper Pro'               },
  pipekeeper_pro_annual:         { modules: ['pipekeeper'],                                                 billingInterval: 'annual',  price: 29.99, label: 'PipeKeeper Pro Annual'         },
  whiskeykeeper_pro_monthly:     { modules: ['whiskeykeeper'],                                              billingInterval: 'monthly', price: 2.99,  label: 'WhiskeyKeeper Pro'            },
  whiskeykeeper_pro_annual:      { modules: ['whiskeykeeper'],                                              billingInterval: 'annual',  price: 29.99, label: 'WhiskeyKeeper Pro Annual'      },
  cigarkeeper_pro_monthly:       { modules: ['cigarkeeper'],                                                billingInterval: 'monthly', price: 2.99,  label: 'CigarKeeper Pro'              },
  cigarkeeper_pro_annual:        { modules: ['cigarkeeper'],                                                billingInterval: 'annual',  price: 29.99, label: 'CigarKeeper Pro Annual'        },
  winekeeper_pro_monthly:        { modules: ['winekeeper'],                                                 billingInterval: 'monthly', price: 2.99,  label: 'WineKeeper Pro'               },
  winekeeper_pro_annual:         { modules: ['winekeeper'],                                                 billingInterval: 'annual',  price: 29.99, label: 'WineKeeper Pro Annual'         },

  // ── Founders bundle: PipeKeeper + WhiskeyKeeper only ($4.99/mo, $49.99/yr) ─
  // Canonical definition: 2 modules. Do NOT map founders to 4 modules.
  founders_bundle_monthly:       { modules: ['pipekeeper', 'whiskeykeeper'],                               billingInterval: 'monthly', price: 4.99,  label: 'Founders Bundle (PK+WK)'      },
  founders_bundle_annual:        { modules: ['pipekeeper', 'whiskeykeeper'],                               billingInterval: 'annual',  price: 49.99, label: 'Founders Bundle Annual (PK+WK)'},

  // ── Larger bundles ────────────────────────────────────────────────────────
  three_module_bundle_monthly:   { modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],                billingInterval: 'monthly', price: 7.99,  label: '3-Module Bundle'              },
  three_module_bundle_annual:    { modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],                billingInterval: 'annual',  price: 79.99, label: '3-Module Bundle Annual'        },
  four_module_bundle_monthly:    { modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'],  billingInterval: 'monthly', price: 8.99,  label: '4-Module Bundle'              },
  four_module_bundle_annual:     { modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'],  billingInterval: 'annual',  price: 89.99, label: '4-Module Bundle Annual'        },
};

/**
 * Look up a planKey in the catalog.
 * Returns null when the planKey is unknown.
 *
 * @param {string|null} planKey
 * @returns {{ modules: string[], billingInterval: 'monthly'|'annual', price: number, label: string } | null}
 */
export function lookupPlanCatalog(planKey) {
  if (!planKey) return null;
  return PLAN_CATALOG[norm(planKey)] ?? null;
}

// ─── Amount-based inference ───────────────────────────────────────────────────

/**
 * Infer billing attributes from a known subscription amount.
 *
 * Valid prices (current and legacy):
 *   1.99 / 19.99  → legacy single-module
 *   2.99 / 29.99  → current single-module pro
 *   4.99 / 49.99  → Founders Bundle (PK + WK, 2 modules)
 *   7.99 / 79.99  → 3-module bundle
 *   8.99 / 89.99  → 4-module bundle
 *
 * INVALID (do not treat as known plans):
 *   9.99 / 99.99  → not a valid current plan
 *
 * For single-module amounts (1.99/19.99/2.99/29.99), modules cannot be
 * determined from price alone — only interval is inferred.
 * For bundle amounts, modules are fully resolved from the price.
 *
 * @param {number} amount
 * @returns {{ billingInterval: 'monthly'|'annual', modules: string[]|null, isBundle: boolean } | null}
 */
export function inferFromAmount(amount) {
  const a = parseFloat(Number(amount).toFixed(2));
  // Single-module plans: interval known, module unknown
  if (a === 1.99)  return { billingInterval: 'monthly', modules: null, isBundle: false };
  if (a === 19.99) return { billingInterval: 'annual',  modules: null, isBundle: false };
  if (a === 2.99)  return { billingInterval: 'monthly', modules: null, isBundle: false };
  if (a === 29.99) return { billingInterval: 'annual',  modules: null, isBundle: false };
  // Founders bundle: PK + WK only
  if (a === 4.99)  return { billingInterval: 'monthly', modules: ['pipekeeper', 'whiskeykeeper'], isBundle: true };
  if (a === 49.99) return { billingInterval: 'annual',  modules: ['pipekeeper', 'whiskeykeeper'], isBundle: true };
  // 3-module bundle
  if (a === 7.99)  return { billingInterval: 'monthly', modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'], isBundle: true };
  if (a === 79.99) return { billingInterval: 'annual',  modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'], isBundle: true };
  // 4-module bundle
  if (a === 8.99)  return { billingInterval: 'monthly', modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'], isBundle: true };
  if (a === 89.99) return { billingInterval: 'annual',  modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'], isBundle: true };
  return null;
}



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
 * Normalize ONE raw subscription record into the V3 canonical shape.
 *
 * Module resolution priority (NEVER defaults to 'pipekeeper'):
 *   1. PLAN_CATALOG via planKey → authoritative (modules + interval + price)
 *   2. modules_csv stored field → explicit
 *   3. primary_module stored field → explicit single module
 *   4. inferFromAmount for BUNDLE amounts → resolves modules from price
 *   5. 'unknown' — products that cannot be recovered stay unknown
 *
 * Price resolution order:
 *   1. raw.amount (actual billed amount if present and > 0)
 *   2. PLAN_CATALOG[planKey].price (known catalog price when amount is missing/zero; inferredPrice=true)
 *   3. null (excluded from revenue and renewal metrics; counted in warnings)
 *
 * Billing interval resolution order:
 *   1. raw.billing_interval / raw.billing_period (field-based normalization)
 *   2. PLAN_CATALOG[planKey].billingInterval (catalog fallback)
 *   3. inferFromAmount (amount-based fallback)
 *   4. null
 *
 * @param {object}      raw   Raw subscription record
 * @param {object|null} user  Associated user record (optional, used for platform fallback)
 * @returns {object}    Normalized subscription
 */
export function normalizeSub(raw, user = null) {
  const planKey = norm(raw.planKey || raw.plan_key || '') || null;
  const catalog = lookupPlanCatalog(planKey);

  // Price: actual billed amount first, then catalog price as fallback
  const rawPrice = Math.max(0, Number(raw.amount || 0));
  const inferredPrice = rawPrice === 0 && catalog != null;
  const price = rawPrice > 0 ? rawPrice : (catalog?.price ?? null);

  // Amount inference (for interval and bundle-module resolution when catalog/fields are missing)
  const amountInference = rawPrice > 0 ? inferFromAmount(rawPrice) : null;

  // Billing interval: field → catalog → amount inference → null
  const fieldInterval = normalizeInterval(raw);
  const billingInterval = fieldInterval ?? (catalog?.billingInterval ?? (amountInference?.billingInterval ?? null));

  // Module(s) resolution — NEVER defaults to 'pipekeeper'
  let modules;
  if (catalog) {
    // 1. Authoritative catalog match via planKey
    modules = catalog.modules;
  } else {
    // 2. modules_csv stored field
    const csvModules = String(raw.modules_csv || '')
      .split(',')
      .map((m) => m.trim().toLowerCase())
      .filter(Boolean);
    if (csvModules.length > 0) {
      modules = csvModules;
    } else if (norm(raw.primary_module || '')) {
      // 3. primary_module stored field
      modules = [norm(raw.primary_module)];
    } else if (amountInference?.modules) {
      // 4. Amount inference resolves bundle modules
      modules = amountInference.modules;
    } else {
      // 5. Truly unknown — do NOT default to 'pipekeeper'
      modules = ['unknown'];
    }
  }

  const module   = modules[0];
  const isBundle = modules.length > 1;

  return {
    rawId:          String(raw.id || raw.stripe_subscription_id || ''),
    userId:         String(raw.user_id || ''),
    userEmail:      norm(raw.user_email || ''),
    isPaid:         isActivePaid(raw),
    planKey,
    billingInterval,
    price,
    inferredPrice,
    createdAt:      parseDate(raw.started_at || raw.created_date || raw.current_period_start),
    renewalAt:      parseDate(raw.current_period_end),
    module,
    modules,
    isBundle,
    platform:       normalizePlatform(raw, user),
  };
}

// ─── Subscription deduplication ──────────────────────────────────────────────

/**
 * Compute the product-family key used to detect duplicate subscriptions.
 *
 * Rules:
 *  - Bundles: keyed on sorted module list (same modules = same product)
 *  - Single modules: keyed on module name
 *  - Unknown products: each gets a unique key (no collapsing of unknowns)
 *
 * @param {object} sub  Normalized subscription
 * @returns {string}
 */
export function getProductFamilyKey(sub) {
  if (sub.isBundle) {
    return 'bundle::' + [...sub.modules].sort().join(',');
  }
  if (sub.module === 'unknown') {
    // Unknown products do not collapse — use rawId as unique identifier.
    // If rawId is also empty (malformed row), fall back to other deterministic fields.
    return 'unknown::' + (sub.rawId || sub.userEmail || sub.planKey || sub.userId || 'empty');
  }
  return 'single::' + sub.module;
}

/**
 * Deduplicate normalized active-paid subscriptions by (userIdentity, productFamily).
 * For each group, keeps the most recent active row.
 *
 * Business rules:
 *  - Dedupe key = user identity (userId or email) + canonical product family
 *  - Keep the most recent row per grouping (by createdAt, then rawId as tiebreak)
 *  - Unknown products are never collapsed with each other
 *
 * @param {object[]} normalizedSubs  Array of normalized active-paid subscriptions
 * @returns {{ deduped: object[], duplicatesRemoved: number }}
 */
export function deduplicateActivePaidSubs(normalizedSubs) {
  const byKey = new Map();
  let duplicatesRemoved = 0;

  for (const sub of normalizedSubs) {
    const userKey = sub.userId || sub.userEmail;
    if (!userKey) continue;
    const dedupKey = `${userKey}::${getProductFamilyKey(sub)}`;
    const existing = byKey.get(dedupKey);
    if (!existing) {
      byKey.set(dedupKey, sub);
    } else {
      duplicatesRemoved++;
      const existingTs = existing.createdAt?.getTime() ?? 0;
      const subTs = sub.createdAt?.getTime() ?? 0;
      if (subTs > existingTs) byKey.set(dedupKey, sub);
    }
  }

  return { deduped: [...byKey.values()], duplicatesRemoved };
}



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
 * Rule 6: only subscriptions with a valid renewal date AND a known price AND a known
 * billing interval are counted. If any of those three fields is missing, the
 * subscription cannot contribute revenue and therefore MUST NOT be counted as a
 * renewing subscription. This guarantees that count and revenue always reconcile.
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
