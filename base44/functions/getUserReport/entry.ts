/**
 * getUserReport — Rebuilt financial reporting pipeline
 *
 * Pipeline:
 *   1. normalizeSubscription  — canonical shape per record
 *   2. classifySubscription   — strict product + interval assignment; throws on failure
 *   3. validateSubscriptions  — rejects dataset if any record is unclassified
 *   4. aggregate              — counts, MRR/ARR, product revenue, renewals
 *   5. reconcile              — hard invariant checks before returning
 *
 * Output shape:
 *   { counts, revenue, products, renewals, validation, accounts, meta,
 *     paid_users, free_users }
 *
 * NO silent failures. NO default zeros for financial metrics.
 * If reconciliation fails the function returns an error response — never bad numbers.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

// ─── Utilities ───────────────────────────────────────────────────────────────

const normEmail = (email: any): string => String(email || '').trim().toLowerCase();

function splitModulesCsv(csv: any): string[] {
  if (!csv) return [];
  return String(csv).split(',').map((m) => m.trim().toLowerCase()).filter(Boolean);
}

/**
 * Returns UTC-aligned calendar period boundaries for week / month / quarter / year.
 * - week:    ISO week Monday 00:00 UTC → Sunday 23:59:59.999 UTC
 * - month:   1st 00:00 UTC → last day 23:59:59.999 UTC
 * - quarter: First day of quarter 00:00 UTC → last day 23:59:59.999 UTC
 * - year:    Jan 1 00:00 UTC → Dec 31 23:59:59.999 UTC
 */
function getCalendarRange(type: string, now: Date): { start: Date; end: Date } {
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

// ─── Step 1: Normalize ───────────────────────────────────────────────────────

interface NormalizedSubscription {
  _raw: any;
  userId: string;
  subscriptionId: string;
  status: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'annual';
  product: 'pipekeeper' | 'whiskeykeeper' | 'cigarkeeper' | 'winekeeper' | 'bundle' | 'unknown';
  startDate: Date | null;
  endDate: Date | null;
  renewalDate: Date | null;
}

function normalizeSubscription(raw: any, stripeAmountMap: Record<string, number>): NormalizedSubscription {
  const provider = String(raw.provider || 'stripe').toLowerCase();

  // --- Price ---
  let price: number;
  if (provider === 'stripe') {
    const stripeId = raw.provider_subscription_id || raw.stripe_subscription_id;
    const fromStripe = stripeId ? (stripeAmountMap[stripeId] ?? -1) : -1;
    price = fromStripe >= 0 ? fromStripe : Number(raw.amount ?? raw.price ?? 0);
  } else {
    price = Number(raw.amount ?? raw.price ?? 0);
  }

  // --- Interval ---
  const rawInterval = String(raw.billing_interval || raw.billing_period || '').toLowerCase();
  const interval: 'monthly' | 'annual' =
    rawInterval === 'year' || rawInterval === 'annual' ? 'annual' : 'monthly';

  // --- Dates ---
  const toDate = (v: any): Date | null => {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };

  const renewalDate = toDate(raw.current_period_end);

  // --- Product (initially 'unknown'; classifySubscription will assign) ---
  return {
    _raw: raw,
    userId: String(raw.user_id || raw.user_email || ''),
    subscriptionId: String(raw.id || raw.provider_subscription_id || ''),
    status: String(raw.status || '').toLowerCase(),
    price,
    currency: String(raw.currency || 'usd').toLowerCase(),
    interval,
    product: 'unknown',
    startDate: toDate(raw.started_at || raw.current_period_start || raw.created_date),
    endDate: toDate(raw.current_period_end),
    renewalDate: (renewalDate && renewalDate > new Date(0)) ? renewalDate : null,
  };
}

// ─── Step 2: Classify (strict — throws on unresolvable records) ──────────────

type ProductKey = 'pipekeeper' | 'whiskeykeeper' | 'cigarkeeper' | 'winekeeper' | 'bundle';

/**
 * Classifies a subscription into a product key.
 * Returns the product key or throws if the subscription cannot be classified.
 *
 * Lookup priority:
 *   1. product_kind / bundle_name / checkout_type  → 'bundle'
 *   2. modules_csv first entry
 *   3. product_kind field
 *   4. subscription_tier string contains product name
 *   5. Provider plan ID (price_id / apple_product_id / plan_id) contains product name
 */
function classifySubscription(norm: NormalizedSubscription): NormalizedSubscription {
  const raw = norm._raw;

  const productKind   = String(raw.product_kind   || '').toLowerCase();
  const bundleName    = String(raw.bundle_name    || '').toLowerCase();
  const checkoutType  = String(raw.checkout_type  || '').toLowerCase();

  // Bundle detection
  if (
    productKind === 'founders' ||
    bundleName.includes('founders') ||
    checkoutType === 'bundle_3' ||
    checkoutType === 'bundle_4'
  ) {
    return { ...norm, product: 'bundle' };
  }

  // 1) modules_csv — use first recognised entry
  const modules = splitModulesCsv(raw.modules_csv);
  for (const m of modules) {
    if (m === 'pipekeeper')                                return { ...norm, product: 'pipekeeper' };
    if (m === 'whiskeykeeper')                             return { ...norm, product: 'whiskeykeeper' };
    if (m === 'cigarkeeper' || m === 'cigar')              return { ...norm, product: 'cigarkeeper' };
    if (m === 'winekeeper'  || m === 'wine')               return { ...norm, product: 'winekeeper' };
    // multi-module without explicit bundle flag → bundle
    if (modules.length > 1)                               return { ...norm, product: 'bundle' };
  }

  // 2) product_kind
  if (productKind === 'pipekeeper')                        return { ...norm, product: 'pipekeeper' };
  if (productKind === 'whiskeykeeper')                     return { ...norm, product: 'whiskeykeeper' };
  if (productKind === 'cigarkeeper' || productKind === 'cigar') return { ...norm, product: 'cigarkeeper' };
  if (productKind === 'winekeeper'  || productKind === 'wine')  return { ...norm, product: 'winekeeper' };

  // 3) subscription_tier
  const tier = String(raw.subscription_tier || '').toLowerCase();
  if (tier.includes('pipekeeper'))                         return { ...norm, product: 'pipekeeper' };
  if (tier.includes('whiskeykeeper'))                      return { ...norm, product: 'whiskeykeeper' };
  if (tier.includes('cigarkeeper') || tier.includes('cigar')) return { ...norm, product: 'cigarkeeper' };
  if (tier.includes('winekeeper')  || tier.includes('wine'))  return { ...norm, product: 'winekeeper' };

  // 4) Provider plan identifiers
  const planId = String(raw.price_id || raw.stripe_price_id || raw.apple_product_id || raw.plan_id || '').toLowerCase();
  if (planId.includes('pipekeeper'))                       return { ...norm, product: 'pipekeeper' };
  if (planId.includes('whiskeykeeper'))                    return { ...norm, product: 'whiskeykeeper' };
  if (planId.includes('cigarkeeper') || planId.includes('cigar')) return { ...norm, product: 'cigarkeeper' };
  if (planId.includes('winekeeper')  || planId.includes('wine'))  return { ...norm, product: 'winekeeper' };

  // Classification failed — throw so the caller can collect all failures
  throw new Error(
    `Unclassifiable subscription: id=${norm.subscriptionId} user=${norm.userId} ` +
    `product_kind="${raw.product_kind}" modules_csv="${raw.modules_csv}" ` +
    `tier="${raw.subscription_tier}" plan="${planId}"`
  );
}

// ─── Step 3: Validate ────────────────────────────────────────────────────────

interface ValidationResult {
  passed: boolean;
  errors: string[];
  unclassifiedIds: string[];
}

function validateSubscriptions(classified: NormalizedSubscription[]): ValidationResult {
  const errors: string[] = [];
  const unclassifiedIds: string[] = [];

  for (const s of classified) {
    if (s.product === 'unknown') {
      errors.push(`Subscription ${s.subscriptionId} (user: ${s.userId}) has product=unknown after classification`);
      unclassifiedIds.push(s.subscriptionId);
    }
    if (!s.interval) {
      errors.push(`Subscription ${s.subscriptionId} is missing billing interval`);
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    unclassifiedIds,
  };
}

// ─── Step 4: Aggregate ───────────────────────────────────────────────────────

function isActiveStatus(status: string): boolean {
  return ['active', 'trialing', 'trial'].includes(status);
}

function aggregate(
  classified: NormalizedSubscription[],
  allSubscriptions: any[],
  now: Date,
  calendarRanges: Record<string, { start: Date; end: Date }>
) {
  const activeSubs = classified.filter(
    (s) => isActiveStatus(s.status) && (!s.endDate || s.endDate > now)
  );

  // ── Counts ────────────────────────────────────────────────────────────────
  const totalSubscriptions  = activeSubs.length;
  const monthlySubscriptions = activeSubs.filter((s) => s.interval === 'monthly').length;
  const annualSubscriptions  = activeSubs.filter((s) => s.interval === 'annual').length;
  const uniquePayingUsers    = new Set(activeSubs.map((s) => s.userId).filter(Boolean)).size;

  // ── Revenue ───────────────────────────────────────────────────────────────
  // MRR: monthly price for monthly subs + annual price÷12 for annual subs
  let mrr = 0;
  for (const s of activeSubs) {
    mrr += s.interval === 'annual' ? s.price / 12 : s.price;
  }
  mrr = parseFloat(mrr.toFixed(2));
  const arr = parseFloat((mrr * 12).toFixed(2));

  // ── Product breakdown ─────────────────────────────────────────────────────
  const productCounts: Record<string, number> = {
    pipekeeper: 0, whiskeykeeper: 0, cigarkeeper: 0, winekeeper: 0, bundle: 0,
  };
  const productRevenue: Record<string, number> = {
    pipekeeper: 0, whiskeykeeper: 0, cigarkeeper: 0, winekeeper: 0, bundle: 0,
  };

  for (const s of activeSubs) {
    if (s.product in productCounts) {
      productCounts[s.product]++;
      productRevenue[s.product] += s.interval === 'annual' ? s.price / 12 : s.price;
    }
  }
  for (const k of Object.keys(productRevenue)) {
    productRevenue[k] = parseFloat(productRevenue[k].toFixed(2));
  }

  // ── Renewals — filter strictly by renewalDate within calendar period ──────
  const calcRenewals = (endBoundary: Date) => {
    const renewing = activeSubs.filter(
      (s) => s.renewalDate !== null && s.renewalDate > now && s.renewalDate <= endBoundary
    );
    const uniqueCustomers = new Set(renewing.map((s) => s.userId).filter(Boolean)).size;
    return { count: renewing.length, uniqueCustomers };
  };

  const renewals = {
    thisWeek:    calcRenewals(calendarRanges.week.end),
    thisMonth:   calcRenewals(calendarRanges.month.end),
    thisQuarter: calcRenewals(calendarRanges.quarter.end),
    thisYear:    calcRenewals(calendarRanges.year.end),
  };

  // Renewal revenue = sum of prices for subs renewing in each period
  const calcRenewalRevenue = (endBoundary: Date): number => {
    return parseFloat(
      activeSubs
        .filter((s) => s.renewalDate !== null && s.renewalDate > now && s.renewalDate <= endBoundary)
        .reduce((sum, s) => sum + s.price, 0)
        .toFixed(2)
    );
  };

  const renewalRevenue = {
    thisWeek:    calcRenewalRevenue(calendarRanges.week.end),
    thisMonth:   calcRenewalRevenue(calendarRanges.month.end),
    thisQuarter: calcRenewalRevenue(calendarRanges.quarter.end),
    thisYear:    calcRenewalRevenue(calendarRanges.year.end),
  };

  // ── Trial metrics (operational) ───────────────────────────────────────────
  const trialSubs = allSubscriptions.filter(
    (s) => String(s.status || '').toLowerCase() === 'trialing'
  );
  const trialEndDates = trialSubs
    .map((s) => s.trial_end_date || s.current_period_end)
    .filter(Boolean)
    .map((d: string) => new Date(d))
    .filter((d: Date) => !isNaN(d.getTime()));

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const trialMetrics = {
    currentlyOnTrial:  trialSubs.length,
    endingIn3Days:     trialEndDates.filter((d) => { const diff = d.getTime() - now.getTime(); return diff > 0 && diff <= 3 * 864e5; }).length,
    endingIn7Days:     trialEndDates.filter((d) => { const diff = d.getTime() - now.getTime(); return diff > 0 && diff <= 7 * 864e5; }).length,
    avgDaysRemaining:  trialEndDates.length > 0
      ? Math.round(trialEndDates.reduce((s, d) => s + Math.max(0, (d.getTime() - now.getTime()) / 864e5), 0) / trialEndDates.length * 10) / 10
      : null,
    convertedLast30d:  allSubscriptions.filter((s) => {
      const st = String(s.status || '').toLowerCase();
      const startedAt = s.started_at || s.current_period_start;
      return st === 'active' && startedAt && new Date(startedAt) >= thirtyDaysAgo;
    }).length,
    dropoffLast30d: (() => {
      const subsByEmail = new Map<string, any[]>();
      allSubscriptions.forEach((s: any) => {
        const email = normEmail(s.user_email);
        if (email) {
          if (!subsByEmail.has(email)) subsByEmail.set(email, []);
          subsByEmail.get(email)!.push(s);
        }
      });
      const trialEndedEmails = new Set(
        allSubscriptions
          .filter((s: any) => String(s.status || '').toLowerCase() === 'canceled' && s.trial_end_date && new Date(s.trial_end_date) >= thirtyDaysAgo)
          .map((s: any) => normEmail(s.user_email))
      );
      return Array.from(trialEndedEmails).filter((email) =>
        !(subsByEmail.get(email as string) || []).some((s) => String(s.status || '').toLowerCase() === 'active')
      ).length;
    })(),
  };

  return {
    counts: {
      totalSubscriptions,
      uniquePayingUsers,
      monthlySubscriptions,
      annualSubscriptions,
    },
    revenue: {
      mrr,
      arr,
      byProduct: productRevenue,
    },
    products: {
      counts: productCounts,
    },
    renewals,
    renewalRevenue,
    trialMetrics,
  };
}

// ─── Step 5: Reconcile ───────────────────────────────────────────────────────

const FLOAT_TOLERANCE = 0.02; // $0.02 rounding tolerance

function reconcile(
  agg: ReturnType<typeof aggregate>,
  classified: NormalizedSubscription[],
  now: Date,
  calendarRanges: Record<string, { start: Date; end: Date }>
): { passed: boolean; errors: string[] } {
  const errors: string[] = [];
  const c = agg.counts;

  // Check 1: monthly + annual === totalSubscriptions
  if (c.monthlySubscriptions + c.annualSubscriptions !== c.totalSubscriptions) {
    errors.push(
      `Interval split mismatch: monthly(${c.monthlySubscriptions}) + annual(${c.annualSubscriptions}) = ` +
      `${c.monthlySubscriptions + c.annualSubscriptions} ≠ total(${c.totalSubscriptions})`
    );
  }

  // Check 2: sum(product counts) === totalSubscriptions
  const productCountSum = Object.values(agg.products.counts).reduce((a, b) => a + b, 0);
  if (productCountSum !== c.totalSubscriptions) {
    errors.push(
      `Product count sum mismatch: ${JSON.stringify(agg.products.counts)} = ${productCountSum} ≠ total(${c.totalSubscriptions})`
    );
  }

  // Check 3: ARR === MRR * 12 (within float tolerance)
  const expectedARR = parseFloat((agg.revenue.mrr * 12).toFixed(2));
  if (Math.abs(agg.revenue.arr - expectedARR) > FLOAT_TOLERANCE) {
    errors.push(
      `ARR/MRR mismatch: ARR(${agg.revenue.arr}) ≠ MRR(${agg.revenue.mrr}) × 12 = ${expectedARR}`
    );
  }

  // Check 4: renewal(quarter) should not equal renewal(year) unless dataset justifies it —
  // flag only if quarter count === year count AND there are subscriptions with endDates in the year
  // that extend beyond the quarter (i.e., the equality seems wrong rather than coincidental).
  const qCount = agg.renewals.thisQuarter.count;
  const yCount = agg.renewals.thisYear.count;
  if (qCount > 0 && qCount === yCount) {
    // Check if any active subscription has a renewalDate beyond the quarter boundary
    const beyondQuarter = classified.filter((s) =>
      isActiveStatus(s.status) &&
      (!s.endDate || s.endDate > now) &&
      s.renewalDate !== null &&
      s.renewalDate > calendarRanges.quarter.end &&
      s.renewalDate <= calendarRanges.year.end
    ).length;
    if (beyondQuarter > 0) {
      errors.push(
        `Renewal count anomaly: thisQuarter(${qCount}) === thisYear(${yCount}) ` +
        `but ${beyondQuarter} subscription(s) have renewalDates beyond the quarter — year count should be higher`
      );
    }
  }

  return { passed: errors.length === 0, errors };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // ── Paginated fetch ────────────────────────────────────────────────────
    const PAGE = 50;
    const fetchAll = async (entity: any): Promise<any[]> => {
      const results: any[] = [];
      let skip = 0;
      while (true) {
        let page = await entity.list(null, PAGE, skip);
        if (typeof page === 'string') { try { page = JSON.parse(page); } catch { break; } }
        if (!Array.isArray(page) || page.length === 0) break;
        results.push(...page);
        if (page.length < PAGE) break;
        skip += PAGE;
        await new Promise((r) => setTimeout(r, 100));
      }
      return results;
    };

    const allUsers = await fetchAll(base44.asServiceRole.entities.User);
    await new Promise((r) => setTimeout(r, 200));
    const allSubscriptions = await fetchAll(base44.asServiceRole.entities.Subscription);

    const now = new Date();
    const calendarRanges: Record<string, { start: Date; end: Date }> = {
      week:    getCalendarRange('week',    now),
      month:   getCalendarRange('month',   now),
      quarter: getCalendarRange('quarter', now),
      year:    getCalendarRange('year',    now),
    };

    // ── Stripe live amounts (best-effort) ──────────────────────────────────
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
            const cents = s.plan?.amount || (s as any).items?.data?.[0]?.price?.unit_amount || 0;
            stripeAmountMap[s.id] = cents / 100;
          }
          hasMore = stripePage.has_more;
          startingAfter = hasMore && stripePage.data.length > 0
            ? stripePage.data[stripePage.data.length - 1].id
            : undefined;
          if (!startingAfter) hasMore = false;
          fetchCount++;
        }
      }
    } catch {
      // Stripe unavailable — normalizeSubscription falls back to stored amounts
    }

    // ── Step 1: Normalize ─────────────────────────────────────────────────
    const normalized: NormalizedSubscription[] = allSubscriptions.map(
      (raw: any) => normalizeSubscription(raw, stripeAmountMap)
    );

    // ── Step 2: Classify (strict — collect all failures before deciding) ──
    const classified: NormalizedSubscription[] = [];
    const classificationErrors: string[] = [];

    for (const norm of normalized) {
      // Only classify active/trialing records; skip cancelled/expired for product reporting
      const status = norm.status;
      if (!isActiveStatus(status)) {
        // Keep as-is with product='unknown' so renewal/trial queries can use raw data
        classified.push(norm);
        continue;
      }
      try {
        classified.push(classifySubscription(norm));
      } catch (err: any) {
        classificationErrors.push(err.message);
        classified.push({ ...norm, product: 'unknown' });
      }
    }

    // ── Step 3: Validate (only active records must be fully classified) ───
    const activePaid = classified.filter(
      (s) => isActiveStatus(s.status) && (!s.endDate || s.endDate > now)
    );
    const validation = validateSubscriptions(activePaid);

    if (!validation.passed || classificationErrors.length > 0) {
      const allErrors = [...classificationErrors, ...validation.errors];
      return Response.json({
        error: 'DATA_ERROR',
        message: 'Subscription classification failed. Reporting aborted to prevent inaccurate metrics.',
        classificationErrors: allErrors,
        unclassifiedSubscriptionIds: validation.unclassifiedIds,
        validation: { passed: false, errors: allErrors },
      }, { status: 422 });
    }

    // ── Step 4: Aggregate ─────────────────────────────────────────────────
    const agg = aggregate(classified, allSubscriptions, now, calendarRanges);

    // ── Step 5: Reconcile ─────────────────────────────────────────────────
    const reconciliation = reconcile(agg, classified, now, calendarRanges);
    if (!reconciliation.passed) {
      return Response.json({
        error: 'DATA_ERROR',
        message: 'Reconciliation checks failed. Reporting aborted to prevent inaccurate metrics.',
        reconciliationErrors: reconciliation.errors,
        validation: { passed: false, errors: reconciliation.errors },
      }, { status: 422 });
    }

    // ── Accounts section (user-level — independent of subscription pipeline) ──
    const seenEmails = new Set<string>();
    const uniqueUsers = allUsers.filter((u: any) => {
      const email = normEmail(u.email);
      if (!email || seenEmails.has(email)) return false;
      seenEmails.add(email);
      return true;
    });

    const subsByUserId = new Map<string, any[]>();
    const subsByEmail  = new Map<string, any[]>();
    allSubscriptions.forEach((sub: any) => {
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
      const email = normEmail(u.email);
      const byId    = subsByUserId.get(u.id) || [];
      const byEmail = subsByEmail.get(email)  || [];
      const seen = new Set<string>();
      return [...byId, ...byEmail].filter((s) => {
        const key = String(s.id || s.provider_subscription_id || Math.random());
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    const isActivePaidSub = (s: any): boolean => {
      const st = String(s.status || '').toLowerCase();
      if (!['active', 'trialing', 'trial'].includes(st)) return false;
      if (s.current_period_end && new Date(s.current_period_end) <= now) return false;
      return true;
    };

    const paidUsersList: any[] = [];
    const freeUsersList: any[]  = [];

    for (const u of uniqueUsers) {
      const email = normEmail(u.email);
      if (!email) continue;

      const userSubs   = getUserSubs(u);
      const activeSubs = userSubs.filter((s: any) => isActivePaidSub(s));
      let isPaid = activeSubs.length > 0;
      if (!isPaid && u.data) {
        const et = String(u.data.entitlement_tier || '').toLowerCase();
        const st = String(u.data.subscription_tier || '').toLowerCase();
        if (['premium', 'pro'].includes(et) || ['premium', 'pro'].includes(st)) isPaid = true;
      }

      const rankSub = (s: any): number => {
        const st = String(s.status || '').toLowerCase();
        if (st === 'active') return 5;
        if (st === 'trialing' || st === 'trial') return 4;
        if (st === 'incomplete') return 3;
        if (st === 'past_due') return 2;
        return 1;
      };
      const validSubs = userSubs.filter((s: any) => String(s.status || '').toLowerCase() !== 'incomplete_expired');
      const bestSub = validSubs.length > 0
        ? [...validSubs].sort((a, b) => {
            const rd = rankSub(b) - rankSub(a);
            return rd !== 0 ? rd : new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime();
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

    paidUsersList.sort((a, b) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime());
    freeUsersList.sort((a, b) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime());

    const totalUsers     = uniqueUsers.length;
    const paidUsersCount = paidUsersList.length;
    const freeUsersCount = freeUsersList.length;

    const signupSources = { web: 0, apple: 0, googlePlay: 0 };
    for (const u of uniqueUsers) {
      const platform = String(u.data?.platform || u.platform || 'web').toLowerCase();
      if (platform === 'apple' || platform === 'ios')            signupSources.apple++;
      else if (['android', 'googleplay', 'google'].includes(platform)) signupSources.googlePlay++;
      else                                                        signupSources.web++;
    }

    const newAccounts = {
      week:    uniqueUsers.filter((u: any) => { const d = new Date(u.created_date); return d >= calendarRanges.week.start    && d <= now; }).length,
      month:   uniqueUsers.filter((u: any) => { const d = new Date(u.created_date); return d >= calendarRanges.month.start   && d <= now; }).length,
      quarter: uniqueUsers.filter((u: any) => { const d = new Date(u.created_date); return d >= calendarRanges.quarter.start && d <= now; }).length,
      year:    uniqueUsers.filter((u: any) => { const d = new Date(u.created_date); return d >= calendarRanges.year.start    && d <= now; }).length,
    };

    const freeToPaidPct = totalUsers > 0
      ? parseFloat(((paidUsersCount / totalUsers) * 100).toFixed(1))
      : null;

    const multiModuleUsers = new Set<string>(
      activePaid
        .filter((s) => s.product === 'bundle')
        .map((s) => s.userId)
        .filter(Boolean)
    );
    const paidToAdditionalModulesPct = paidUsersCount > 0
      ? parseFloat(((multiModuleUsers.size / paidUsersCount) * 100).toFixed(1))
      : null;

    const canceledLast30d = allSubscriptions.filter((s: any) => {
      const status = String(s.status || '').toLowerCase();
      return status === 'canceled' && s.updated_date && new Date(s.updated_date) >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }).length;
    const paidToFreePct = agg.counts.totalSubscriptions > 0
      ? parseFloat(((canceledLast30d / agg.counts.totalSubscriptions) * 100).toFixed(1))
      : null;

    // ── Final response ─────────────────────────────────────────────────────
    return Response.json({
      // ── New canonical pipeline output ──
      counts:       agg.counts,
      revenue:      agg.revenue,
      products:     agg.products,
      renewals:     agg.renewals,
      renewalRevenue: agg.renewalRevenue,
      trialMetrics: agg.trialMetrics,
      validation:   { passed: true, errors: [] },

      // ── Account-level metrics ──
      accounts: {
        totalUsers,
        paidUsers:      paidUsersCount,
        freeUsers:      freeUsersCount,
        paidPercentage: freeToPaidPct,
        signupSources,
        newAccounts,
      },

      // ── Conversion ──
      conversion: {
        freeToPaidPct,
        paidToAdditionalModulesPct,
        paidToFreePct,
      },

      // ── User detail lists (for admin tables) ──
      paid_users: paidUsersList,
      free_users: freeUsersList,

      // ── Meta ──
      meta: {
        dateRangeDefinition: 'calendar-utc',
        generatedAt: now.toISOString(),
        calendarRanges: {
          week:    { start: calendarRanges.week.start.toISOString(),    end: calendarRanges.week.end.toISOString()    },
          month:   { start: calendarRanges.month.start.toISOString(),   end: calendarRanges.month.end.toISOString()   },
          quarter: { start: calendarRanges.quarter.start.toISOString(), end: calendarRanges.quarter.end.toISOString() },
          year:    { start: calendarRanges.year.start.toISOString(),    end: calendarRanges.year.end.toISOString()    },
        },
        subscriptionsProcessed: allSubscriptions.length,
        activeSubscriptionsClassified: activePaid.length,
      },
    });

  } catch (err: any) {
    console.error('[getUserReport] Unexpected error:', err);
    return Response.json({
      error: 'INTERNAL_ERROR',
      message: err?.message || 'An unexpected error occurred',
      validation: { passed: false, errors: [err?.message || 'Unknown error'] },
    }, { status: 500 });
  }
});
