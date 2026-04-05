import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

// ─── Report version ───────────────────────────────────────────────────────────

const REPORT_VERSION = 'v2';

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductKind =
  | 'pipekeeper'
  | 'whiskeykeeper'
  | 'cigarkeeper'
  | 'winekeeper'
  | 'bundle'
  | 'unknown';

type BundleKind = 'founders' | 'threeModules' | 'fourModules' | null;
type IntervalKind = 'monthly' | 'annual' | 'unknown';
type ProviderKind = 'stripe' | 'apple' | 'google' | 'unknown';
type SignupSource = 'web' | 'apple' | 'google' | 'unknown';

interface CanonicalSubscription {
  subscriptionId: string;
  userId: string;
  userEmail: string;
  provider: ProviderKind;
  status: string;
  productKind: ProductKind;
  bundleKind: BundleKind;
  billingInterval: IntervalKind;
  amount: number;
  currency: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  startedAt: Date | null;
  isPaid: boolean;
  isTrial: boolean;
  isActive: boolean;
  classificationWarnings: string[];
}

interface CalendarRange {
  start: Date;
  end: Date;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function norm(value: any): string {
  return String(value ?? '').trim().toLowerCase();
}

function normEmail(email: any): string {
  return norm(email);
}

function parseDate(value: any): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function splitModulesCsv(csv: any): string[] {
  if (!csv) return [];
  return String(csv)
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

// ─── Calendar ranges ──────────────────────────────────────────────────────────

/**
 * Returns UTC-aligned calendar period boundaries.
 * week    = current ISO week (Monday 00:00 → Sunday 23:59:59 UTC)
 * month   = current calendar month
 * quarter = current calendar quarter
 * year    = current calendar year
 */
function getCalendarRange(
  type: 'week' | 'month' | 'quarter' | 'year',
  now: Date
): CalendarRange {
  const start = new Date(now);
  let end: Date;

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
  }

  return { start, end };
}

// ─── Provider detection ───────────────────────────────────────────────────────

function detectProvider(sub: any): ProviderKind {
  const p = norm(sub.provider);
  if (p === 'stripe') return 'stripe';
  if (p === 'apple' || sub.apple_product_id) return 'apple';
  if (p === 'google' || p === 'googleplay') return 'google';
  if (sub.stripe_subscription_id || sub.stripe_price_id) return 'stripe';
  if (p) return 'unknown';
  return 'stripe'; // default assumption
}

// ─── Product classification ───────────────────────────────────────────────────

const PRODUCT_KEYWORDS: { key: ProductKind; matches: string[] }[] = [
  { key: 'pipekeeper', matches: ['pipekeeper'] },
  { key: 'whiskeykeeper', matches: ['whiskeykeeper'] },
  { key: 'cigarkeeper', matches: ['cigarkeeper', 'cigar'] },
  { key: 'winekeeper', matches: ['winekeeper', 'wine'] },
];

const BUNDLE_SIGNALS = ['founders', 'bundle_3', 'bundle_4', '3_module', '4_module', 'three_module', 'four_module'];

function matchProductKeyword(value: string): ProductKind | null {
  const v = norm(value);
  for (const { key, matches } of PRODUCT_KEYWORDS) {
    if (matches.some((m) => v.includes(m))) return key;
  }
  return null;
}

function isBundleSignal(value: string): boolean {
  const v = norm(value);
  return BUNDLE_SIGNALS.some((s) => v.includes(s)) ||
    v.includes('bundle') ||
    v.includes('founders');
}

/**
 * Detect bundle kind from a subscription record.
 * Returns null if the subscription is not a bundle.
 */
function classifyBundleKind(sub: any): BundleKind | null {
  const fields = [
    sub.product_kind,
    sub.bundle_name,
    sub.checkout_type,
    sub.subscription_tier,
    sub.price_id,
    sub.stripe_price_id,
    sub.apple_product_id,
    sub.plan_id,
    sub.plan_name,
    sub.name,
    sub.description,
  ]
    .map(norm)
    .join(' ');

  if (fields.includes('founders')) return 'founders';
  if (
    fields.includes('bundle_4') ||
    fields.includes('4_module') ||
    fields.includes('four_module') ||
    (fields.includes('4 module') && fields.includes('bundle'))
  )
    return 'fourModules';
  if (
    fields.includes('bundle_3') ||
    fields.includes('3_module') ||
    fields.includes('three_module') ||
    (fields.includes('3 module') && fields.includes('bundle'))
  )
    return 'threeModules';

  // checkout_type exact match fallback
  const ct = norm(sub.checkout_type);
  if (ct === 'bundle_4') return 'fourModules';
  if (ct === 'bundle_3') return 'threeModules';

  return null;
}

/**
 * Classify product kind from subscription metadata.
 * Priority order:
 *  1. explicit product_kind field
 *  2. modules_csv first recognised entry
 *  3. bundle_name / checkout_type signals → 'bundle'
 *  4. price_id / provider product IDs
 *  5. subscription_tier / tier / plan_name / plan_id / name / description
 * Returns 'unknown' only when no signal is found.
 */
function classifyProductKind(sub: any): { product: ProductKind; fromFallback: boolean } {
  // 1. Explicit product_kind — exact match then keyword/alias match
  const pk = norm(sub.product_kind);
  if (pk === 'pipekeeper' || pk === 'whiskeykeeper' || pk === 'cigarkeeper' || pk === 'winekeeper')
    return { product: pk as ProductKind, fromFallback: false };
  if (pk === 'bundle' || pk === 'founders' || isBundleSignal(pk))
    return { product: 'bundle', fromFallback: false };
  if (pk) {
    const pkMatched = matchProductKeyword(pk);
    if (pkMatched) return { product: pkMatched, fromFallback: false };
  }

  // 2. modules_csv — use first recognised module
  for (const m of splitModulesCsv(sub.modules_csv)) {
    const matched = matchProductKeyword(m);
    if (matched) return { product: matched, fromFallback: false };
  }

  // 3. bundle_name / checkout_type
  const bundleFields = [sub.bundle_name, sub.checkout_type].filter(Boolean);
  for (const f of bundleFields) {
    if (isBundleSignal(norm(f))) return { product: 'bundle', fromFallback: false };
  }

  // 4. price_id / provider product IDs
  const priceFields = [sub.price_id, sub.stripe_price_id, sub.apple_product_id, sub.plan_id].filter(Boolean);
  for (const f of priceFields) {
    const v = norm(f);
    if (isBundleSignal(v)) return { product: 'bundle', fromFallback: false };
    const matched = matchProductKeyword(v);
    if (matched) return { product: matched, fromFallback: false };
  }

  // 5. Fuzzy fallback on tier / plan_name / name / description (record warning)
  const fuzzyFields = [sub.subscription_tier, sub.tier, sub.plan_name, sub.name, sub.description].filter(Boolean);
  for (const f of fuzzyFields) {
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
 * Priority order:
 *  1. billing_interval / billing_period
 *  2. plan ID / price ID keyword match
 *  3. period-length inference (records warning)
 *  4. Returns 'unknown' when undetermined
 */
function classifyInterval(sub: any): { interval: IntervalKind; fromInference: boolean } {
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

  // Period-length inference (with warning)
  const start = parseDate(sub.current_period_start);
  const end = parseDate(sub.current_period_end);
  if (start && end) {
    const days = Math.round((end.getTime() - start.getTime()) / 86400000);
    if (days >= 300) return { interval: 'annual', fromInference: true };
    if (days >= 20 && days <= 45) return { interval: 'monthly', fromInference: true };
  }

  return { interval: 'unknown', fromInference: false };
}

// ─── Active subscription detection ───────────────────────────────────────────

function isActivePaidStatus(sub: any, now: Date): boolean {
  const status = norm(sub.status);
  if (!['active', 'trialing', 'past_due'].includes(status)) return false;

  const provider = detectProvider(sub);
  const isApple = provider === 'apple';

  if (status === 'active') {
    // Apple subscriptions don't reliably update current_period_end
    if (!isApple) {
      const end = parseDate(sub.current_period_end);
      if (end && end <= now) return false;
    }
    return true;
  }

  if (status === 'trialing') {
    // Only count trialing if there's an amount (trial with payment on file)
    if (Math.max(0, Number(sub.amount || 0)) <= 0) return false;
    if (!isApple) {
      const end = parseDate(sub.current_period_end);
      if (end && end <= now) return false;
    }
    return true;
  }

  if (status === 'past_due') {
    if (!isApple) {
      const end = parseDate(sub.current_period_end);
      if (end && end <= now) return false;
    }
    return true;
  }

  return false;
}

// ─── Normalization layer ──────────────────────────────────────────────────────

/**
 * Normalize a raw subscription record into the canonical shape.
 * Records classification warnings but does NOT throw.
 * Unknown product is preserved so the warning bucket catches it.
 */
function normalizeSubscription(sub: any, stripeAmountMap: Record<string, number>, now: Date): CanonicalSubscription {
  const subscriptionId = String(
    sub.id || sub.provider_subscription_id || sub.stripe_subscription_id || ''
  );
  const userId = String(sub.user_id || '');
  const userEmail = normEmail(sub.user_email);
  const provider = detectProvider(sub);
  const status = norm(sub.status);

  const warnings: string[] = [];

  // Resolve amount
  let amount: number;
  if (provider === 'stripe') {
    const stripeId = sub.provider_subscription_id || sub.stripe_subscription_id;
    const fromStripe = stripeId ? (stripeAmountMap[stripeId] || 0) : 0;
    amount = fromStripe > 0 ? fromStripe : Math.max(0, Number(sub.amount || 0));
  } else {
    amount = Math.max(0, Number(sub.amount || 0));
  }
  if (amount === 0) {
    warnings.push('amount_missing_or_zero');
  }

  // Classify product
  const { product: productKind, fromFallback: productFromFallback } = classifyProductKind(sub);
  if (productKind === 'unknown') {
    warnings.push('product_unclassified');
  } else if (productFromFallback) {
    warnings.push('product_from_fuzzy_fallback');
  }

  // Classify bundle
  let bundleKind: BundleKind = null;
  if (productKind === 'bundle') {
    bundleKind = classifyBundleKind(sub);
    if (!bundleKind) {
      warnings.push('bundle_type_unknown');
    }
  }

  // Classify interval
  const { interval: billingInterval, fromInference: intervalFromInference } = classifyInterval(sub);
  if (billingInterval === 'unknown') {
    warnings.push('interval_unknown');
  } else if (intervalFromInference) {
    warnings.push('interval_from_period_inference');
  }

  const isTrial = status === 'trialing' || status === 'trial';
  const isActive = isActivePaidStatus(sub, now);

  return {
    subscriptionId,
    userId,
    userEmail,
    provider,
    status,
    productKind,
    bundleKind,
    billingInterval,
    amount,
    currency: norm(sub.currency) || 'usd',
    currentPeriodStart: parseDate(sub.current_period_start),
    currentPeriodEnd:   parseDate(sub.current_period_end),
    startedAt:          parseDate(sub.started_at || sub.current_period_start),
    isPaid: !isTrial || amount > 0,
    isTrial,
    isActive,
    classificationWarnings: warnings,
  };
}

// ─── Revenue math ─────────────────────────────────────────────────────────────

/**
 * Compute MRR contribution for a single classified subscription.
 * Monthly → full amount.
 * Annual  → amount / 12.
 * Unknown → 0 (excluded from MRR; counted in warnings).
 */
function mrrContribution(sub: CanonicalSubscription): number {
  if (sub.billingInterval === 'monthly') return sub.amount;
  if (sub.billingInterval === 'annual') return sub.amount / 12;
  return 0;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();

    if (authUser?.role !== 'admin') {
      return Response.json(
        {
          error: 'Forbidden: Admin access required',
          meta: { generatedAt: new Date().toISOString(), reportVersion: REPORT_VERSION },
        },
        { status: 403 }
      );
    }

    // ── Paginated fetch ───────────────────────────────────────────────────────
    const fetchAll = async (entity: any): Promise<any[]> => {
      const PAGE = 100;
      const items: any[] = [];
      let skip = 0;
      while (true) {
        let page = await entity.list(null, PAGE, skip);
        if (typeof page === 'string') {
          try { page = JSON.parse(page); } catch { break; }
        }
        if (!Array.isArray(page) || page.length === 0) break;
        items.push(...page);
        if (page.length < PAGE) break;
        skip += PAGE;
      }
      return items;
    };

    const [allUsers, allSubscriptions] = await Promise.all([
      fetchAll(base44.asServiceRole.entities.User),
      fetchAll(base44.asServiceRole.entities.Subscription),
    ]);

    const now = new Date();

    // ── Calendar ranges ───────────────────────────────────────────────────────
    const ranges = {
      week:    getCalendarRange('week',    now),
      month:   getCalendarRange('month',   now),
      quarter: getCalendarRange('quarter', now),
      year:    getCalendarRange('year',    now),
    };

    // ── Stripe amount lookup (best-effort; falls back to stored amount) ────────
    const stripeAmountMap: Record<string, number> = {};
    try {
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
      if (stripeKey) {
        const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
        let hasMore = true;
        let startingAfter: string | undefined;
        let fetchCount = 0;
        while (hasMore && fetchCount < 5) {
          const params: any = { limit: 100, status: 'active', expand: ['data.plan'] };
          if (startingAfter) params.starting_after = startingAfter;
          const stripePage = await stripe.subscriptions.list(params);
          for (const s of stripePage.data) {
            const cents =
              s.items?.data?.[0]?.price?.unit_amount ||
              (s as any).plan?.amount ||
              0;
            stripeAmountMap[s.id] = cents / 100;
          }
          hasMore = stripePage.has_more;
          if (hasMore && stripePage.data.length > 0) {
            startingAfter = stripePage.data[stripePage.data.length - 1].id;
          } else {
            hasMore = false;
          }
          fetchCount++;
        }
      }
    } catch {
      // Stripe unavailable — fall through to stored amounts
    }

    // ── Deduplicate users by email ────────────────────────────────────────────
    const uniqueUsersMap = new Map<string, any>();
    for (const u of allUsers) {
      const email = normEmail(u.email);
      if (!email) continue;
      if (!uniqueUsersMap.has(email)) uniqueUsersMap.set(email, u);
    }
    const uniqueUsers = [...uniqueUsersMap.values()];

    // ── Build subscription lookup maps ────────────────────────────────────────
    const subsByUserId  = new Map<string, any[]>();
    const subsByEmail   = new Map<string, any[]>();
    for (const sub of allSubscriptions) {
      if (sub.user_id) {
        if (!subsByUserId.has(sub.user_id)) subsByUserId.set(sub.user_id, []);
        subsByUserId.get(sub.user_id)!.push(sub);
      }
      const e = normEmail(sub.user_email);
      if (e) {
        if (!subsByEmail.has(e)) subsByEmail.set(e, []);
        subsByEmail.get(e)!.push(sub);
      }
    }

    function getUserSubs(u: any): any[] {
      const email  = normEmail(u.email);
      const byId   = subsByUserId.get(u.id)    || [];
      const byMail = subsByEmail.get(email)     || [];
      const seen   = new Set<string>();
      return [...byId, ...byMail].filter((s) => {
        const key = s.id || s.provider_subscription_id || s.stripe_subscription_id;
        if (!key) return true;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    // ── Normalize and classify active paid subscriptions ─────────────────────
    const rawActiveSubs = allSubscriptions.filter((s) => isActivePaidStatus(s, now));

    // Warning counters
    let unclassifiedSubscriptions = 0;
    let unknownIntervals = 0;
    let missingAmounts = 0;
    let recordsExcluded = 0;
    const warningMessages: string[] = [];

    const normalized: CanonicalSubscription[] = [];

    for (const raw of rawActiveSubs) {
      const userId    = String(raw.user_id || '');
      const userEmail = normEmail(raw.user_email);
      if (!userId && !userEmail) {
        recordsExcluded++;
        warningMessages.push(
          `Subscription "${raw.id || 'unknown'}" excluded: no user_id and no user_email.`
        );
        continue;
      }

      const canonical = normalizeSubscription(raw, stripeAmountMap, now);
      normalized.push(canonical);

      if (canonical.productKind === 'unknown') {
        unclassifiedSubscriptions++;
        warningMessages.push(
          `Subscription "${canonical.subscriptionId}" (user: "${canonical.userId || canonical.userEmail}") ` +
          `could not be classified to a known product. Add product metadata to resolve.`
        );
      }
      if (canonical.billingInterval === 'unknown') {
        unknownIntervals++;
      }
      if (canonical.amount === 0) {
        missingAmounts++;
      }
    }

    if (unclassifiedSubscriptions > 0) {
      warningMessages.push(
        `${unclassifiedSubscriptions} subscription(s) have no recognisable product metadata ` +
        `and are excluded from product and revenue metrics.`
      );
    }
    if (unknownIntervals > 0) {
      warningMessages.push(
        `${unknownIntervals} subscription(s) have an unresolvable billing interval ` +
        `and are excluded from MRR/ARR calculations.`
      );
    }
    if (missingAmounts > 0) {
      warningMessages.push(
        `${missingAmounts} subscription(s) have a missing or zero amount ` +
        `and contribute $0 to revenue metrics.`
      );
    }

    // ── Classified subs only (for financial metrics) ──────────────────────────
    const classifiedSubs = normalized.filter((s) => s.productKind !== 'unknown');

    // ── Subscription counts ───────────────────────────────────────────────────
    const totalActivePaidSubscriptions = normalized.length;
    const uniquePayingUsersSet = new Set(
      normalized.map((s) => s.userId || s.userEmail).filter(Boolean)
    );
    const uniquePayingUsers = uniquePayingUsersSet.size;
    const monthlySubscriptions = normalized.filter((s) => s.billingInterval === 'monthly').length;
    const annualSubscriptions  = normalized.filter((s) => s.billingInterval === 'annual').length;

    // ── Product counts (classified only) ─────────────────────────────────────
    const byProduct = {
      pipekeeper:    classifiedSubs.filter((s) => s.productKind === 'pipekeeper').length,
      whiskeykeeper: classifiedSubs.filter((s) => s.productKind === 'whiskeykeeper').length,
      cigarkeeper:   classifiedSubs.filter((s) => s.productKind === 'cigarkeeper').length,
      winekeeper:    classifiedSubs.filter((s) => s.productKind === 'winekeeper').length,
    };

    // ── Bundle counts ─────────────────────────────────────────────────────────
    const bundleSubs = classifiedSubs.filter((s) => s.productKind === 'bundle');
    const byBundle = {
      founders:     bundleSubs.filter((s) => s.bundleKind === 'founders').length,
      threeModules: bundleSubs.filter((s) => s.bundleKind === 'threeModules').length,
      fourModules:  bundleSubs.filter((s) => s.bundleKind === 'fourModules').length,
    };

    // ── MRR / ARR (classified subs with known interval only) ─────────────────
    const mrrSubs = classifiedSubs.filter(
      (s) => s.billingInterval === 'monthly' || s.billingInterval === 'annual'
    );
    const totalMRR = mrrSubs.reduce((sum, s) => sum + mrrContribution(s), 0);
    const mrr = parseFloat(totalMRR.toFixed(2));
    const arr = parseFloat((totalMRR * 12).toFixed(2));

    // ── Revenue by product (raw billing amounts, classified subs) ─────────────
    const revenueByProduct = {
      pipekeeper:    parseFloat(classifiedSubs.filter((s) => s.productKind === 'pipekeeper').reduce((sum, s) => sum + s.amount, 0).toFixed(2)),
      whiskeykeeper: parseFloat(classifiedSubs.filter((s) => s.productKind === 'whiskeykeeper').reduce((sum, s) => sum + s.amount, 0).toFixed(2)),
      cigarkeeper:   parseFloat(classifiedSubs.filter((s) => s.productKind === 'cigarkeeper').reduce((sum, s) => sum + s.amount, 0).toFixed(2)),
      winekeeper:    parseFloat(classifiedSubs.filter((s) => s.productKind === 'winekeeper').reduce((sum, s) => sum + s.amount, 0).toFixed(2)),
    };

    // ── Revenue by bundle (raw billing amounts) ───────────────────────────────
    const revenueByBundle = {
      founders:     parseFloat(bundleSubs.filter((s) => s.bundleKind === 'founders').reduce((sum, s) => sum + s.amount, 0).toFixed(2)),
      threeModules: parseFloat(bundleSubs.filter((s) => s.bundleKind === 'threeModules').reduce((sum, s) => sum + s.amount, 0).toFixed(2)),
      fourModules:  parseFloat(bundleSubs.filter((s) => s.bundleKind === 'fourModules').reduce((sum, s) => sum + s.amount, 0).toFixed(2)),
    };

    // ── Renewal revenue and renewal counts by calendar period ─────────────────
    //
    // A "renewal" is a classified active subscription whose current_period_end
    // falls within the given calendar period (including periods already past today
    // within the range, to cover the full calendar period).
    //
    function calcRenewalPeriod(periodStart: Date, periodEnd: Date) {
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

    const renewalWeek    = calcRenewalPeriod(ranges.week.start,    ranges.week.end);
    const renewalMonth   = calcRenewalPeriod(ranges.month.start,   ranges.month.end);
    const renewalQuarter = calcRenewalPeriod(ranges.quarter.start, ranges.quarter.end);
    const renewalYear    = calcRenewalPeriod(ranges.year.start,    ranges.year.end);

    // ── User-level paid / free classification ─────────────────────────────────
    const paidUsersList: any[] = [];
    const freeUsersList: any[] = [];

    const rankSub = (s: any): number => {
      const st = norm(s.status);
      if (st === 'active')                       return 5;
      if (st === 'trialing' || st === 'trial')   return 4;
      if (st === 'incomplete')                   return 3;
      if (st === 'past_due')                     return 2;
      return 1;
    };

    for (const u of uniqueUsers) {
      const email     = normEmail(u.email);
      if (!email) continue;

      const userSubs       = getUserSubs(u);
      const activeUserSubs = userSubs.filter((s) => isActivePaidStatus(s, now));
      let isPaid           = activeUserSubs.length > 0;

      // Honour entitlement fields when no subscription record is found
      if (!isPaid && u.data) {
        const et = norm(u.data.entitlement_tier);
        const st = norm(u.data.subscription_tier);
        if (['premium', 'pro'].includes(et) || ['premium', 'pro'].includes(st)) {
          isPaid = true;
        }
      }

      const validSubs = userSubs.filter((s) => norm(s.status) !== 'incomplete_expired');
      const bestSub   = validSubs.length > 0
        ? [...validSubs].sort((a, b) => {
            const rd = rankSub(b) - rankSub(a);
            return rd !== 0
              ? rd
              : new Date(b.created_date || '1970').getTime() -
                new Date(a.created_date || '1970').getTime();
          })[0]
        : null;

      const row = {
        full_name:           u.full_name || '',
        email,
        role:                u.role || 'user',
        platform:            u.data?.platform || u.platform || 'web',
        created_date:        u.created_date || '',
        subscription_status: bestSub?.status || (isPaid ? 'active' : 'none'),
        subscription_tier:   bestSub?.subscription_tier || bestSub?.tier || (isPaid ? 'premium' : 'none'),
        subscription_end:    bestSub?.current_period_end || null,
        billing_interval:    bestSub ? classifyInterval(bestSub).interval : null,
      };

      if (isPaid) paidUsersList.push(row);
      else        freeUsersList.push(row);
    }

    // Sort by newest first
    const sortByDate = (a: any, b: any) =>
      new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime();
    paidUsersList.sort(sortByDate);
    freeUsersList.sort(sortByDate);

    const totalUsers     = uniqueUsers.length;
    const paidUsersCount = paidUsersList.length;
    const freeUsersCount = freeUsersList.length;

    // ── Signup sources ────────────────────────────────────────────────────────
    const signupSources = { web: 0, apple: 0, google: 0, unknown: 0 };
    for (const u of uniqueUsers) {
      const platform = norm(u.data?.platform || u.platform || '');
      if (platform === 'apple' || platform === 'ios') {
        signupSources.apple++;
      } else if (platform === 'android' || platform === 'googleplay' || platform === 'google') {
        signupSources.google++;
      } else if (!platform) {
        signupSources.unknown++;
      } else {
        signupSources.web++;
      }
    }

    // ── New accounts by calendar period ───────────────────────────────────────
    const newAccounts = { week: 0, month: 0, quarter: 0, year: 0 };
    for (const u of uniqueUsers) {
      const d = parseDate(u.created_date);
      if (!d) continue;
      if (d >= ranges.week.start    && d <= ranges.week.end)    newAccounts.week++;
      if (d >= ranges.month.start   && d <= ranges.month.end)   newAccounts.month++;
      if (d >= ranges.quarter.start && d <= ranges.quarter.end) newAccounts.quarter++;
      if (d >= ranges.year.start    && d <= ranges.year.end)    newAccounts.year++;
    }

    // ── Trial metrics ─────────────────────────────────────────────────────────
    const trialSubs = allSubscriptions.filter(
      (s) => norm(s.status) === 'trial' || norm(s.status) === 'trialing'
    );
    const now3d = new Date(now.getTime() + 3 * 86400000);
    const now7d = new Date(now.getTime() + 7 * 86400000);
    const now30dAgo = new Date(now.getTime() - 30 * 86400000);

    const currentlyOnTrial = trialSubs.filter((s) => {
      const end = parseDate(s.trial_end_date || s.current_period_end);
      return end && end > now;
    });

    const daysRemaining = currentlyOnTrial.map((s) => {
      const end = parseDate(s.trial_end_date || s.current_period_end)!;
      return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
    });
    const avgDaysRemaining =
      daysRemaining.length > 0
        ? Math.round(daysRemaining.reduce((a, b) => a + b, 0) / daysRemaining.length)
        : 0;

    const endingIn3Days = currentlyOnTrial.filter((s) => {
      const end = parseDate(s.trial_end_date || s.current_period_end)!;
      return end <= now3d;
    }).length;

    const endingIn7Days = currentlyOnTrial.filter((s) => {
      const end = parseDate(s.trial_end_date || s.current_period_end)!;
      return end <= now7d;
    }).length;

    const convertedLast30d = allSubscriptions.filter((s) => {
      const created = parseDate(s.created_date);
      return (
        created && created >= now30dAgo &&
        norm(s.status) === 'active' &&
        Number(s.amount || 0) > 0
      );
    }).length;

    const dropoffLast30d = allSubscriptions.filter((s) => {
      const trialEnd = parseDate(s.trial_end_date);
      const status   = norm(s.status);
      return (
        trialEnd &&
        trialEnd >= now30dAgo &&
        trialEnd <= now &&
        ['trial', 'expired', 'canceled'].includes(status)
      );
    }).length;

    // ── Conversion metrics ────────────────────────────────────────────────────
    const freeToPaidPct =
      totalUsers > 0 ? parseFloat(((paidUsersCount / totalUsers) * 100).toFixed(1)) : 0;

    // Multi-module = users with a bundle sub OR multiple classified subs
    const multiModuleUserIds = new Set<string>();
    const subCountByUser = new Map<string, number>();
    for (const s of classifiedSubs) {
      const key = s.userId || s.userEmail;
      if (!key) continue;
      if (s.productKind === 'bundle') {
        multiModuleUserIds.add(key);
      }
      subCountByUser.set(key, (subCountByUser.get(key) || 0) + 1);
    }
    for (const [key, count] of subCountByUser) {
      if (count > 1) multiModuleUserIds.add(key);
    }
    const paidToAdditionalModulesPct =
      uniquePayingUsers > 0
        ? parseFloat(((multiModuleUserIds.size / uniquePayingUsers) * 100).toFixed(1))
        : 0;

    const canceledLast30d = allSubscriptions.filter((s) => {
      const updated = parseDate(s.updated_date);
      return (
        updated && updated >= now30dAgo &&
        ['canceled', 'expired'].includes(norm(s.status))
      );
    }).length;
    const paidToFreePct =
      totalActivePaidSubscriptions > 0
        ? parseFloat(((canceledLast30d / totalActivePaidSubscriptions) * 100).toFixed(1))
        : 0;

    // ── Assemble V2 response ──────────────────────────────────────────────────
    return Response.json({
      meta: {
        generatedAt:        now.toISOString(),
        dateRangeDefinition: 'calendar',
        reportVersion:      REPORT_VERSION,
        calendarRanges: {
          week:    { start: ranges.week.start.toISOString(),    end: ranges.week.end.toISOString()    },
          month:   { start: ranges.month.start.toISOString(),   end: ranges.month.end.toISOString()   },
          quarter: { start: ranges.quarter.start.toISOString(), end: ranges.quarter.end.toISOString() },
          year:    { start: ranges.year.start.toISOString(),    end: ranges.year.end.toISOString()    },
        },
      },
      warnings: {
        unclassifiedSubscriptions,
        unknownIntervals,
        missingAmounts,
        recordsExcluded,
        messages: warningMessages,
      },
      accounts: {
        totalUsers,
        paidUsers:      paidUsersCount,
        freeUsers:      freeUsersCount,
        paidPercentage: totalUsers > 0 ? parseFloat(((paidUsersCount / totalUsers) * 100).toFixed(1)) : 0,
        signupSources,
        newAccounts,
      },
      subscriptions: {
        totalActivePaidSubscriptions,
        uniquePayingUsers,
        monthlySubscriptions,
        annualSubscriptions,
        byProduct,
        byBundle,
        trialMetrics: {
          currentlyOnTrial:  currentlyOnTrial.length,
          avgDaysRemaining,
          endingIn3Days,
          endingIn7Days,
          convertedLast30d,
          dropoffLast30d,
        },
      },
      revenue: {
        mrr,
        arr,
        renewalRevenue: {
          week:    renewalWeek.revenue,
          month:   renewalMonth.revenue,
          quarter: renewalQuarter.revenue,
          year:    renewalYear.revenue,
        },
        byProduct: revenueByProduct,
        byBundle:  revenueByBundle,
      },
      renewals: {
        week:    { customers: renewalWeek.customers,    subscriptions: renewalWeek.subscriptions    },
        month:   { customers: renewalMonth.customers,   subscriptions: renewalMonth.subscriptions   },
        quarter: { customers: renewalQuarter.customers, subscriptions: renewalQuarter.subscriptions },
        year:    { customers: renewalYear.customers,    subscriptions: renewalYear.subscriptions    },
      },
      conversion: {
        freeToPaidPct,
        paidToAdditionalModulesPct,
        paidToFreePct,
      },
      usage: {
        dauByModule: null,
        wauByModule: null,
        note: 'Per-module activity events are not available in the current data model.',
      },
      paid_users: paidUsersList,
      free_users: freeUsersList,
    });

  } catch (error: any) {
    console.error('[getUserSubscriptionReportV2] HARD FAILURE:', error);
    return Response.json(
      {
        error: 'report_generation_failed',
        detail: String(error?.message || error),
        meta: {
          generatedAt:  new Date().toISOString(),
          reportVersion: REPORT_VERSION,
        },
        warnings: {
          unclassifiedSubscriptions: 0,
          unknownIntervals: 0,
          missingAmounts: 0,
          recordsExcluded: 0,
          messages: ['Report generation failed — see server logs.'],
        },
        accounts:      {},
        subscriptions: {},
        revenue:       {},
        renewals:      {},
        conversion:    {},
        usage:         { dauByModule: null, wauByModule: null },
        paid_users:    [],
        free_users:    [],
      },
      { status: 200 }
    );
  }
});
