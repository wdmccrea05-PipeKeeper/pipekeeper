import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Paginated fetch — SDK serializes large responses as strings, use PAGE=50
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
      }
      return results;
    };

    const [subscriptions, allUsers] = await Promise.all([
      fetchAll(base44.asServiceRole.entities.Subscription),
      fetchAll(base44.asServiceRole.entities.User),
    ]);

    const now = new Date();
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const next90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const next365Days = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    // Count active paid subscribers (Premium + Pro) - deduplicate by user
    const paidSubs = subscriptions.filter(sub => {
      const status = String(sub.status || '').toLowerCase();
      return status === 'active' || status === 'trialing' || status === 'trial';
    });

    // Count distinct users with active subscriptions (not subscription records)
    const uniquePaidUsers = new Set();
    paidSubs.forEach(sub => {
      const user = sub.user_email || sub.user_id || sub.created_by;
      if (user) uniquePaidUsers.add(user);
    });
    const consolidatedPaidUsers = uniquePaidUsers.size > 0 ? uniquePaidUsers.size : paidSubs.length;

    // Count distinct users with legacy premium (subscribed before Feb 1, 2026 AND still actively renewing)
    const legacyDate = new Date('2026-02-01');
    const legacyPremiumSubs = paidSubs.filter(sub => {
      const startDate = new Date(sub.started_at || sub.created_date || '');
      const tier = String(sub.tier || '').toLowerCase();
      return startDate < legacyDate && tier === 'premium';
    });
    const uniqueLegacyUsers = new Set();
    legacyPremiumSubs.forEach(sub => {
      const user = sub.user_email || sub.user_id || sub.created_by;
      if (user) uniqueLegacyUsers.add(user);
    });
    const legacyPremiumCount = uniqueLegacyUsers.size > 0 ? uniqueLegacyUsers.size : legacyPremiumSubs.length;

    // New accounts in time periods
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last90d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // New accounts = new User registrations (not subscription records)
    const newAccounts24h = allUsers.filter(u => new Date(u.created_date || '') > last24h).length;
    const newAccounts7d = allUsers.filter(u => new Date(u.created_date || '') > last7d).length;
    const newAccounts30d = allUsers.filter(u => new Date(u.created_date || '') > last30d).length;
    const newAccounts90d = allUsers.filter(u => new Date(u.created_date || '') > last90d).length;

    // Estimate active users based on total user base (not just paid)
    const totalUsers = allUsers.length;
    const estimatedDailyUsers = Math.round(totalUsers * 0.15);
    const estimatedWeeklyUsers = Math.round(totalUsers * 0.35);

    // Calculate renewals with billing interval breakdown
    const calculateRenewals = (endDate) => {
      return subscriptions.filter(sub => {
        const periodEnd = new Date(sub.current_period_end);
        const status = String(sub.status || '').toLowerCase();
        return periodEnd > now && periodEnd <= endDate && 
               (status === 'active' || status === 'trialing' || status === 'trial');
      });
    };

    const calculateRevenue = (renewalList) => {
      return renewalList.reduce((sum, sub) => {
        const amount = Number(sub.amount) || 0;
        return sum + amount;
      }, 0);
    };

    const breakdownByBillingInterval = (renewalList) => {
      // Handle both 'month'/'year' and 'monthly'/'yearly' formats from Stripe
      const monthly = renewalList.filter(sub => {
        const interval = String(sub.billing_interval || '').toLowerCase();
        return interval === 'month' || interval === 'monthly';
      });
      const annual = renewalList.filter(sub => {
        const interval = String(sub.billing_interval || '').toLowerCase();
        return interval === 'year' || interval === 'yearly';
      });
      return {
        total: renewalList.length,
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

    // Module/Bundle subscription breakdown by billing interval
    const moduleSubscriptions = {};
    const modules = ['pipekeeper', 'whiskeykeeper', 'winekeeper', 'cigarkeeper'];
    const bundles = ['three_bundle', 'four_bundle', 'founders'];
    const allProducts = [...modules, ...bundles];

    allProducts.forEach(product => {
    const productSubs = subscriptions.filter(sub => {
      const tier = String(sub.tier || '').toLowerCase();
      const status = String(sub.status || '').toLowerCase();
      return tier === product && (status === 'active' || status === 'trialing' || status === 'trial');
    });

    const monthly = productSubs.filter(s => {
      const interval = String(s.billing_interval || '').toLowerCase();
      return interval === 'month' || interval === 'monthly';
    });
    const annual = productSubs.filter(s => {
      const interval = String(s.billing_interval || '').toLowerCase();
      return interval === 'year' || interval === 'yearly';
    });

      if (productSubs.length > 0) {
        moduleSubscriptions[product] = {
          total: productSubs.length,
          monthly: monthly.length,
          annual: annual.length,
          displayName: product
            .replace(/_bundle/, ' Bundle')
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' '),
        };
      }
    });

    return Response.json({
      ok: true,
      consolidatedPaidUsers,
      legacyPremiumCount,
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
      moduleSubscriptions,
      dailyActiveUsers: estimatedDailyUsers,
      weeklyActiveUsers: estimatedWeeklyUsers,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('calculateUserMetrics error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});