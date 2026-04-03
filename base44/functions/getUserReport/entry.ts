import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

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

/** Match a field value against all known product keywords; return product key or null. */
function matchProductField(value: string): string | null {
  const v = value.toLowerCase();
  for (const { key, matches } of PRODUCT_KEYWORDS) {
    if (matches.some((m) => v.includes(m))) return key;
  }
  return null;
}

/**
 * Returns the product key the subscription belongs to, or null if it is a bundle.
 *
 * Fallback order:
 *  1. modules_csv primary entry
 *  2. product_kind field
 *  3. subscription_tier contains product name
 *  4. Provider plan identifier (price_id / apple_product_id) contains product name
 *  5. Main tier field contains product name
 *  6. plan_name / name / description contains product name
 *  7. Default: 'pipekeeper' (primary product; for legacy subs without product metadata)
 *
 * Non-bundle subs that reach step 7 are also counted in unclassifiedFallbackCount.
 */
function classifySubProduct(s: any): string | null {
  if (isBundleSub(s)) return null;

  // 1) modules_csv — use first recognised module
  for (const m of splitModulesCsv(s.modules_csv)) {
    const product = matchProductField(m);
    if (product) return product;
  }

  // 2–6) progressively weaker metadata fields
  const fields = [
    s.product_kind,
    s.subscription_tier,
    s.price_id || s.stripe_price_id || s.apple_product_id || s.plan_id,
    s.tier,
    s.plan_name || s.name || s.description,
  ];
  for (const f of fields) {
    if (!f) continue;
    const product = matchProductField(String(f));
    if (product) return product;
  }

  // 7) Default fallback: non-bundle subscription with no product-specific metadata is
  //    attributed to PipeKeeper — the primary product. Historical/legacy subscriptions
  //    often predate multi-product metadata. If a subscription actually belongs to a
  //    different product but has no identifying metadata, it will be misattributed here.
  //    Admins should review subscriptions.unclassifiedFallbackCount to gauge how many
  //    subs fell back to this default.
  return 'pipekeeper';
}

/**
 * Like classifySubProduct but returns null instead of the 'pipekeeper' default fallback.
 * Used to count subscriptions that lacked any explicit product metadata (unclassifiedFallbackCount).
 */
function classifySubProductExplicit(s: any): string | null {
  if (isBundleSub(s)) return null;

  for (const m of splitModulesCsv(s.modules_csv)) {
    const product = matchProductField(m);
    if (product) return product;
  }

  const fields = [
    s.product_kind,
    s.subscription_tier,
    s.price_id || s.stripe_price_id || s.apple_product_id || s.plan_id,
    s.tier,
    s.plan_name || s.name || s.description,
  ];
  for (const f of fields) {
    if (!f) continue;
    const product = matchProductField(String(f));
    if (product) return product;
  }

  return null; // truly unclassifiable (or a bundle — already handled above)
}

/**
 * Returns { start: Date, end: Date } for the given calendar period.
 * Periods are UTC-aligned calendar periods (not rolling windows).
 * - week:    Monday 00:00 UTC → Sunday 23:59:59 UTC of current ISO week
 * - month:   1st 00:00 UTC → last day 23:59:59 UTC of current month
 * - quarter: 1st day 00:00 UTC → last day 23:59:59 UTC of current calendar quarter
 * - year:    Jan 1 00:00 UTC → Dec 31 23:59:59 UTC of current year
 */
function getCalendarRange(type, now) {
  const start = new Date(now);
  let end;

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



function isActivePaidSub(sub, now) {
  const status = (sub.status || '').toLowerCase();
  if (!['active', 'trialing', 'trial'].includes(status)) return false;
  if (sub.current_period_end && new Date(sub.current_period_end) <= now) return false;
  return true;
}

// ─── Main handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
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

    // Calendar ranges (used for both "new accounts since start of period" and
    // "renewals between now and end of period")
    const calendarRanges = {
      week:    getCalendarRange('week',    now),
      month:   getCalendarRange('month',   now),
      quarter: getCalendarRange('quarter', now),
      year:    getCalendarRange('year',    now),
    };

    // ── Stripe amount lookup (best-effort; falls back to stored amount) ──────
    const stripeAmountMap = {};
    try {
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
      if (stripeKey) {
        const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
        let hasMore = true;
        let startingAfter = undefined;
        let fetchCount = 0;
        while (hasMore && fetchCount < 3) {
          const params = { limit: 100, status: 'active', expand: ['data.plan'] };
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
    const getSubAmount = (sub) => {
      const provider = (sub.provider || 'stripe').toLowerCase();
      if (provider === 'stripe') {
        const stripeId = sub.provider_subscription_id || sub.stripe_subscription_id;
        const fromStripe = stripeId ? (stripeAmountMap[stripeId] || 0) : 0;
        return fromStripe > 0 ? fromStripe : (Number(sub.amount) || 0);
      }
      return Number(sub.amount) || 0;
    };

    // ── Deduplicate users by email ────────────────────────────────────────────
    const seenEmails = new Set();
    const uniqueUsers = allUsers.filter((u) => {
      const email = normEmail(u.email);
      if (!email || seenEmails.has(email)) return false;
      seenEmails.add(email);
      return true;
    });

    // ── Subscription lookup maps ──────────────────────────────────────────────
    const subsByUserId = new Map();
    const subsByEmail  = new Map();
    allSubscriptions.forEach((sub) => {
      if (sub.user_id) {
        if (!subsByUserId.has(sub.user_id)) subsByUserId.set(sub.user_id, []);
        subsByUserId.get(sub.user_id).push(sub);
      }
      const email = normEmail(sub.user_email);
      if (email) {
        if (!subsByEmail.has(email)) subsByEmail.set(email, []);
        subsByEmail.get(email).push(sub);
      }
    });

    const getUserSubs = (u) => {
      const email = normEmail(u.email);
      const byId    = subsByUserId.get(u.id) || [];
      const byEmail = subsByEmail.get(email)  || [];
      const seen = new Set();
      return [...byId, ...byEmail].filter((s) => {
        const key = s.id || s.provider_subscription_id || Math.random();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    // ── Classify each unique user as paid or free ─────────────────────────────
    // "Paid user" = has ≥1 active paid subscription record.
    const paidUsersList = [];
    const freeUsersList = [];

    for (const u of uniqueUsers) {
      const email = normEmail(u.email);
      if (!email) continue;

      const userSubs   = getUserSubs(u);
      const activeSubs = userSubs.filter((s) => isActivePaidSub(s, now));
      let isPaid = activeSubs.length > 0;

      // Fallback: honour entitlement fields on the user record if no sub rows exist
      if (!isPaid && u.data) {
        const et = (u.data.entitlement_tier || '').toLowerCase();
        const st = (u.data.subscription_tier || '').toLowerCase();
        if (['premium', 'pro'].includes(et) || ['premium', 'pro'].includes(st)) {
          isPaid = true;
        }
      }

      // Pick best subscription for display metadata (highest-ranked status, newest)
      const rankSub = (s) => {
        const st = (s.status || '').toLowerCase();
        if (st === 'active') return 5;
        if (st === 'trialing' || st === 'trial') return 4;
        if (st === 'incomplete') return 3;
        if (st === 'past_due') return 2;
        return 1;
      };
      const validSubs = userSubs.filter((s) => (s.status || '').toLowerCase() !== 'incomplete_expired');
      const bestSub = validSubs.length > 0
        ? [...validSubs].sort((a, b) => {
            const rd = rankSub(b) - rankSub(a);
            return rd !== 0 ? rd : new Date(b.created_date || 0) - new Date(a.created_date || 0);
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

    const totalUsers      = uniqueUsers.length;
    const paidUsersCount  = paidUsersList.length;
    const freeUsersCount  = freeUsersList.length;

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

    // New accounts = accounts whose created_date falls within [start-of-period, now]
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

    // ── SUBSCRIPTIONS ─────────────────────────────────────────────────────────
    // All active paid subscription records (subscription-level — NOT user-deduped).
    const activePaidSubs = allSubscriptions.filter((s) => isActivePaidSub(s, now));
    const totalPaidSubscriptions = activePaidSubs.length;

    // Monthly / annual active paid subscription counts (based on billing_interval field).
    const monthlySubscriptions = activePaidSubs.filter((s) => {
      const interval = (s.billing_interval || s.billing_period || '').toLowerCase();
      return interval === 'month' || interval === 'monthly';
    }).length;
    const annualSubscriptions = activePaidSubs.filter((s) => {
      const interval = (s.billing_interval || s.billing_period || '').toLowerCase();
      return interval === 'year' || interval === 'yearly' || interval === 'annual';
    }).length;

    // Paid subscriptions by product:
    // Uses classifySubProduct() which falls back through modules_csv → product_kind →
    // subscription_tier → provider plan identifiers → tier field → plan name →
    // pipekeeper default (for legacy / untagged non-bundle subs).
    const paidByProduct = {
      pipekeeper:    activePaidSubs.filter((s) => classifySubProduct(s) === 'pipekeeper').length,
      whiskeykeeper: activePaidSubs.filter((s) => classifySubProduct(s) === 'whiskeykeeper').length,
      cigarkeeper:   activePaidSubs.filter((s) => classifySubProduct(s) === 'cigarkeeper').length,
      winekeeper:    activePaidSubs.filter((s) => classifySubProduct(s) === 'winekeeper').length,
    };

    // Count how many non-bundle subs had no explicit product-identification metadata and
    // therefore used the pipekeeper default fallback (admin transparency).
    const unclassifiedFallbackCount = activePaidSubs.filter(
      (s) => !isBundleSub(s) && classifySubProductExplicit(s) === null
    ).length;

    // Paid subscriptions by bundle type
    const paidByBundle = {
      founders:     activePaidSubs.filter((s) =>
        (s.product_kind || '').toLowerCase() === 'founders' ||
        (s.bundle_name  || '').toLowerCase().includes('founders')
      ).length,
      threeModules: activePaidSubs.filter((s) => s.checkout_type === 'bundle_3').length,
      fourModules:  activePaidSubs.filter((s) =>
        s.checkout_type === 'bundle_4' &&
        (s.product_kind || '').toLowerCase() !== 'founders'
      ).length,
    };

    // Renewing subscriptions = active subs whose current_period_end falls in [now, end-of-period]
    const calcRenewing = (endDate) => {
      const renewingSubs = allSubscriptions.filter((s) => {
        const status    = (s.status || '').toLowerCase();
        const periodEnd = s.current_period_end ? new Date(s.current_period_end) : null;
        return status === 'active' && periodEnd && periodEnd > now && periodEnd <= endDate;
      });
      const uniqueCustomers = new Set(
        renewingSubs.map((s) => s.user_id || normEmail(s.user_email)).filter(Boolean)
      );
      return { customers: uniqueCustomers.size, subscriptions: renewingSubs.length };
    };

    const renewingPeriods = {
      week:    calcRenewing(calendarRanges.week.end),
      month:   calcRenewing(calendarRanges.month.end),
      quarter: calcRenewing(calendarRanges.quarter.end),
      year:    calcRenewing(calendarRanges.year.end),
    };

    // Trial metrics (operational subset, kept in subscriptions for admin use)
    const trialSubs = allSubscriptions.filter((s) => (s.status || '').toLowerCase() === 'trialing');
    const trialEndDates = trialSubs
      .map((s) => s.trial_end_date || s.current_period_end)
      .filter(Boolean)
      .map((d) => new Date(d));
    const trialEndingIn3d = trialEndDates.filter((d) => { const diff = d - now; return diff > 0 && diff <= 3 * 864e5; }).length;
    const trialEndingIn7d = trialEndDates.filter((d) => { const diff = d - now; return diff > 0 && diff <= 7 * 864e5; }).length;
    const avgTrialDaysRemaining = trialEndDates.length > 0
      ? Math.round((trialEndDates.reduce((s, d) => s + Math.max(0, (d - now) / 864e5), 0) / trialEndDates.length) * 10) / 10
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

    const subscriptions = {
      totalPaidSubscriptions,
      monthlySubscriptions,
      annualSubscriptions,
      unclassifiedFallbackCount,
      paidByProduct,
      paidByBundle,
      renewingCustomers: {
        week:    renewingPeriods.week.customers,
        month:   renewingPeriods.month.customers,
        quarter: renewingPeriods.quarter.customers,
        year:    renewingPeriods.year.customers,
      },
      renewingSubscriptions: {
        week:    renewingPeriods.week.subscriptions,
        month:   renewingPeriods.month.subscriptions,
        quarter: renewingPeriods.quarter.subscriptions,
        year:    renewingPeriods.year.subscriptions,
      },
      trialMetrics: {
        currentlyOnTrial:    trialSubs.length,
        avgDaysRemaining:    avgTrialDaysRemaining,
        endingIn3Days:       trialEndingIn3d,
        endingIn7Days:       trialEndingIn7d,
        convertedLast30d,
        dropoffLast30d,
      },
    };

    // ── REVENUE ───────────────────────────────────────────────────────────────
    // Forecasted revenue = sum of amounts from subs renewing in [now, end-of-period].
    const calcForecastedRevenue = (endDate) =>
      allSubscriptions
        .filter((s) => {
          const status    = (s.status || '').toLowerCase();
          const periodEnd = s.current_period_end ? new Date(s.current_period_end) : null;
          return status === 'active' && periodEnd && periodEnd > now && periodEnd <= endDate;
        })
        .reduce((sum, s) => sum + getSubAmount(s), 0);

    // MRR = sum of all active subs converted to monthly amounts.
    // Monthly sub → full amount; annual sub → amount ÷ 12.
    const totalMRR = activePaidSubs.reduce((sum, s) => {
      const amount   = getSubAmount(s);
      const interval = (s.billing_interval || s.billing_period || '').toLowerCase();
      return sum + (interval === 'year' || interval === 'annual' ? amount / 12 : amount);
    }, 0);

    // Revenue by product: credit single-module subscriptions to their product.
    // Bundle subscriptions are credited to revenueByBundle (no per-module split to avoid double-counting).
    const revenueByProduct = { pipekeeper: 0, whiskeykeeper: 0, cigarkeeper: 0, winekeeper: 0 };
    const revenueByBundle  = { founders: 0, threeModules: 0, fourModules: 0 };

    for (const s of activePaidSubs) {
      const amount      = getSubAmount(s);
      const productKind = (s.product_kind || '').toLowerCase();
      const bundleName  = (s.bundle_name  || '').toLowerCase();
      const checkoutType = (s.checkout_type || '').toLowerCase();

      if (productKind === 'founders' || bundleName.includes('founders')) {
        revenueByBundle.founders     += amount;
      } else if (checkoutType === 'bundle_3') {
        revenueByBundle.threeModules += amount;
      } else if (checkoutType === 'bundle_4') {
        revenueByBundle.fourModules  += amount;
      } else {
        // Single-module: use the same multi-fallback classifier used for paidByProduct
        const product = classifySubProduct(s);
        if (product === 'pipekeeper')    revenueByProduct.pipekeeper    += amount;
        else if (product === 'whiskeykeeper') revenueByProduct.whiskeykeeper += amount;
        else if (product === 'cigarkeeper')   revenueByProduct.cigarkeeper   += amount;
        else if (product === 'winekeeper')    revenueByProduct.winekeeper    += amount;
      }
    }

    // Round to cents
    for (const k of Object.keys(revenueByProduct)) revenueByProduct[k] = parseFloat(revenueByProduct[k].toFixed(2));
    for (const k of Object.keys(revenueByBundle))  revenueByBundle[k]  = parseFloat(revenueByBundle[k].toFixed(2));

    const revenue = {
      // Subscriptions renewing during the remaining portion of each calendar period.
      // These amounts represent UPCOMING renewal charges, not run-rate revenue.
      renewalRevenue: {
        week:    parseFloat(calcForecastedRevenue(calendarRanges.week.end).toFixed(2)),
        month:   parseFloat(calcForecastedRevenue(calendarRanges.month.end).toFixed(2)),
        quarter: parseFloat(calcForecastedRevenue(calendarRanges.quarter.end).toFixed(2)),
        year:    parseFloat(calcForecastedRevenue(calendarRanges.year.end).toFixed(2)),
      },
      // Current run rate: MRR = sum of all active subs normalised to a monthly amount.
      // ARR = MRR × 12. These are independent of the calendar renewal revenue above.
      mrr: parseFloat(totalMRR.toFixed(2)),
      arr: parseFloat((totalMRR * 12).toFixed(2)),
      byProduct: revenueByProduct,
      byBundle:  revenueByBundle,
    };

    // ── CONVERSION ────────────────────────────────────────────────────────────
    // freeToPaidPct: % of all accounts that currently have an active paid subscription
    const freeToPaidPct = accounts.paidPercentage;

    // paidToAdditionalModulesPct: % of paid users who hold a multi-module subscription
    const multiModuleUsers = new Set(
      activePaidSubs
        .filter((s) => splitModulesCsv(s.modules_csv).length > 1 || (s.checkout_type || '').startsWith('bundle_'))
        .map((s) => s.user_id || normEmail(s.user_email))
        .filter(Boolean)
    );
    const paidToAdditionalModulesPct = paidUsersCount > 0
      ? parseFloat(((multiModuleUsers.size / paidUsersCount) * 100).toFixed(1))
      : 0;

    // paidToFreePct: rolling 30-day churn rate = canceled subs in past 30d / active subs
    const canceledLast30d = allSubscriptions.filter((s) => {
      const status = (s.status || '').toLowerCase();
      return status === 'canceled' && s.updated_date && new Date(s.updated_date) >= thirtyDaysAgo;
    }).length;
    const paidToFreePct = activePaidSubs.length > 0
      ? parseFloat(((canceledLast30d / activePaidSubs.length) * 100).toFixed(1))
      : 0;

    const conversion = {
      freeToPaidPct,
      paidToAdditionalModulesPct,
      paidToFreePct,
    };

    // ── USAGE ─────────────────────────────────────────────────────────────────
    // Per-module activity events are not tracked in the current data model.
    // Estimated percentage math is not exposed as real metrics (per requirements).
    const usage = {
      dauByModule: { pipekeeper: null, whiskeykeeper: null, cigarkeeper: null, winekeeper: null },
      wauByModule: { pipekeeper: null, whiskeykeeper: null, cigarkeeper: null, winekeeper: null },
      note: 'Per-module activity events are not available in the current data model.',
    };

    // ── Sort detail lists ─────────────────────────────────────────────────────
    paidUsersList.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
    freeUsersList.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));

    return Response.json({
      // ── Canonical reporting shape ──
      accounts,
      subscriptions,
      revenue,
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
      // ── Legacy fields (used by detail tables in UserReport.jsx) ──
      summary: {
        total_users:     totalUsers,
        paid_users:      paidUsersCount,
        free_users:      freeUsersCount,
        paid_percentage: accounts.paidPercentage,
      },
      paid_users: paidUsersList,
      free_users: freeUsersList,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});