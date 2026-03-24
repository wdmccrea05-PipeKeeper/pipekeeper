import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all subscriptions and users
    const subscriptions = await base44.asServiceRole.entities.Subscription.list('-created_date', 1000);
    const users = await base44.asServiceRole.entities.User.list('-created_date', 2000);
    
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // --- ACTIVE PAID SUBSCRIBERS ---
    const activePaidSubscriptions = subscriptions.filter(sub => {
      const status = String(sub.status || '').toLowerCase();
      return (status === 'active' || status === 'trialing' || status === 'trial') && 
             sub.tier && ['premium', 'pro'].includes(String(sub.tier).toLowerCase());
    });
    const consolidatedPaidUsers = new Set(activePaidSubscriptions.map(s => s.user_email || s.user_id)).size;

    // --- ACTIVE/TRIAL PAID ---
    const activeOrTrialPaidUsers = activePaidSubscriptions.length;

    // --- LEGACY PREMIUM (before Feb 1, 2026) ---
    const legacyDate = new Date('2026-02-01T00:00:00Z');
    const legacyPremiumSubs = subscriptions.filter(sub => {
      const createdDate = new Date(sub.created_date);
      const tier = String(sub.tier || '').toLowerCase();
      return createdDate < legacyDate && (tier === 'premium' || tier === 'pro');
    });
    const legacyPremiumCount = new Set(legacyPremiumSubs.map(s => s.user_email || s.user_id)).size;

    // --- NEW ACCOUNTS (by time period) ---
    const newAccounts24h = users.filter(u => new Date(u.created_date) > oneDayAgo).length;
    const newAccounts7d = users.filter(u => new Date(u.created_date) > sevenDaysAgo).length;
    const newAccounts30d = users.filter(u => new Date(u.created_date) > thirtyDaysAgo).length;
    const newAccounts90d = users.filter(u => new Date(u.created_date) > ninetyDaysAgo).length;

    // --- UPCOMING RENEWALS & REVENUE ---
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const next90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const next365Days = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    const calculateRenewals = (endDate) => {
      return subscriptions.filter(sub => {
        const periodEnd = new Date(sub.current_period_end);
        const status = String(sub.status || '').toLowerCase();
        return periodEnd > now && periodEnd <= endDate && 
               (status === 'active' || status === 'trialing' || status === 'trial');
      });
    };

    const renewals7d = calculateRenewals(next7Days);
    const renewals30d = calculateRenewals(next30Days);
    const renewals90d = calculateRenewals(next90Days);
    const renewals365d = calculateRenewals(next365Days);

    const calculateRevenue = (renewalList) => {
      return renewalList.reduce((sum, sub) => {
        const amount = Number(sub.amount) || 0;
        return sum + amount;
      }, 0);
    };

    // --- AVERAGE DAILY & WEEKLY USERS ---
    // Estimate based on active subscribers (placeholder)
    // In a real scenario, this would come from activity logs
    const estimatedDailyUsers = Math.floor(consolidatedPaidUsers * 0.6); // ~60% of paid users active daily
    const estimatedWeeklyUsers = Math.floor(consolidatedPaidUsers * 0.85); // ~85% of paid users active weekly

    return Response.json({
      ok: true,
      consolidatedPaidUsers,
      activeOrTrialPaidUsers,
      legacyPremiumCount,
      newAccounts: {
        day: newAccounts24h,
        week: newAccounts7d,
        month: newAccounts30d,
        quarter: newAccounts90d,
      },
      renewals: {
        week: {
          count: renewals7d.length,
          totalAmount: calculateRevenue(renewals7d),
        },
        month: {
          count: renewals30d.length,
          totalAmount: calculateRevenue(renewals30d),
        },
        quarter: {
          count: renewals90d.length,
          totalAmount: calculateRevenue(renewals90d),
        },
        year: {
          count: renewals365d.length,
          totalAmount: calculateRevenue(renewals365d),
        },
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