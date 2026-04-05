/**
 * reportingV2Utils.js
 *
 * Pure-function helpers for the V2 User Subscription Report.
 * These mirror the logic in getUserSubscriptionReportV2/entry.ts so they can
 * be tested with Vitest in a Node/browser environment (no Deno dependencies).
 *
 * All functions are deterministic and side-effect-free.
 */

// ─── Product keywords ─────────────────────────────────────────────────────────

export const PRODUCT_KEYWORDS = [
  { key: 'pipekeeper',    matches: ['pipekeeper'] },
  { key: 'whiskeykeeper', matches: ['whiskeykeeper'] },
  { key: 'cigarkeeper',   matches: ['cigarkeeper', 'cigar'] },
  { key: 'winekeeper',    matches: ['winekeeper', 'wine'] },
];

const BUNDLE_SIGNALS = [
  'founders', 'bundle_3', 'bundle_4', '3_module', '4_module',
  'three_module', 'four_module',
];

// ─── Utilities ────────────────────────────────────────────────────────────────

export function norm(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function splitModulesCsv(csv) {
  if (!csv) return [];
  return String(csv).split(',').map((v) => v.trim().toLowerCase()).filter(Boolean);
}

// ─── Calendar ranges ──────────────────────────────────────────────────────────

/**
 * Returns UTC-aligned start/end for the given calendar period.
 * @param {'week'|'month'|'quarter'|'year'} type
 * @param {Date} now
 * @returns {{ start: Date, end: Date }}
 */
export function getCalendarRange(type, now) {
  const start = new Date(now);
  let end;

  switch (type) {
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
      end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0, 23, 59, 59, 999));
      break;
    }
    case 'quarter': {
      const q = Math.floor(start.getUTCMonth() / 3);
      start.setUTCMonth(q * 3, 1);
      start.setUTCHours(0, 0, 0, 0);
      end = new Date(Date.UTC(start.getUTCFullYear(), q * 3 + 3, 0, 23, 59, 59, 999));
      break;
    }
    case 'year': {
      start.setUTCMonth(0, 1);
      start.setUTCHours(0, 0, 0, 0);
      end = new Date(Date.UTC(start.getUTCFullYear(), 11, 31, 23, 59, 59, 999));
      break;
    }
    default:
      throw new Error(`Unknown calendar range type: ${type}`);
  }

  return { start, end };
}

// ─── Product classification ───────────────────────────────────────────────────

export function matchProductKeyword(value) {
  const v = norm(value);
  for (const { key, matches } of PRODUCT_KEYWORDS) {
    if (matches.some((m) => v.includes(m))) return key;
  }
  return null;
}

export function isBundleSignal(value) {
  const v = norm(value);
  return BUNDLE_SIGNALS.some((s) => v.includes(s)) || v.includes('bundle') || v.includes('founders');
}

/**
 * Classify bundle kind from raw subscription record.
 * @returns {'founders'|'threeModules'|'fourModules'|null}
 */
export function classifyBundleKind(sub) {
  const fields = [
    sub.product_kind, sub.bundle_name, sub.checkout_type,
    sub.subscription_tier, sub.price_id, sub.stripe_price_id,
    sub.apple_product_id, sub.plan_id, sub.plan_name, sub.name, sub.description,
  ].map(norm).join(' ');

  if (fields.includes('founders')) return 'founders';
  if (
    fields.includes('bundle_4') || fields.includes('4_module') ||
    fields.includes('four_module') ||
    (fields.includes('4 module') && fields.includes('bundle'))
  ) return 'fourModules';
  if (
    fields.includes('bundle_3') || fields.includes('3_module') ||
    fields.includes('three_module') ||
    (fields.includes('3 module') && fields.includes('bundle'))
  ) return 'threeModules';

  const ct = norm(sub.checkout_type);
  if (ct === 'bundle_4') return 'fourModules';
  if (ct === 'bundle_3') return 'threeModules';

  return null;
}

/**
 * Classify product kind from subscription metadata.
 * @param {object} sub - raw subscription record
 * @returns {{ product: string, fromFallback: boolean }}
 */
export function classifyProductKind(sub) {
  // 1. Explicit product_kind — exact match then keyword/alias match
  const pk = norm(sub.product_kind);
  if (['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'].includes(pk))
    return { product: pk, fromFallback: false };
  if (pk === 'bundle' || pk === 'founders' || isBundleSignal(pk))
    return { product: 'bundle', fromFallback: false };
  if (pk) {
    const pkMatched = matchProductKeyword(pk);
    if (pkMatched) return { product: pkMatched, fromFallback: false };
  }

  // 2. modules_csv — first recognised module
  for (const m of splitModulesCsv(sub.modules_csv)) {
    const matched = matchProductKeyword(m);
    if (matched) return { product: matched, fromFallback: false };
  }

  // 3. bundle_name / checkout_type
  for (const f of [sub.bundle_name, sub.checkout_type].filter(Boolean)) {
    if (isBundleSignal(norm(f))) return { product: 'bundle', fromFallback: false };
  }

  // 4. price_id / provider product IDs
  for (const f of [sub.price_id, sub.stripe_price_id, sub.apple_product_id, sub.plan_id].filter(Boolean)) {
    const v = norm(f);
    if (isBundleSignal(v)) return { product: 'bundle', fromFallback: false };
    const matched = matchProductKeyword(v);
    if (matched) return { product: matched, fromFallback: false };
  }

  // 5. Fuzzy fallback (records warning)
  for (const f of [sub.subscription_tier, sub.tier, sub.plan_name, sub.name, sub.description].filter(Boolean)) {
    const v = norm(f);
    if (isBundleSignal(v)) return { product: 'bundle', fromFallback: true };
    const matched = matchProductKeyword(v);
    if (matched) return { product: matched, fromFallback: true };
  }

  return { product: 'unknown', fromFallback: false };
}

// ─── Interval classification ──────────────────────────────────────────────────

/**
 * Classify billing interval from subscription metadata.
 * @returns {{ interval: 'monthly'|'annual'|'unknown', fromInference: boolean }}
 */
export function classifyInterval(sub) {
  const direct = norm(sub.billing_interval || sub.billing_period);
  if (direct === 'month' || direct === 'monthly') return { interval: 'monthly', fromInference: false };
  if (direct === 'year' || direct === 'yearly' || direct === 'annual') return { interval: 'annual', fromInference: false };

  const planId = norm(
    sub.price_id || sub.stripe_price_id || sub.apple_product_id || sub.plan_id || sub.plan_name || ''
  );
  if (planId.includes('annual') || planId.includes('yearly') || planId.includes('year'))
    return { interval: 'annual', fromInference: false };
  if (planId.includes('monthly') || planId.includes('month'))
    return { interval: 'monthly', fromInference: false };

  // Period-length inference
  const start = parseDate(sub.current_period_start);
  const end   = parseDate(sub.current_period_end);
  if (start && end) {
    const days = Math.round((end.getTime() - start.getTime()) / 86400000);
    if (days >= 300) return { interval: 'annual', fromInference: true };
    if (days >= 20 && days <= 45) return { interval: 'monthly', fromInference: true };
  }

  return { interval: 'unknown', fromInference: false };
}

// ─── Revenue math ─────────────────────────────────────────────────────────────

/**
 * MRR contribution for a single subscription.
 * monthly → full amount
 * annual  → amount / 12
 * unknown → 0
 *
 * @param {{ billingInterval: string, amount: number }} sub
 * @returns {number}
 */
export function mrrContribution(sub) {
  if (sub.billingInterval === 'monthly') return sub.amount;
  if (sub.billingInterval === 'annual')  return sub.amount / 12;
  return 0;
}

/**
 * Compute MRR and ARR from an array of canonical subscriptions.
 * Only classified (non-unknown) subscriptions with a known interval are included.
 *
 * @param {Array<{ productKind: string, billingInterval: string, amount: number }>} subs
 * @returns {{ mrr: number, arr: number }}
 */
export function computeMRR(subs) {
  const eligible = subs.filter(
    (s) =>
      s.productKind !== 'unknown' &&
      (s.billingInterval === 'monthly' || s.billingInterval === 'annual')
  );
  const totalMRR = eligible.reduce((sum, s) => sum + mrrContribution(s), 0);
  return {
    mrr: parseFloat(totalMRR.toFixed(2)),
    arr: parseFloat((totalMRR * 12).toFixed(2)),
  };
}

// ─── Account deduplication ────────────────────────────────────────────────────

/**
 * Deduplicate a list of user records by email.
 * First occurrence wins.
 * @param {Array<{ email: string }>} users
 * @returns {Array}
 */
export function deduplicateUsers(users) {
  const seen = new Set();
  return users.filter((u) => {
    const email = norm(u.email);
    if (!email || seen.has(email)) return false;
    seen.add(email);
    return true;
  });
}

// ─── Renewal revenue calculation ──────────────────────────────────────────────

/**
 * Compute renewal metrics for a calendar period.
 * A "renewal" is a classified active subscription whose currentPeriodEnd
 * falls within [periodStart, periodEnd].
 *
 * @param {Array<{ productKind: string, currentPeriodEnd: Date|null, userId: string, userEmail: string, amount: number }>} classifiedSubs
 * @param {Date} periodStart
 * @param {Date} periodEnd
 * @returns {{ customers: number, subscriptions: number, revenue: number }}
 */
export function calcRenewalPeriod(classifiedSubs, periodStart, periodEnd) {
  const renewingSubs = classifiedSubs.filter((s) => {
    if (!s.currentPeriodEnd) return false;
    return s.currentPeriodEnd >= periodStart && s.currentPeriodEnd <= periodEnd;
  });
  const customers = new Set(
    renewingSubs.map((s) => s.userId || s.userEmail).filter(Boolean)
  ).size;
  const revenue = parseFloat(
    renewingSubs.reduce((sum, s) => sum + s.amount, 0).toFixed(2)
  );
  return { customers, subscriptions: renewingSubs.length, revenue };
}
