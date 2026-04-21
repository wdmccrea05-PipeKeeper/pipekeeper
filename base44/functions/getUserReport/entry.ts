import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normEmail = (email) => String(email || '').trim().toLowerCase();

function splitModulesCsv(csv) {
  if (!csv) return [];
  return csv.split(',').map((m) => m.trim().toLowerCase()).filter(Boolean);
}

// Expanded product keyword recognizers including legacy aliases
const PRODUCT_KEYWORDS = [
  { key: 'pipekeeper',    matches: ['pipekeeper', 'pipe_keeper', 'pk', '_pk_', '_pk-', '-pk_', 'pipe keeper'] },
  { key: 'whiskeykeeper', matches: ['whiskeykeeper', 'whiskey_keeper', 'wk', '_wk_', '_wk-', '-wk_', 'whiskey keeper', 'whiskey'] },
  { key: 'cigarkeeper',   matches: ['cigarkeeper', 'cigar_keeper', 'ck', '_ck_', '_ck-', '-ck_', 'cigar keeper', 'cigar'] },
  { key: 'winekeeper',    matches: ['winekeeper', 'wine_keeper', 'wine keeper', 'wine'] },
];

const BUNDLE_MARKERS = ['founders', 'bundle_3', 'bundle_4', 'bundle3', 'bundle4', 'three_module', 'four_module', 'all_modules'];

function isBundleSub(s) {
  const fields = [
    s.product_kind, s.bundle_name, s.checkout_type,
    s.price_id, s.stripe_price_id, s.apple_product_id, s.plan_id,
    s.plan_name, s.name, s.description,
  ].map((f) => (f || '').toLowerCase());
  return fields.some((f) => BUNDLE_MARKERS.some((m) => f.includes(m)));
}

function matchProductKeyword(value) {
  const v = (value || '').toLowerCase();
  for (const { key, matches } of PRODUCT_KEYWORDS) {
    if (matches.some((m) => v.includes(m))) return key;
  }
  return null;
}

/**
 * Classify product — NEVER throws, always returns a string.
 * Returns 'bundle' | 'pipekeeper' | 'whiskeykeeper' | 'cigarkeeper' | 'winekeeper' | 'unknown_product'
 */
function classifyProduct(s) {
  if (isBundleSub(s)) return 'bundle';

  // 1) modules_csv
  for (const m of splitModulesCsv(s.modules_csv)) {
    const p = matchProductKeyword(m);
    if (p) return p;
  }

  // 2) productId (Apple/Google field)
  const productId = s.productId || s.product_id || '';
  if (productId) {
    const p = matchProductKeyword(productId);
    if (p) return p;
  }

  // 3) All other metadata fields in priority order
  const fields = [
    s.product_kind, s.subscription_tier,
    s.price_id, s.stripe_price_id, s.apple_product_id, s.plan_id,
    s.tier, s.plan_name, s.name, s.description,
  ];
  for (const f of fields) {
    if (!f) continue;
    const p = matchProductKeyword(String(f));
    if (p) return p;
  }

  return 'unknown_product';
}

/**
 * Derive billing interval — NEVER throws.
 * Returns 'monthly' | 'annual' | 'unknown_interval'
 */
function deriveInterval(s) {
  const raw = (s.billing_interval || s.billing_period || s.interval || '').toLowerCase();
  if (raw === 'month' || raw === 'monthly') return 'monthly';
  if (raw === 'year' || raw === 'yearly' || raw === 'annual') return 'annual';

  const planId = (s.price_id || s.stripe_price_id || s.apple_product_id || s.plan_id || s.productId || '').toLowerCase();
  if (planId.includes('annual') || planId.includes('yearly') || planId.includes('year')) return 'annual';
  if (planId.includes('monthly') || planId.includes('month')) return 'monthly';

  return 'unknown_interval';
}

/**
 * Classify a raw subscription into a row state.
 * States: VALID | UNKNOWN_PRODUCT | UNKNOWN_INTERVAL | ERROR | INACTIVE | DUPLICATE
 */
function classifyRowState(s, getSubAmount, now) {
  const status = (s.status || '').toLowerCase();
  if (!['active', 'trialing', 'trial'].includes(status)) return 'INACTIVE';

  const product = classifyProduct(s);
  const interval = deriveInterval(s);

  let price = 0;
  try { price = getSubAmount(s); } catch {}
  if (typeof price !== 'number' || isNaN(price) || price < 0) price = 0;

  if (product === 'unknown_product') return 'UNKNOWN_PRODUCT';
  if (interval === 'unknown_interval') return 'UNKNOWN_INTERVAL';
  return 'VALID';
}

function isActivePaidSub(sub, now) {
  const status = (sub.status || '').toLowerCase();
  if (!['active', 'trialing', 'trial'].includes(status)) return false;
  if (sub.current_period_end && new Date(sub.current_period_end) <= now) return false;
  return true;
}

function getCalendarRange(type, now) {
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
      start.setUTCHours(0, 0, 0, 0);
      end = new Date(now);
  }
  return { start, end };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

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

    const allUsers = await fetchAll(base44.asServiceRole.entities.User);
    await new Promise((r) => setTimeout(r, 200));
    const allSubscriptions = await fetchAll(base44.asServiceRole.entities.Subscription);

    const now = new Date();

    const calendarRanges = {
      week:    getCalendarRange('week',    now),
      month:   getCalendarRange('month',   now),
      quarter: getCalendarRange('quarter', now),
      year:    getCalendarRange('year',    now),
    };

    // ── Stripe amount lookup (best-effort) ────────────────────────────────────
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
          startingAfter = (hasMore && stripePage.data.length > 0)
            ? stripePage.data[stripePage.data.length - 1].id
            : undefined;
          if (!hasMore) break;
          fetchCount++;
        }
      }
    } catch {
      // Stripe unavailable — fall back to stored amounts
    }

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

    // ── Deduplicate subscriptions ─────────────────────────────────────────────
    const seenSubIds = new Set();
    const duplicateRows = [];
    const dedupedSubs = [];
    for (const s of allSubscriptions) {
      const key = s.id || s.provider_subscription_id || s.stripe_subscription_id;
      if (key && seenSubIds.has(key)) {
        duplicateRows.push(s);
      } else {
        if (key) seenSubIds.add(key);
        dedupedSubs.push(s);
      }
    }

    // ── Subscription lookup maps ──────────────────────────────────────────────
    const subsByUserId = new Map();
    const subsByEmail  = new Map();
    dedupedSubs.forEach((sub) => {
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
      const byEmail = subsByEmail.get(email) || [];
      const seen = new Set();
      return [...byId, ...byEmail].filter((s) => {
        const key = s.id || s.provider_subscription_id || s.stripe_subscription_id;
        if (!key) return true;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    // ── Classify ALL active subscription rows (RESILIENT — no fatal stops) ────
     const activePaidRawSubs = dedupedSubs.filter((s) => isActivePaidSub(s, now));

     const trustedRows = [];       // fully mapped
     const inferredRows = [];      // active paid, product/interval inferable
     const unknownProductRows = [];
     const unknownIntervalRows = [];
     const errorRows = [];

     for (const s of activePaidRawSubs) {
       try {
         const product  = classifyProduct(s);
         const interval = deriveInterval(s);
         const price    = getSubAmount(s);
         const userId   = String(s.user_id || normEmail(s.user_email) || '');

         const normalized = {
           subscriptionId: String(s.id || s.provider_subscription_id || s.stripe_subscription_id || ''),
           userId,
           status:   (s.status || '').toLowerCase(),
           price:    (typeof price === 'number' && !isNaN(price) && price >= 0) ? price : 0,
           currency: (s.currency || 'usd').toLowerCase(),
           interval,
           product,
           renewalDate: s.current_period_end ? new Date(s.current_period_end) : null,
           // raw snapshot for exceptions queue
           _raw: {
             id: s.id,
             user_id: s.user_id,
             user_email: s.user_email,
             provider: s.provider,
             product_kind: s.product_kind,
             price_id: s.price_id,
             stripe_price_id: s.stripe_price_id,
             apple_product_id: s.apple_product_id,
             billing_interval: s.billing_interval,
             amount: s.amount,
             status: s.status,
           },
         };

         if (product === 'unknown_product') {
           unknownProductRows.push(normalized);
         } else if (interval === 'unknown_interval') {
           unknownIntervalRows.push(normalized);
         } else {
           trustedRows.push(normalized);
         }
       } catch (e) {
         errorRows.push({ raw: s, error: String(e?.message || e) });
       }
     }

     // ── Attempt inference on unknown-product rows ────────────────────────────
     // If active paid sub has unknown product but has price + interval, count it
     for (const r of unknownProductRows) {
       if (r.interval !== 'unknown_interval' && r.price > 0) {
         inferredRows.push({ ...r, product: 'inferred' });
       }
     }

     // Combine trusted + inferred for revenue metrics
     const revenueQualifiedRows = [...trustedRows, ...inferredRows];

    // ── Aggregate from REVENUE-QUALIFIED rows (trusted + inferred) ────────────
    const totalQualifiedSubs  = revenueQualifiedRows.length;
    const uniquePayingUsers   = new Set(revenueQualifiedRows.map((s) => s.userId)).size;
    const monthlySubs         = revenueQualifiedRows.filter((s) => s.interval === 'monthly').length;
    const annualSubs          = revenueQualifiedRows.filter((s) => s.interval === 'annual').length;

    const totalMRR = revenueQualifiedRows.reduce((sum, s) => {
      return sum + (s.interval === 'annual' ? s.price / 12 : s.price);
    }, 0);
    const mrr = parseFloat(totalMRR.toFixed(2));
    const arr = parseFloat((totalMRR * 12).toFixed(2));

    const revenueByProduct = { pipekeeper: 0, whiskeykeeper: 0, cigarkeeper: 0, winekeeper: 0, bundle: 0, inferred: 0 };
    const productCounts    = { pipekeeper: 0, whiskeykeeper: 0, cigarkeeper: 0, winekeeper: 0, bundle: 0, inferred: 0 };
    for (const s of revenueQualifiedRows) {
      const key = s.product || 'inferred';
      revenueByProduct[key] = parseFloat(((revenueByProduct[key] || 0) + s.price).toFixed(2));
      productCounts[key]    = (productCounts[key] || 0) + 1;
    }

    // ── Renewal revenue (from revenue-qualified rows) ──────────────────────────
    const calcRenewal = (periodEnd) => {
      const renewingSubs = revenueQualifiedRows.filter((s) => {
        return s.renewalDate && s.renewalDate > now && s.renewalDate <= periodEnd;
      });
      const uniqueCustomers = new Set(renewingSubs.map((s) => s.userId));
      const revenue = parseFloat(renewingSubs.reduce((sum, s) => sum + s.price, 0).toFixed(2));
      return { customers: uniqueCustomers.size, subscriptions: renewingSubs.length, revenue };
    };

    const renewals = {
      thisWeek:    calcRenewal(calendarRanges.week.end),
      thisMonth:   calcRenewal(calendarRanges.month.end),
      thisQuarter: calcRenewal(calendarRanges.quarter.end),
      thisYear:    calcRenewal(calendarRanges.year.end),
    };

    // ── Classify each user as paid or free ────────────────────────────────────
    const paidUsersList = [];
    const freeUsersList = [];

    const rankSub = (s) => {
      const st = (s.status || '').toLowerCase();
      if (st === 'active') return 5;
      if (st === 'trialing' || st === 'trial') return 4;
      if (st === 'incomplete') return 3;
      if (st === 'past_due') return 2;
      return 1;
    };

    for (const u of uniqueUsers) {
      const email = normEmail(u.email);
      if (!email) continue;

      const userSubs   = getUserSubs(u);
      const activeSubs = userSubs.filter((s) => isActivePaidSub(s, now));
      let isPaid = activeSubs.length > 0;

      if (!isPaid && u.data) {
        const et = (u.data.entitlement_tier || '').toLowerCase();
        const st = (u.data.subscription_tier || '').toLowerCase();
        if (['premium', 'pro'].includes(et) || ['premium', 'pro'].includes(st)) isPaid = true;
      }

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

    // ── Accounts ──────────────────────────────────────────────────────────────
    const signupSources = { web: 0, apple: 0, googlePlay: 0 };
    for (const u of uniqueUsers) {
      const platform = (u.data?.platform || u.platform || 'web').toLowerCase();
      if (platform === 'apple' || platform === 'ios') signupSources.apple++;
      else if (platform === 'android' || platform === 'googleplay' || platform === 'google') signupSources.googlePlay++;
      else signupSources.web++;
    }

    const newAccounts = {
      week:    uniqueUsers.filter((u) => { const d = new Date(u.created_date); return d >= calendarRanges.week.start    && d <= now; }).length,
      month:   uniqueUsers.filter((u) => { const d = new Date(u.created_date); return d >= calendarRanges.month.start   && d <= now; }).length,
      quarter: uniqueUsers.filter((u) => { const d = new Date(u.created_date); return d >= calendarRanges.quarter.start && d <= now; }).length,
      year:    uniqueUsers.filter((u) => { const d = new Date(u.created_date); return d >= calendarRanges.year.start    && d <= now; }).length,
    };

    // ── Data health ───────────────────────────────────────────────────────────
    const totalActiveRows  = activePaidRawSubs.length;
    const exceptionCount   = unknownIntervalRows.length + errorRows.length;
    const dataHealthPct    = totalActiveRows > 0
      ? parseFloat((((trustedRows.length + inferredRows.length) / totalActiveRows) * 100).toFixed(1))
      : 100;

    // ── Exceptions queue (sample IDs for admin review) ────────────────────────
    const sampleSize = 10;
    const exceptions = {
      unknownProduct: {
        count: unknownProductRows.length,
        samples: unknownProductRows.slice(0, sampleSize).map((r) => r._raw),
      },
      unknownInterval: {
        count: unknownIntervalRows.length,
        samples: unknownIntervalRows.slice(0, sampleSize).map((r) => r._raw),
      },
      duplicatesRemoved: duplicateRows.length,
      errorRows: {
        count: errorRows.length,
        samples: errorRows.slice(0, sampleSize),
      },
    };

    return Response.json({
      // ── Accounts ──────────────────────────────────────────────────────────
      accounts: {
        totalUsers,
        paidUsers:      paidUsersCount,
        freeUsers:      freeUsersCount,
        paidPercentage: totalUsers > 0 ? parseFloat(((paidUsersCount / totalUsers) * 100).toFixed(1)) : 0,
        signupSources,
        newAccounts,
      },

      // ── Core metrics (trusted + inferred) ────────────────────────────────────
      counts: {
        totalSubscriptions:   totalQualifiedSubs,
        trustedRows: trustedRows.length,
        inferredRows: inferredRows.length,
        unknownProductRows: unknownProductRows.length,
        unknownIntervalRows: unknownIntervalRows.length,
        uniquePayingUsers,
        monthlySubscriptions: monthlySubs,
        annualSubscriptions:  annualSubs,
        totalActiveRows,
        exceptionCount,
        dataHealthPct,
      },

      // ── Revenue (trusted rows only) ───────────────────────────────────────
      revenue: { mrr, arr, byProduct: revenueByProduct },

      // ── Product mix ───────────────────────────────────────────────────────
      products: productCounts,

      // ── Renewals ──────────────────────────────────────────────────────────
      renewals,

      // ── Exceptions queue ─────────────────────────────────────────────────
      exceptions,

      // ── Detail tables ─────────────────────────────────────────────────────
      paid_users: paidUsersList,
      free_users: freeUsersList,

      // ── Meta ─────────────────────────────────────────────────────────────
      meta: {
        generatedAt: now.toISOString(),
        totalRawSubscriptions: allSubscriptions.length,
        dedupedSubscriptions:  dedupedSubs.length,
      },

      // ── Summary ───────────────────────────────────────────────────────────
      summary: {
        total_users:     totalUsers,
        paid_users:      paidUsersCount,
        free_users:      freeUsersCount,
        paid_percentage: totalUsers > 0 ? parseFloat(((paidUsersCount / totalUsers) * 100).toFixed(1)) : 0,
      },
    });

  } catch (error) {
    console.error('[getUserReport] HARD FAILURE:', error);
    return Response.json({
      error: String(error?.message || error),
      accounts: {}, counts: {}, revenue: {}, products: {}, renewals: {},
      exceptions: { unknownProduct: { count: 0, samples: [] }, unknownInterval: { count: 0, samples: [] }, duplicatesRemoved: 0, errorRows: { count: 0, samples: [] } },
      paid_users: [], free_users: [], meta: {}, summary: {},
    }, { status: 200 });
  }
});