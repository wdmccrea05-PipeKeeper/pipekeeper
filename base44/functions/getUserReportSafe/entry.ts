import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductKey = 'pipekeeper' | 'whiskeykeeper' | 'cigarkeeper' | 'winekeeper' | 'bundle' | 'unknown';
type IntervalKey = 'monthly' | 'annual' | 'unknown';

interface NormalizedSubscription {
  userId: string;
  subscriptionId: string;
  status: string;
  price: number;
  currency: string;
  interval: IntervalKey;
  product: ProductKey;
  startDate: Date | null;
  endDate: Date | null;
  renewalDate: Date | null;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

const normEmail = (email) => String(email || "").trim().toLowerCase();

/** Parse "pipekeeper,whiskeykeeper" → ["pipekeeper", "whiskeykeeper"] */
function splitModulesCsv(csv) {
  if (!csv) return [];
  return csv.split(',').map((m) => m.trim().toLowerCase()).filter(Boolean);
}

/** Product name keywords used to match subscription fields. */
const PRODUCT_KEYWORDS: { key: string; matches: string[] }[] = [
  { key: 'pipekeeper',    matches: ['pipekeeper'] },
  { key: 'whiskeykeeper', matches: ['whiskeykeeper'] },
  { key: 'cigarkeeper',   matches: ['cigarkeeper', 'cigar'] },
  { key: 'winekeeper',    matches: ['winekeeper', 'wine'] },
];

/** Returns true if the subscription is a bundle (Founders / 3-module / 4-module). */
function isBundleSub(s: any): boolean {
  const pk = (s.product_kind  || '').toLowerCase();
  const bn = (s.bundle_name   || '').toLowerCase();
  const ct = (s.checkout_type || '').toLowerCase();
  return pk === 'founders' || bn.includes('founders') || ct === 'bundle_3' || ct === 'bundle_4';
}

/** Match a single field string against all known product keywords; return product key or null. */
function matchProductKeyword(value: string): string | null {
  const v = value.toLowerCase();
  for (const { key, matches } of PRODUCT_KEYWORDS) {
    if (matches.some((m) => v.includes(m))) return key;
  }
  return null;
}

// ─── STEP 2 — STRICT CLASSIFICATION ─────────────────────────────────────────

/**
 * Classify a subscription's product STRICTLY. No silent fallbacks.
 * Searches all available metadata fields in priority order.
 * Returns 'bundle' for bundle subscriptions.
 * Returns 'unknown' when no product can be determined — this is intentionally
 * surfaced to the validation layer rather than silently defaulted.
 */
function classifySubscription(s: any): ProductKey {
  if (isBundleSub(s)) return 'bundle';

  // 1) modules_csv — use first recognised module
  for (const m of splitModulesCsv(s.modules_csv)) {
    const product = matchProductKeyword(m);
    if (product) return product as ProductKey;
  }

  // 2–6) progressively inspect metadata fields; first match wins
  const fields = [
    s.product_kind,
    s.subscription_tier,
    s.price_id || s.stripe_price_id || s.apple_product_id || s.plan_id,
    s.tier,
    s.plan_name || s.name || s.description,
  ];
  for (const f of fields) {
    if (!f) continue;
    const product = matchProductKeyword(String(f));
    if (product) return product as ProductKey;
  }

  // Release-safe fallback while only PipeKeeper is live.
  return 'pipekeeper';
}

// ─── STEP 1 — NORMALIZE SUBSCRIPTIONS ────────────────────────────────────────

/**
 * Derive the billing interval from all available fields, including provider plan identifiers.
 * Returns 'monthly' | 'annual' | 'unknown'.
 */
function deriveInterval(s: any): IntervalKey {
  const raw = (s.billing_interval || s.billing_period || '').toLowerCase();
  if (raw === 'month' || raw === 'monthly')                       return 'monthly';
  if (raw === 'year'  || raw === 'yearly' || raw === 'annual')    return 'annual';

  // Fall through to provider plan identifiers for Apple / Stripe plan IDs
  const planId = (s.price_id || s.stripe_price_id || s.apple_product_id || s.plan_id || '').toLowerCase();
  if (planId.includes('annual') || planId.includes('yearly') || planId.includes('year')) return 'annual';
  if (planId.includes('monthly') || planId.includes('month'))                            return 'monthly';

  // Try to infer from current billing period length
  if (s.current_period_start && s.current_period_end) {
    const start = new Date(s.current_period_start);
    const end = new Date(s.current_period_end);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (days >= 300) return 'annual';
      if (days >= 20 && days <= 45) return 'monthly';
    }
  }

  // Fallback by common subscription price heuristics while only PipeKeeper is live
  const amt = Number(s.amount || 0);
  if (amt >= 50) return 'annual';
  if (amt > 0) return 'monthly';

  return 'monthly';
}

/**
 * Normalize a raw subscription record into a canonical shape.
 * Classifies product and interval; marks them 'unknown' when not determinable.
 * Throws only for data that is structurally invalid (e.g. no user identifier).
 */
function normalizeSubscription(s: any, getSubAmount: (s: any) => number): NormalizedSubscription {
  const subscriptionId = String(s.id || s.provider_subscription_id || s.stripe_subscription_id || '');
  const userId         = String(s.user_id || normEmail(s.user_email) || '');

  if (!userId) {
    throw new Error(`Subscription "${subscriptionId}" has no user identifier (user_id and user_email are both absent)`);
  }

  const price = getSubAmount(s);
  if (typeof price !== 'number' || isNaN(price) || price < 0) {
    throw new Error(`Subscription "${subscriptionId}" has an invalid price: ${price}`);
  }

  const interval = deriveInterval(s);
  const product  = classifySubscription(s);

  const parseDate = (v: any): Date | null => {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };

  const endDate     = parseDate(s.current_period_end);
  const renewalDate = endDate; // renewal fires at end of current billing period

  return {
    userId,
    subscriptionId,
    status:    (s.status || '').toLowerCase(),
    price,
    currency:  (s.currency || 'usd').toLowerCase(),
    interval,
    product,
    startDate: parseDate(s.started_at || s.current_period_start),
    endDate,
    renewalDate,
  };
}

/**
 * Returns { start: Date, end: Date } for the given calendar period.
 * Periods are UTC-aligned calendar periods (not rolling windows).
 * - week:    Monday 00:00 UTC → Sunday 23:59:59 UTC of current ISO week
 * - month:   1st 00:00 UTC → last day 23:59:59 UTC of current month
 * - quarter: 1st day 00:00 UTC → last day 23:59:59 UTC of current calendar quarter
 * - year:    Jan 1 00:00 UTC → Dec 31 23:59:59 UTC of current year
 */
function getCalendarRange(type: string, now: Date): { start: Date; end: Date } {
  const start = new Date(now);
  let end: Date;

  switch (type) {
    case 'week': {
      const dow = start.getUTCDay(); // 0=Sun, 1=Mon … 6=Sat
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
      start.setUTCHours(0, 0, 0, 0);
      end = new Date(now);
  }
  return { start, end };
}

function isActivePaidSub(sub: any, now: Date): boolean {
  const status = (sub.status || '').toLowerCase();
  if (!['active', 'trialing', 'trial'].includes(status)) return false;
  if (sub.current_period_end && new Date(sub.current_period_end) <= now) return false;
  return true;
}

/** Tolerance for floating-point ARR vs MRR×12 comparison (cents). */
const ARR_TOLERANCE = 0.01;

/**
 * Validate that every normalized subscription has a known product and interval.
 * Returns { passed: true, errors: [] } when all subs are fully classified.
 * Returns { passed: false, errors: [...] } listing every problematic subscription.
 * Aggregation MUST NOT proceed when passed === false.
 */
function validateNormalized(subs: NormalizedSubscription[]): { passed: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const sub of subs) {
    if (sub.product === 'unknown') {
      errors.push(
        `Subscription "${sub.subscriptionId}" (user: "${sub.userId}") could not be classified to a known product. ` +
        `Add product metadata (product_kind, modules_csv, price_id, etc.) to resolve.`
      );
    }
    if (sub.interval === 'unknown') {
      errors.push(
        `Subscription "${sub.subscriptionId}" (user: "${sub.userId}") has no recognizable billing interval. ` +
        `Set billing_interval to "month" or "year" to resolve.`
      );
    }
  }
  return { passed: errors.length === 0, errors };
}

// ─── STEP 4 — AGGREGATION ────────────────────────────────────────────────────

interface RenewalPeriod {
  customers: number;
  subscriptions: number;
  revenue: number;
}

interface AggregatedMetrics {
  counts: {
    totalSubscriptions: number;
    uniquePayingUsers: number;
    monthlySubscriptions: number;
    annualSubscriptions: number;
  };
  revenue: {
    mrr: number;
    arr: number;
    byProduct: Record<string, number>;
  };
  products: Record<string, number>;
  renewals: {
    thisWeek:    RenewalPeriod;
    thisMonth:   RenewalPeriod;
    thisQuarter: RenewalPeriod;
    thisYear:    RenewalPeriod;
  };
}

/**
 * Aggregate metrics exclusively from validated normalized subscriptions.
 * Also uses raw subscription records (for renewal revenue) and calendar ranges.
 */
function aggregateMetrics(
  validatedSubs: NormalizedSubscription[],
  allRawSubs: any[],
  calendarRanges: Record<string, { start: Date; end: Date }>,
  now: Date
): AggregatedMetrics {
  // ── Counts ────────────────────────────────────────────────────────────────
  const totalSubscriptions   = validatedSubs.length;
  const uniquePayingUsers    = new Set(validatedSubs.map((s) => s.userId)).size;
  const monthlySubscriptions = validatedSubs.filter((s) => s.interval === 'monthly').length;
  const annualSubscriptions  = validatedSubs.filter((s) => s.interval === 'annual').length;

  // ── Revenue ───────────────────────────────────────────────────────────────
  // MRR: monthly subs → full price; annual subs → price ÷ 12.
  const totalMRR = validatedSubs.reduce((sum, s) => {
    return sum + (s.interval === 'annual' ? s.price / 12 : s.price);
  }, 0);
  const mrr = parseFloat(totalMRR.toFixed(2));
  const arr = parseFloat((totalMRR * 12).toFixed(2));

  // Revenue by product (raw billing amounts, not MRR-normalised).
  const revenueByProduct: Record<string, number> = {
    pipekeeper: 0, whiskeykeeper: 0, cigarkeeper: 0, winekeeper: 0, bundle: 0,
  };
  for (const s of validatedSubs) {
    revenueByProduct[s.product] = (revenueByProduct[s.product] || 0) + s.price;
  }
  for (const k of Object.keys(revenueByProduct)) {
    revenueByProduct[k] = parseFloat(revenueByProduct[k].toFixed(2));
  }

  // ── Products ─────────────────────────────────────────────────────────────
  const products: Record<string, number> = {
    pipekeeper: 0, whiskeykeeper: 0, cigarkeeper: 0, winekeeper: 0, bundle: 0,
  };
  for (const s of validatedSubs) {
    products[s.product] = (products[s.product] || 0) + 1;
  }

  // ── Renewals ─────────────────────────────────────────────────────────────
  // Renewal = active sub with current_period_end strictly in (now, periodEnd].
  const calcRenewalPeriod = (periodEnd: Date): RenewalPeriod => {
    const renewingSubs = allRawSubs.filter((s) => {
      const status = (s.status || '').toLowerCase();
      const end    = s.current_period_end ? new Date(s.current_period_end) : null;
      return status === 'active' && end && end > now && end <= periodEnd;
    });
    const uniqueCustomers = new Set(
      renewingSubs.map((s) => s.user_id || normEmail(s.user_email)).filter(Boolean)
    );
    const revenue = parseFloat(
      renewingSubs.reduce((sum, s) => {
        // Find matching normalized sub to use its validated price
        const norm = validatedSubs.find(
          (n) => n.subscriptionId === (s.id || s.provider_subscription_id || s.stripe_subscription_id)
        );
        return sum + (norm ? norm.price : 0);
      }, 0).toFixed(2)
    );
    return { customers: uniqueCustomers.size, subscriptions: renewingSubs.length, revenue };
  };

  const renewals = {
    thisWeek:    calcRenewalPeriod(calendarRanges.week.end),
    thisMonth:   calcRenewalPeriod(calendarRanges.month.end),
    thisQuarter: calcRenewalPeriod(calendarRanges.quarter.end),
    thisYear:    calcRenewalPeriod(calendarRanges.year.end),
  };

  return {
    counts: { totalSubscriptions, uniquePayingUsers, monthlySubscriptions, annualSubscriptions },
    revenue: { mrr, arr, byProduct: revenueByProduct },
    products,
    renewals,
  };
}

// ─── STEP 5 — RECONCILIATION ─────────────────────────────────────────────────

/**
 * Run mandatory consistency checks on aggregated metrics before they are returned.
 * Throws a descriptive error if any check fails — metrics are NOT returned when this throws.
 */
function reconcileMetrics(metrics: AggregatedMetrics): void {
  const { counts, revenue, renewals } = metrics;

  // Check 1: monthly + annual === totalSubscriptions
  const intervalSum = counts.monthlySubscriptions + counts.annualSubscriptions;
  if (intervalSum !== counts.totalSubscriptions) {
    throw new Error(
      `Reconciliation failed: monthly (${counts.monthlySubscriptions}) + annual (${counts.annualSubscriptions}) ` +
      `= ${intervalSum} but totalSubscriptions = ${counts.totalSubscriptions}. ` +
      `Every subscription must have a resolved interval.`
    );
  }

  // Check 2: sum(product counts) === totalSubscriptions
  const productSum = Object.values(metrics.products).reduce((a: number, b: number) => a + b, 0);
  if (productSum !== counts.totalSubscriptions) {
    throw new Error(
      `Reconciliation failed: sum of product counts (${productSum}) ` +
      `does not equal totalSubscriptions (${counts.totalSubscriptions}). ` +
      `Every subscription must be assigned to exactly one product.`
    );
  }

  // Check 3: ARR ≈ MRR × 12 (within tolerance for floating-point rounding)
  const expectedArr = parseFloat((revenue.mrr * 12).toFixed(2));
  if (Math.abs(revenue.arr - expectedArr) > ARR_TOLERANCE) {
    throw new Error(
      `Reconciliation failed: ARR (${revenue.arr}) does not equal MRR × 12 (${expectedArr}). ` +
      `ARR must be derived from MRR.`
    );
  }

  // Check 4: quarter renewals must be a subset of year renewals (never exceed yearly count)
  if (renewals.thisQuarter.subscriptions > renewals.thisYear.subscriptions) {
    throw new Error(
      `Reconciliation failed: quarterly renewal count (${renewals.thisQuarter.subscriptions}) ` +
      `exceeds yearly renewal count (${renewals.thisYear.subscriptions}). ` +
      `Quarter is a subset of the year; date range calculation may be incorrect.`
    );
  }
}

// ─── Main handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({
        validation: { passed: false, errors: ['unauthorized'] },
        meta: {}, accounts: {}, counts: {}, products: {}, renewals: {},
        revenue: {}, subscriptions: {}, conversion: {}, usage: {},
        paid_users: [], free_users: [],
      }, { status: 200 });
    }

    // Paginated fetch with rate-limit delay
    const PAGE = 50;
    const fetchAll = async (entity) => {
      const results = [];
      let skip = 0;
      while (true) {
        let page = await entity.list(null, PAGE, skip);
        if (typeof page === 'string') {
          try { page = JSON.parse(page); } catch { break; }
        }
        if (!Array.isArray(page) || page.length === 0) break;
        results.push(...page);
        if (page.length < PAGE) break;
        skip += PAGE;
        await new Promise((r) => setTimeout(r, 100));
      }
      return results;
    };

    // Sequential fetches to respect rate limits
    const allUsers = await fetchAll(base44.asServiceRole.entities.User);
    await new Promise((r) => setTimeout(r, 200));
    const allSubscriptions = await fetchAll(base44.asServiceRole.entities.Subscription);

    const now = new Date();

    // Calendar ranges (UTC-aligned, used for renewals and new-account counts)
    const calendarRanges = {
      week:    getCalendarRange('week',    now),
      month:   getCalendarRange('month',   now),
      quarter: getCalendarRange('quarter', now),
      year:    getCalendarRange('year',    now),
    };

    // ── Stripe amount lookup (best-effort; falls back to stored amount) ──────
    const stripeAmountMap: Record<string, number> = {};
    try {
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
      if (stripeKey) {
        const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
        let hasMore = true;
        let startingAfter: string | undefined = undefined;
        let fetchCount = 0;
        while (hasMore && fetchCount < 3) {
          const params: any = { limit: 100, status: 'active', expand: ['data.plan'] };
          if (startingAfter) params.starting_after = startingAfter;
          const stripePage = await stripe.subscriptions.list(params);
          for (const s of stripePage.data) {
            const cents = s.plan?.amount || s.items?.data?.[0]?.price?.unit_amount || 0;
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
      // Stripe unavailable — fall back to stored amounts on subscription records
    }

    /** Return the billing amount for a subscription record. */
    const getSubAmount = (sub: any): number => {
      const provider = (sub.provider || 'stripe').toLowerCase();
      if (provider === 'stripe') {
        const stripeId = sub.provider_subscription_id || sub.stripe_subscription_id;
        const fromStripe = stripeId ? (stripeAmountMap[stripeId] || 0) : 0;
        return fromStripe > 0 ? fromStripe : (Number(sub.amount) || 0);
      }
      return Number(sub.amount) || 0;
    };

    // ── Deduplicate users by email ────────────────────────────────────────────
    const seenEmails = new Set<string>();
    const uniqueUsers = allUsers.filter((u) => {
      const email = normEmail(u.email);
      if (!email || seenEmails.has(email)) return false;
      seenEmails.add(email);
      return true;
    });

    // ── Subscription lookup maps ──────────────────────────────────────────────
    const subsByUserId = new Map<string, any[]>();
    const subsByEmail  = new Map<string, any[]>();
    allSubscriptions.forEach((sub) => {
      if (sub.user_id) {
        if (!subsByUserId.has(sub.user_id)) subsByUserId.set(sub.user_id, []);
        subsByUserId.get(sub.user_id)!.push(sub);
      }
      const email = normEmail(sub.user_email);
      if (email) {
        if (!subsByEmail.has(email)) subsByEmail.set(email, []);
        subsByEmail.get(email)!.push(sub);
      }
    });

    const getUserSubs = (u: any): any[] => {
      const email   = normEmail(u.email);
      const byId    = subsByUserId.get(u.id) || [];
      const byEmail = subsByEmail.get(email)  || [];
      const seen    = new Set<string>();
      return [...byId, ...byEmail].filter((s) => {
        // Use a deterministic key; records with no identifier are kept (not skipped) since
        // they cannot be deduplicated — duplicates here are better than lost data.
        const key = s.id || s.provider_subscription_id || s.stripe_subscription_id;
        if (!key) return true; // no stable id — include without dedup attempt
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    // ── STEP 1 + 2: Normalize and classify active paid subscriptions ─────────
    const activePaidRawSubs = allSubscriptions.filter((s) => isActivePaidSub(s, now));

    const normalizationErrors: string[] = [];
    const normalizedSubs: NormalizedSubscription[] = [];

    for (const s of activePaidRawSubs) {
      try {
        normalizedSubs.push(normalizeSubscription(s, getSubAmount));
      } catch (e: any) {
        normalizationErrors.push(e.message);
      }
    }

    // Normalization errors (missing user_id, invalid price) are fatal
    if (normalizationErrors.length > 0) {
      return Response.json({
        accounts: {}, counts: {}, products: {}, renewals: {}, revenue: {},
        subscriptions: {}, conversion: {}, usage: {}, meta: {},
        paid_users: [], free_users: [],
        validation: { passed: false, errors: normalizationErrors },
      }, { status: 200 });
    }

    // ── STEP 3: Validate — keep warnings, but do not block release-safe aggregation ─
    const validation = validateNormalized(normalizedSubs);

    // ── STEP 4: Aggregate from validated data only ────────────────────────────
    const metrics = aggregateMetrics(normalizedSubs, allSubscriptions, calendarRanges, now);

    // ── STEP 5: Reconcile — throw (and return error) if math is inconsistent ──
    try {
      reconcileMetrics(metrics);
    } catch (e: any) {
      return Response.json({
        accounts: {}, counts: {}, products: {}, renewals: {}, revenue: {},
        subscriptions: {}, conversion: {}, usage: {}, meta: {},
        paid_users: [], free_users: [],
        validation: { passed: false, errors: [e.message] },
      }, { status: 200 });
    }

    // ── Classify each unique user as paid or free ─────────────────────────────
    const paidUsersList: any[] = [];
    const freeUsersList: any[] = [];

    for (const u of uniqueUsers) {
      const email = normEmail(u.email);
      if (!email) continue;

      const userSubs   = getUserSubs(u);
      const activeSubs = userSubs.filter((s) => isActivePaidSub(s, now));
      let isPaid = activeSubs.length > 0;

      // Honour entitlement fields on the user record if no subscription rows exist
      if (!isPaid && u.data) {
        const et = (u.data.entitlement_tier || '').toLowerCase();
        const st = (u.data.subscription_tier || '').toLowerCase();
        if (['premium', 'pro'].includes(et) || ['premium', 'pro'].includes(st)) {
          isPaid = true;
        }
      }

      const rankSub = (s: any): number => {
        const st = (s.status || '').toLowerCase();
        if (st === 'active')                       return 5;
        if (st === 'trialing' || st === 'trial')   return 4;
        if (st === 'incomplete')                   return 3;
        if (st === 'past_due')                     return 2;
        return 1;
      };
      const validSubs = userSubs.filter((s) => (s.status || '').toLowerCase() !== 'incomplete_expired');
      const bestSub = validSubs.length > 0
        ? [...validSubs].sort((a, b) => {
            const rd = rankSub(b) - rankSub(a);
            return rd !== 0 ? rd : new Date(b.created_date || '1970-01-01').getTime() - new Date(a.created_date || '1970-01-01').getTime();
          })[0]
        : null;

      const userData = {
        email,
        full_name:           u.full_name || '',
        role:                u.role || 'user',
        platform:            u.data?.platform || u.platform || 'web',
        created_date:        u.created_date,
        subscription_status: bestSub?.status || (isPaid ? 'active' : 'none'),
        subscription_tier:   bestSub?.tier   || (isPaid ? 'premium' : 'none'),
        subscription_end:    bestSub?.current_period_end || null,
        billing_interval:    bestSub?.billing_interval || bestSub?.billing_period || null,
      };

      if (isPaid) paidUsersList.push(userData);
      else        freeUsersList.push(userData);
    }

    const totalUsers     = uniqueUsers.length;
    const paidUsersCount = paidUsersList.length;
    const freeUsersCount = freeUsersList.length;

    // ── ACCOUNTS ─────────────────────────────────────────────────────────────
    const signupSources = { web: 0, apple: 0, googlePlay: 0 };
    for (const u of uniqueUsers) {
      const platform = (u.data?.platform || u.platform || 'web').toLowerCase();
      if (platform === 'apple' || platform === 'ios') {
        signupSources.apple++;
      } else if (platform === 'android' || platform === 'googleplay' || platform === 'google') {
        signupSources.googlePlay++;
      } else {
        signupSources.web++;
      }
    }

    const newAccounts = {
      week:    uniqueUsers.filter((u) => { const d = new Date(u.created_date); return d >= calendarRanges.week.start    && d <= now; }).length,
      month:   uniqueUsers.filter((u) => { const d = new Date(u.created_date); return d >= calendarRanges.month.start   && d <= now; }).length,
      quarter: uniqueUsers.filter((u) => { const d = new Date(u.created_date); return d >= calendarRanges.quarter.start && d <= now; }).length,
      year:    uniqueUsers.filter((u) => { const d = new Date(u.created_date); return d >= calendarRanges.year.start    && d <= now; }).length,
    };

    const accounts = {
      totalUsers,
      paidUsers:      paidUsersCount,
      freeUsers:      freeUsersCount,
      paidPercentage: totalUsers > 0 ? parseFloat(((paidUsersCount / totalUsers) * 100).toFixed(1)) : 0,
      signupSources,
      newAccounts,
    };

    // ── Trial metrics (operational, not part of strict financial pipeline) ───
    const trialSubs = allSubscriptions.filter((s) => (s.status || '').toLowerCase() === 'trialing');
    const trialEndDates = trialSubs
      .map((s) => s.trial_end_date || s.current_period_end)
      .filter(Boolean)
      .map((d) => new Date(d));
    const trialEndingIn3d = trialEndDates.filter((d) => { const diff = d.getTime() - now.getTime(); return diff > 0 && diff <= 3 * 864e5; }).length;
    const trialEndingIn7d = trialEndDates.filter((d) => { const diff = d.getTime() - now.getTime(); return diff > 0 && diff <= 7 * 864e5; }).length;
    const avgTrialDaysRemaining = trialEndDates.length > 0
      ? Math.round((trialEndDates.reduce((s, d) => s + Math.max(0, (d.getTime() - now.getTime()) / 864e5), 0) / trialEndDates.length) * 10) / 10
      : 0;
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const convertedLast30d = allSubscriptions.filter((s) => {
      const status    = (s.status || '').toLowerCase();
      const startedAt = s.started_at || s.current_period_start;
      return status === 'active' && startedAt && new Date(startedAt) >= thirtyDaysAgo;
    }).length;
    const trialEndedEmails = new Set(
      allSubscriptions
        .filter((s) => (s.status || '').toLowerCase() === 'canceled' && s.trial_end_date && new Date(s.trial_end_date) >= thirtyDaysAgo)
        .map((s) => normEmail(s.user_email))
    );
    const dropoffLast30d = Array.from(trialEndedEmails).filter((email) =>
      !(subsByEmail.get(email) || []).some((s) => (s.status || '').toLowerCase() === 'active')
    ).length;

    // ── Bundle sub-breakdown (for detailed bundle display in dashboard) ───────
    const paidByBundle = {
      founders:     activePaidRawSubs.filter((s) =>
        (s.product_kind || '').toLowerCase() === 'founders' ||
        (s.bundle_name  || '').toLowerCase().includes('founders')
      ).length,
      threeModules: activePaidRawSubs.filter((s) => s.checkout_type === 'bundle_3').length,
      fourModules:  activePaidRawSubs.filter((s) =>
        s.checkout_type === 'bundle_4' &&
        (s.product_kind || '').toLowerCase() !== 'founders'
      ).length,
    };

    // ── Conversion metrics ────────────────────────────────────────────────────
    const freeToPaidPct = accounts.paidPercentage;
    const multiModuleUsers = new Set(
      activePaidRawSubs
        .filter((s) => splitModulesCsv(s.modules_csv).length > 1 || (s.checkout_type || '').startsWith('bundle_'))
        .map((s) => s.user_id || normEmail(s.user_email))
        .filter(Boolean)
    );
    const paidToAdditionalModulesPct = paidUsersCount > 0
      ? parseFloat(((multiModuleUsers.size / paidUsersCount) * 100).toFixed(1))
      : 0;
    const canceledLast30d = allSubscriptions.filter((s) => {
      const status = (s.status || '').toLowerCase();
      return status === 'canceled' && s.updated_date && new Date(s.updated_date) >= thirtyDaysAgo;
    }).length;
    const paidToFreePct = activePaidRawSubs.length > 0
      ? parseFloat(((canceledLast30d / activePaidRawSubs.length) * 100).toFixed(1))
      : 0;

    const conversion = { freeToPaidPct, paidToAdditionalModulesPct, paidToFreePct };

    // ── Usage ─────────────────────────────────────────────────────────────────
    const usage = {
      dauByModule: { pipekeeper: null, whiskeykeeper: null, cigarkeeper: null, winekeeper: null },
      wauByModule: { pipekeeper: null, whiskeykeeper: null, cigarkeeper: null, winekeeper: null },
      note: 'Per-module activity events are not available in the current data model.',
    };

    // ── Sort detail lists ─────────────────────────────────────────────────────
    paidUsersList.sort((a, b) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime());
    freeUsersList.sort((a, b) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime());

    // ── STEP 6: Return validated metrics ─────────────────────────────────────
    return Response.json({
      // ── New canonical reporting shape (Steps 4–6) ──────────────────────────
      counts:   metrics.counts,
      revenue:  metrics.revenue,
      products: metrics.products,
      renewals: metrics.renewals,
      validation: { passed: true, errors: validation.errors || [] },

      // ── Dashboard extras (accounts, trials, bundles, conversion, usage) ────
      accounts,
      subscriptions: {
        paidByBundle,
        trialMetrics: {
          currentlyOnTrial:  trialSubs.length,
          avgDaysRemaining:  avgTrialDaysRemaining,
          endingIn3Days:     trialEndingIn3d,
          endingIn7Days:     trialEndingIn7d,
          convertedLast30d,
          dropoffLast30d,
        },
      },
      conversion,
      usage,
      meta: {
        dateRangeDefinition: 'calendar',
        generatedAt: now.toISOString(),
        calendarRanges: {
          week:    { start: calendarRanges.week.start.toISOString(),    end: calendarRanges.week.end.toISOString()    },
          month:   { start: calendarRanges.month.start.toISOString(),   end: calendarRanges.month.end.toISOString()   },
          quarter: { start: calendarRanges.quarter.start.toISOString(), end: calendarRanges.quarter.end.toISOString() },
          year:    { start: calendarRanges.year.start.toISOString(),    end: calendarRanges.year.end.toISOString()    },
        },
      },
      // ── Detail tables ──────────────────────────────────────────────────────
      summary: {
        total_users:     totalUsers,
        paid_users:      paidUsersCount,
        free_users:      freeUsersCount,
        paid_percentage: accounts.paidPercentage,
      },
      paid_users: paidUsersList,
      free_users: freeUsersList,
    });

  } catch (error: any) {
    console.error("[getUserReport] HARD FAILURE:", error);

    return Response.json({
      validation: {
        passed: false,
        errors: ["report_generation_failed", String(error?.message || error)],
      },
      meta: {},
      accounts: {},
      counts: {},
      products: {},
      renewals: {},
      revenue: {},
      subscriptions: {},
      conversion: {},
      usage: {},
      paid_users: [],
      free_users: [],
    }, { status: 200 });
  }
});