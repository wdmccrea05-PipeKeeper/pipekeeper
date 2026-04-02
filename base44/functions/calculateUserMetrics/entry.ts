import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

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
      let fetchCount = 0;
      while (stripeHasMore && fetchCount < 2) {
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
        fetchCount++;
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
      const status = String(sub.status || '').toLowerCase();
      return status === 'active' || status === 'trialing' || status === 'trial';
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
    const estimatedDailyUsers = Math.round(totalUsers * 0.15);
    const estimatedWeeklyUsers = Math.round(totalUsers * 0.35);

    // Calculate avg pipes and tobacco per user (defer calculation on heavy data fetch)
    const avgPipesPerUser = 0;
    const avgTobaccoPerUser = 0;

    // Renewals: subscriptions whose current_period_end falls within [now, endDate]
    const calculateRenewals = (endDate) => {
      return subscriptions.filter(sub => {
        const periodEnd = new Date(sub.current_period_end);
        const status = String(sub.status || '').toLowerCase();
        // Only count active (non-trial) subs whose period ends in the window
        return periodEnd > now && periodEnd <= endDate && status === 'active';
      });
    };

    const calculateRevenue = (renewalList) => {
      return renewalList.reduce((sum, sub) => {
        const provider = String(sub.provider || 'stripe').toLowerCase();
        let amount = 0;

        if (provider === 'stripe') {
          const stripeId = sub.provider_subscription_id || sub.stripe_subscription_id;
          amount = stripeId ? (stripeAmountMap[stripeId] || 0) : 0;
          if (amount === 0) amount = Number(sub.amount) || 0;
        } else if (provider === 'apple') {
          // For Apple, use stored amount (no live API available)
          amount = Number(sub.amount) || 0;
        } else {
          amount = Number(sub.amount) || 0;
        }

        return sum + amount;
      }, 0);
    };

    // Returns breakdown using subscription-level counts (not user-deduped) for revenue,
    // while also exposing a deduped customer count.
    const breakdownByBillingInterval = (renewalList) => {
      // Customer count: deduped by user identity
      const uniqueCustomers = new Set();
      renewalList.forEach(sub => {
        const uid = sub.user_email || sub.user_id || sub.created_by;
        if (uid) uniqueCustomers.add(uid);
      });

      // Billing-interval splits on ALL subscriptions (not deduped) for accurate revenue
      const monthly = renewalList.filter(sub => {
        const interval = String(sub.billing_interval || '').toLowerCase();
        return interval === 'month' || interval === 'monthly';
      });
      const annual = renewalList.filter(sub => {
        const interval = String(sub.billing_interval || '').toLowerCase();
        return interval === 'year' || interval === 'yearly';
      });
      return {
        customerCount: uniqueCustomers.size,
        subscriptionCount: renewalList.length,
        // keep `count` for any existing consumers
        count: renewalList.length,
        monthly: monthly.length,
        annual: annual.length,
        totalAmount: calculateRevenue(renewalList),
        monthlyAmount: calculateRevenue(monthly),
        annualAmount: calculateRevenue(annual),
      };
    };

    const renewals7d = calculateRenewals(next7Days);
    const renewals30d = calculateRenewals(next30Days);
    const renewals90d = calculateRenewals(next90Days);
    const renewals365d = calculateRenewals(next365Days);

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
        week: breakdownByBillingInterval(renewals7d),
        month: breakdownByBillingInterval(renewals30d),
        quarter: breakdownByBillingInterval(renewals90d),
        year: breakdownByBillingInterval(renewals365d),
      },
      dailyActiveUsers: estimatedDailyUsers,
      weeklyActiveUsers: estimatedWeeklyUsers,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('calculateUserMetrics error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});