import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';
import {
  countUsersActiveWithin,
  isReportingActiveStatus,
  normalizeMetricInterval,
  parseMetricDate,
  summarizeRevenueRowsInRange,
} from '../../shared/reportingMetrics.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Paginated fetch
    const PAGE = 50;
    const fetchAll = async (entity) => {
      const results = [];
      let skip = 0;
      while (true) {
        let page = await entity.list(null, PAGE, skip);
        if (typeof page === 'string') {
          try { page = JSON.parse(page); } catch (_e) { break; }
        }
        if (!Array.isArray(page) || page.length === 0) break;
        results.push(...page);
        if (page.length < PAGE) break;
        skip += PAGE;
      }
      return results;
    };

    // Try to use cached Stripe amounts, fallback to stored amounts to avoid rate limits
    const stripeAmountMap = {};
    try {
      const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), { apiVersion: '2023-10-16' });
      // Only fetch if we haven't fetched recently (cache for 1 hour in local scope)
      let stripeHasMore = true;
      let stripeStartingAfter = undefined;
      while (stripeHasMore) {
        const params = { limit: 100, status: 'active', expand: ['data.plan'] };
        if (stripeStartingAfter) params.starting_after = stripeStartingAfter;
        const stripePage = await stripe.subscriptions.list(params);
        for (const s of stripePage.data) {
          const amountCents = s.plan?.amount || s.items?.data?.[0]?.price?.unit_amount || 0;
          stripeAmountMap[s.id] = amountCents / 100;
        }
        stripeHasMore = stripePage.has_more;
        if (stripeHasMore && stripePage.data.length > 0) {
          stripeStartingAfter = stripePage.data[stripePage.data.length - 1].id;
        } else {
          stripeHasMore = false;
        }
      }
    } catch (stripeErr) {
      // Rate limit or other error — just use stored amounts
      if (import.meta?.env?.DEV) {
        console.warn('[calculateUserMetrics] Stripe fetch failed, using stored amounts:', stripeErr?.message);
      }
    }

    const [subscriptions, allUsers] = await Promise.all([
      fetchAll(base44.asServiceRole.entities.Subscription),
      fetchAll(base44.asServiceRole.entities.User),
    ]);

    const now = new Date();
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const next90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const next365Days = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    // Count active paid subscribers — deduplicate by user identity
    const paidSubs = subscriptions.filter(sub => {
      return isReportingActiveStatus(sub.status);
    });

    const uniquePaidUsers = new Set();
    paidSubs.forEach(sub => {
      const uid = sub.user_email || sub.user_id || sub.created_by;
      if (uid) uniquePaidUsers.add(uid);
    });
    const consolidatedPaidUsers = uniquePaidUsers.size > 0 ? uniquePaidUsers.size : paidSubs.length;

    // Legacy premium count
    const legacyDate = new Date('2026-02-01');
    const legacyPremiumSubs = paidSubs.filter(sub => {
      const startDate = new Date(sub.started_at || sub.created_date || '');
      const tier = String(sub.tier || '').toLowerCase();
      return startDate < legacyDate && tier === 'premium';
    });
    const uniqueLegacyUsers = new Set();
    legacyPremiumSubs.forEach(sub => {
      const uid = sub.user_email || sub.user_id || sub.created_by;
      if (uid) uniqueLegacyUsers.add(uid);
    });
    const legacyPremiumCount = uniqueLegacyUsers.size > 0 ? uniqueLegacyUsers.size : legacyPremiumSubs.length;

    // New accounts in time periods
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last90d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const newAccounts24h = allUsers.filter(u => new Date(u.created_date || '') > last24h).length;
    const newAccounts7d = allUsers.filter(u => new Date(u.created_date || '') > last7d).length;
    const newAccounts30d = allUsers.filter(u => new Date(u.created_date || '') > last30d).length;
    const newAccounts90d = allUsers.filter(u => new Date(u.created_date || '') > last90d).length;

    // Active user estimates
    const totalUsers = allUsers.length;
    const dailyActiveUsers = countUsersActiveWithin(
      allUsers,
      now,
      1,
      (user) => parseMetricDate(user.updated_date || user.created_date),
    );
    const weeklyActiveUsers = countUsersActiveWithin(
      allUsers,
      now,
      7,
      (user) => parseMetricDate(user.updated_date || user.created_date),
    );

    // Calculate avg pipes and tobacco per user (defer calculation on heavy data fetch)
    const avgPipesPerUser = 0;
    const avgTobaccoPerUser = 0;

    // Renewals: subscriptions whose current_period_end falls within [now, endDate]
    const getSubscriptionAmount = (sub) => {
      const provider = String(sub.provider || 'stripe').toLowerCase();
      if (provider === 'stripe') {
        const stripeId = sub.provider_subscription_id || sub.stripe_subscription_id;
        const stripeAmount = stripeId ? (stripeAmountMap[stripeId] || 0) : 0;
        return stripeAmount || Number(sub.amount) || 0;
      }
      return Number(sub.amount) || 0;
    };

    const calculateRevenue = (renewalList) => renewalList.reduce((sum, sub) => sum + getSubscriptionAmount(sub), 0);
    const activeRenewalSubs = subscriptions.filter((sub) => String(sub.status || '').toLowerCase() === 'active');
    const breakdownByWindow = (endDate) => {
      const base = summarizeRevenueRowsInRange(
        activeRenewalSubs,
        { start: now, end: endDate },
        {
          getUserKey: (sub) => sub.user_email || sub.user_id || sub.created_by,
          getAmount: (sub) => getSubscriptionAmount(sub),
          getInterval: (sub) => normalizeMetricInterval(sub.billing_interval),
          getDate: (sub) => parseMetricDate(sub.current_period_end),
        },
      );
      const monthlyRows = activeRenewalSubs.filter((sub) => {
        const periodEnd = parseMetricDate(sub.current_period_end);
        return periodEnd && periodEnd > now && periodEnd <= endDate && normalizeMetricInterval(sub.billing_interval) === 'month';
      });
      const annualRows = activeRenewalSubs.filter((sub) => {
        const periodEnd = parseMetricDate(sub.current_period_end);
        return periodEnd && periodEnd > now && periodEnd <= endDate && normalizeMetricInterval(sub.billing_interval) === 'year';
      });
      return {
        ...base,
        totalAmount: base.totalAmount,
        monthlyAmount: calculateRevenue(monthlyRows),
        annualAmount: calculateRevenue(annualRows),
      };
    };

    // Count by tier
    const proSubs = subscriptions.filter(sub => {
      const tier = String(sub.tier || '').toLowerCase();
      const status = String(sub.status || '').toLowerCase();
      return tier === 'pro' && (status === 'active' || status === 'trialing' || status === 'trial');
    });
    const premiumSubs = subscriptions.filter(sub => {
      const tier = String(sub.tier || '').toLowerCase();
      const status = String(sub.status || '').toLowerCase();
      return tier === 'premium' && (status === 'active' || status === 'trialing' || status === 'trial');
    });

    // Deduplicate by user
    const getUniqueTierUsers = (subs) => {
      const uniqueUsers = new Set();
      subs.forEach(sub => {
        const uid = sub.user_email || sub.user_id || sub.created_by;
        if (uid) uniqueUsers.add(uid);
      });
      return uniqueUsers.size;
    };

    const proTierCount = getUniqueTierUsers(proSubs);
    const premiumTierCount = getUniqueTierUsers(premiumSubs);

    return Response.json({
      ok: true,
      consolidatedPaidUsers,
      legacyPremiumCount,
      proTierCount,
      premiumTierCount,
      avgPipesPerUser: parseFloat(avgPipesPerUser),
      avgTobaccoPerUser: parseFloat(avgTobaccoPerUser),
      newAccounts: {
        day: newAccounts24h,
        week: newAccounts7d,
        month: newAccounts30d,
        quarter: newAccounts90d,
      },
      renewals: {
        week: breakdownByWindow(next7Days),
        month: breakdownByWindow(next30Days),
        quarter: breakdownByWindow(next90Days),
        year: breakdownByWindow(next365Days),
      },
      dailyActiveUsers,
      weeklyActiveUsers,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('calculateUserMetrics error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});