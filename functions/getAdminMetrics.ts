import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const PRO_LAUNCH_CUTOFF = "2026-02-01T00:00:00.000Z";

interface AdminMetrics {
  userCounts: {
    total: number;
    free: number;
    premium: number;
    pro: number;
    legacyPremium: number;
    foundingMembers: number;
  };
  subscriptionBreakdown: {
    activePremium: number;
    activePro: number;
    onTrial: number;
    cancelledButActive: number;
    expired30d: number;
    expired60d: number;
    expired90d: number;
    monthlyCount: number;
    annualCount: number;
  };
  trialMetrics: {
    currentlyOnTrial: number;
    avgDaysRemaining: number;
    endingIn3Days: number;
    endingIn7Days: number;
    convertedLast30d: number;
    dropoffLast30d: number;
  };
  growthMetrics: {
    lastEightWeeks: Array<{
      week: string;
      newUsers: number;
      newPaidSubscribers: number;
      newProSubscribers: number;
      netGrowth: number;
    }>;
  };
  churnMetrics: {
    premiumChurn30d: number;
    proChurn30d: number;
    proToPremiumDowngrade: number;
    premiumToFreeDowngrade: number;
  };
  usageMetrics: {
    avgPipesPerUser: { free: number; premium: number; pro: number };
    avgTobaccosPerUser: { free: number; premium: number; pro: number };
    communityEngagement: number;
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only access
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all data in parallel
    const [allUsers, allSubscriptions, allPipes, allTobaccos, allSmokingLogs, allComments] = await Promise.all([
      base44.asServiceRole.entities.User.list(),
      base44.asServiceRole.entities.Subscription.list(),
      base44.asServiceRole.entities.Pipe.list(),
      base44.asServiceRole.entities.TobaccoBlend.list(),
      base44.asServiceRole.entities.SmokingLog.list(),
      base44.asServiceRole.entities.Comment.list(),
    ]);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const proLaunchDate = new Date(PRO_LAUNCH_CUTOFF);

    // Build subscription map
    const subMap = new Map();
    allSubscriptions.forEach(sub => {
      const email = sub.user_email;
      if (!subMap.has(email)) {
        subMap.set(email, []);
      }
      subMap.get(email).push(sub);
    });

    // Categorize users and build user tiers
    const usersByTier = { free: [], premium: [], pro: [], legacyPremium: [] };
    let foundingMemberCount = 0;

    allUsers.forEach(u => {
      const subs = subMap.get(u.email) || [];
      const validSubs = subs.filter(s => {
        const st = (s.status || '').toLowerCase();
        return st !== 'incomplete' && st !== 'incomplete_expired';
      });

      if (validSubs.length === 0) {
        usersByTier.free.push(u);
        return;
      }

      // Find best subscription
      const best = [...validSubs].sort((a, b) => {
        const rankFn = (s: any) => {
          const st = (s.status || '').toLowerCase();
          if (st === 'active') return 5;
          if (st === 'trialing') return 4;
          if (st === 'past_due') return 3;
          return 2;
        };
        return rankFn(b) - rankFn(a);
      })[0];

      const tier = best.tier || 'premium';
      const startedAt = best.started_at || best.current_period_start;
      const isLegacy = startedAt && new Date(startedAt) < proLaunchDate;

      if (tier === 'pro') {
        usersByTier.pro.push(u);
      } else if (isLegacy) {
        usersByTier.legacyPremium.push(u);
      } else {
        usersByTier.premium.push(u);
      }

      if (u.isFoundingMember) {
        foundingMemberCount++;
      }
    });

    // 1. USER COUNTS
    const userCounts = {
      total: allUsers.length,
      free: usersByTier.free.length,
      premium: usersByTier.premium.length,
      pro: usersByTier.pro.length,
      legacyPremium: usersByTier.legacyPremium.length,
      foundingMembers: foundingMemberCount,
    };

    // 2. SUBSCRIPTION BREAKDOWN
    let activePremium = 0,
      activePro = 0,
      onTrial = 0,
      cancelledButActive = 0,
      expired30d = 0,
      expired60d = 0,
      expired90d = 0,
      monthlyCount = 0,
      annualCount = 0;

    allSubscriptions.forEach(sub => {
      const status = (sub.status || '').toLowerCase();
      const tier = sub.tier || 'premium';
      const periodEnd = sub.current_period_end ? new Date(sub.current_period_end) : null;

      if (status === 'active') {
        if (tier === 'pro') activePro++;
        else activePremium++;
      }

      if (status === 'trialing') onTrial++;

      if (status === 'canceled' && periodEnd && periodEnd > now) {
        cancelledButActive++;
      }

      if (status === 'canceled' && periodEnd && periodEnd <= now) {
        if (periodEnd >= ninetyDaysAgo) expired90d++;
        if (periodEnd >= sixtyDaysAgo) expired60d++;
        if (periodEnd >= thirtyDaysAgo) expired30d++;
      }

      if (sub.billing_interval === 'month') monthlyCount++;
      if (sub.billing_interval === 'year') annualCount++;
    });

    const subscriptionBreakdown = {
      activePremium,
      activePro,
      onTrial,
      cancelledButActive,
      expired30d,
      expired60d,
      expired90d,
      monthlyCount,
      annualCount,
    };

    // 3. TRIAL METRICS
    const trialSubs = allSubscriptions.filter(s => (s.status || '').toLowerCase() === 'trialing');
    const trialEndDates = trialSubs
      .map(s => s.trial_end_date)
      .filter(d => d)
      .map(d => new Date(d));

    const endingIn3Days = trialEndDates.filter(d => {
      const diff = d.getTime() - now.getTime();
      return diff > 0 && diff <= 3 * 24 * 60 * 60 * 1000;
    }).length;

    const endingIn7Days = trialEndDates.filter(d => {
      const diff = d.getTime() - now.getTime();
      return diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000;
    }).length;

    const avgDaysRemaining =
      trialEndDates.length > 0
        ? trialEndDates.reduce((sum, d) => sum + Math.max(0, (d.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)), 0) /
          trialEndDates.length
        : 0;

    // Convert: trial ended + became paid in last 30 days
    const convertedLast30d = allSubscriptions.filter(sub => {
      const status = (sub.status || '').toLowerCase();
      const startedAt = sub.started_at || sub.current_period_start;
      return status === 'active' && startedAt && new Date(startedAt) >= thirtyDaysAgo;
    }).length;

    // Drop-off: trial ended without converting (not in active subscriptions, created date in last 30 days)
    const trialEndedEmails = new Set(
      allSubscriptions
        .filter(s => (s.status || '').toLowerCase() === 'canceled')
        .filter(s => s.trial_end_date && new Date(s.trial_end_date) >= thirtyDaysAgo)
        .map(s => s.user_email)
    );

    const dropoffLast30d = Array.from(trialEndedEmails).filter(email => {
      // Check if user has no other active paid subs
      const subs = (subMap.get(email) || []).filter(s => (s.status || '').toLowerCase() === 'active');
      return subs.length === 0;
    }).length;

    const trialMetrics = {
      currentlyOnTrial: onTrial,
      avgDaysRemaining: Math.round(avgDaysRemaining * 10) / 10,
      endingIn3Days,
      endingIn7Days,
      convertedLast30d,
      dropoffLast30d,
    };

    // 4. GROWTH METRICS (last 8 weeks)
    const weeks = [];
    for (let i = 7; i >= 0; i--) {
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

      const newUsers = allUsers.filter(u => {
        const created = new Date(u.created_date);
        return created >= weekStart && created < weekEnd;
      }).length;

      const newPaidSubscribers = allSubscriptions.filter(sub => {
        const status = (sub.status || '').toLowerCase();
        const startedAt = sub.started_at || sub.current_period_start;
        if (!startedAt) return false;
        const created = new Date(startedAt);
        return (status === 'active' || status === 'trialing') && created >= weekStart && created < weekEnd;
      }).length;

      const newProSubscribers = allSubscriptions.filter(sub => {
        const tier = sub.tier || 'premium';
        const status = (sub.status || '').toLowerCase();
        const startedAt = sub.started_at || sub.current_period_start;
        if (!startedAt) return false;
        const created = new Date(startedAt);
        return tier === 'pro' && (status === 'active' || status === 'trialing') && created >= weekStart && created < weekEnd;
      }).length;

      weeks.push({
        week: weekStart.toISOString().split('T')[0],
        newUsers,
        newPaidSubscribers,
        newProSubscribers,
        netGrowth: newUsers - dropoffLast30d, // Simplified
      });
    }

    const growthMetrics = { lastEightWeeks: weeks };

    // 5. CHURN METRICS (last 30 days)
    const churned30dPremium = allSubscriptions.filter(sub => {
      const tier = sub.tier || 'premium';
      const status = (sub.status || '').toLowerCase();
      const cancelledAt = sub.updated_date ? new Date(sub.updated_date) : null;
      return tier === 'premium' && status === 'canceled' && cancelledAt && cancelledAt >= thirtyDaysAgo;
    }).length;

    const activePremium30d = allSubscriptions.filter(sub => {
      const tier = sub.tier || 'premium';
      const status = (sub.status || '').toLowerCase();
      const startedAt = sub.started_at || sub.current_period_start;
      return (
        tier === 'premium' &&
        (status === 'active' || status === 'trialing' || status === 'past_due') &&
        startedAt &&
        new Date(startedAt) >= sixtyDaysAgo
      );
    }).length;

    const premiumChurn30d = activePremium30d > 0 ? Math.round((churned30dPremium / activePremium30d) * 10000) / 100 : 0;

    const churned30dPro = allSubscriptions.filter(sub => {
      const tier = sub.tier || 'premium';
      const status = (sub.status || '').toLowerCase();
      const cancelledAt = sub.updated_date ? new Date(sub.updated_date) : null;
      return tier === 'pro' && status === 'canceled' && cancelledAt && cancelledAt >= thirtyDaysAgo;
    }).length;

    const activePro30d = allSubscriptions.filter(sub => {
      const tier = sub.tier || 'premium';
      const status = (sub.status || '').toLowerCase();
      const startedAt = sub.started_at || sub.current_period_start;
      return (
        tier === 'pro' &&
        (status === 'active' || status === 'trialing' || status === 'past_due') &&
        startedAt &&
        new Date(startedAt) >= sixtyDaysAgo
      );
    }).length;

    const proChurn30d = activePro30d > 0 ? Math.round((churned30dPro / activePro30d) * 10000) / 100 : 0;

    // Downgrades (simplified: look for tier changes in subscription history)
    const proToPremiumDowngrade = 0; // Would require change tracking
    const premiumToFreeDowngrade = 0; // Would require change tracking

    const churnMetrics = {
      premiumChurn30d,
      proChurn30d,
      proToPremiumDowngrade,
      premiumToFreeDowngrade,
    };

    // 6. USAGE METRICS
    const pipesByUser = new Map<string, number>();
    const tobaccosByUser = new Map<string, number>();

    allPipes.forEach(p => {
      const creator = p.created_by;
      pipesByUser.set(creator, (pipesByUser.get(creator) || 0) + 1);
    });

    allTobaccos.forEach(t => {
      const creator = t.created_by;
      tobaccosByUser.set(creator, (tobaccosByUser.get(creator) || 0) + 1);
    });

    const avgPipesPerUser = {
      free: usersByTier.free.length > 0 ? Math.round((usersByTier.free.reduce((sum, u) => sum + (pipesByUser.get(u.email) || 0), 0) / usersByTier.free.length) * 10) / 10 : 0,
      premium:
        usersByTier.premium.length > 0
          ? Math.round((usersByTier.premium.reduce((sum, u) => sum + (pipesByUser.get(u.email) || 0), 0) / usersByTier.premium.length) * 10) / 10
          : 0,
      pro: usersByTier.pro.length > 0 ? Math.round((usersByTier.pro.reduce((sum, u) => sum + (pipesByUser.get(u.email) || 0), 0) / usersByTier.pro.length) * 10) / 10 : 0,
    };

    const avgTobaccosPerUser = {
      free: usersByTier.free.length > 0 ? Math.round((usersByTier.free.reduce((sum, u) => sum + (tobaccosByUser.get(u.email) || 0), 0) / usersByTier.free.length) * 10) / 10 : 0,
      premium:
        usersByTier.premium.length > 0
          ? Math.round((usersByTier.premium.reduce((sum, u) => sum + (tobaccosByUser.get(u.email) || 0), 0) / usersByTier.premium.length) * 10) / 10
          : 0,
      pro: usersByTier.pro.length > 0 ? Math.round((usersByTier.pro.reduce((sum, u) => sum + (tobaccosByUser.get(u.email) || 0), 0) / usersByTier.pro.length) * 10) / 10 : 0,
    };

    const communityEngagementEmails = new Set(allComments.map(c => c.commenter_email));
    const communityEngagement = Math.round((communityEngagementEmails.size / allUsers.length) * 10000) / 100;

    const usageMetrics = {
      avgPipesPerUser,
      avgTobaccosPerUser,
      communityEngagement,
    };

    const metrics: AdminMetrics = {
      userCounts,
      subscriptionBreakdown,
      trialMetrics,
      growthMetrics,
      churnMetrics,
      usageMetrics,
    };

    return Response.json(metrics);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});