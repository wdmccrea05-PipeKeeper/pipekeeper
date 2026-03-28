import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const PRO_LAUNCH_CUTOFF = "2026-02-01T00:00:00.000Z";
const normEmail = (email) => String(email || "").trim().toLowerCase();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Sequential paginated fetches with delay to stay under rate limits
    const fetchAll = async (entity) => {
      const results = [];
      let skip = 0;
      while (true) {
        let page = await entity.list(null, 50, skip);
        if (typeof page === 'string') {
          try { page = JSON.parse(page); } catch { break; }
        }
        if (!Array.isArray(page) || page.length === 0) break;
        results.push(...page);
        if (page.length < 50) break;
        skip += 50;
        await new Promise(r => setTimeout(r, 150));
      }
      return results;
    };

    // Sequential fetches — parallel causes rate limit with large datasets
    const allUsers = await fetchAll(base44.asServiceRole.entities.User);
    await new Promise(r => setTimeout(r, 300));
    const allSubscriptions = await fetchAll(base44.asServiceRole.entities.Subscription);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const proLaunchDate = new Date(PRO_LAUNCH_CUTOFF);

    // Build subscription maps by user_id AND email (for legacy)
    const subByUserId = new Map();
    const subByEmail = new Map();
    
    allSubscriptions.forEach(sub => {
      if (sub.user_id) {
        if (!subByUserId.has(sub.user_id)) subByUserId.set(sub.user_id, []);
        subByUserId.get(sub.user_id).push(sub);
      }
      const email = normEmail(sub.user_email);
      if (email) {
        if (!subByEmail.has(email)) subByEmail.set(email, []);
        subByEmail.get(email).push(sub);
      }
    });

    // Categorize users by tier
    // Legacy premium = still premium tier, just at old price — counts as premium paid
    const usersByTier = { free: [], premium: [], pro: [] };
    let foundingMemberCount = 0;
    let legacyPremiumCount = 0; // for renewal rate context only

    allUsers.forEach(u => {
      const email = normEmail(u.email);
      let subs = subByUserId.get(u.id) || subByEmail.get(email) || [];
      const validSubs = subs.filter(s => (s.status || '').toLowerCase() !== 'incomplete_expired');

      let isPaid = false;
      let effectiveTier = 'premium';
      let effectiveStartedAt = null;

      if (validSubs.length > 0) {
        const best = [...validSubs].sort((a, b) => {
          const rank = (s) => {
            const st = (s.status || '').toLowerCase();
            if (st === 'active') return 5;
            if (st === 'trialing' || st === 'trial') return 4;
            if (st === 'incomplete') return 3;
            if (st === 'past_due') return 2;
            return 1;
          };
          return rank(b) - rank(a);
        })[0];
        const subStatus = (best.status || '').toLowerCase();
        const notExpired = !best.current_period_end || new Date(best.current_period_end) > now;
        if (['active', 'trialing', 'trial', 'incomplete'].includes(subStatus) && notExpired) {
          isPaid = true;
          effectiveTier = best.tier || 'premium';
          effectiveStartedAt = best.started_at || best.current_period_start;
        }
      }

      if (!isPaid && u.data) {
        const et = (u.data.entitlement_tier || '').toLowerCase();
        const st = (u.data.subscription_tier || '').toLowerCase();
        const ss = (u.data.subscription_status || '').toLowerCase();
        if (['premium', 'pro'].includes(et) || ['premium', 'pro'].includes(st)) {
          isPaid = true;
          effectiveTier = et || st;
          effectiveStartedAt = u.data.subscription_started_at || u.created_date;
        } else if (!isPaid && ['active', 'trialing', 'trial'].includes(ss)) {
          isPaid = true;
          effectiveTier = st || et || 'premium';
          effectiveStartedAt = u.data.subscription_started_at || u.created_date;
        }
      }

      if (!isPaid) {
        const usl = (u.subscription_level || '').toLowerCase();
        const uss = (u.subscription_status || '').toLowerCase();
        if (usl === 'paid' || ['active', 'trialing', 'trial'].includes(uss)) {
          isPaid = true;
          effectiveTier = 'premium';
          effectiveStartedAt = u.created_date;
        }
      }

      if (!isPaid) {
        usersByTier.free.push(u);
        if (u.isFoundingMember) foundingMemberCount++;
        return;
      }

      const isLegacy = effectiveStartedAt && new Date(effectiveStartedAt) < proLaunchDate;
      if ((effectiveTier || 'premium').toLowerCase() === 'pro') {
        usersByTier.pro.push(u);
      } else {
        usersByTier.premium.push(u);
        if (isLegacy) legacyPremiumCount++;
      }
      if (u.isFoundingMember) foundingMemberCount++;
    });

    // 1. USER COUNTS
    const userCounts = {
      total: allUsers.length,
      free: usersByTier.free.length,
      premium: usersByTier.premium.length,
      pro: usersByTier.pro.length,
      legacyPremiumRenewal: legacyPremiumCount,
      foundingMembers: foundingMemberCount,
    };

    // 2. SUBSCRIPTION BREAKDOWN
    const activePremiumUsers = new Set();
    const activeProUsers = new Set();
    let cancelledButActive = 0, expired30d = 0, expired60d = 0, expired90d = 0, monthlyCount = 0, annualCount = 0;

    allSubscriptions.forEach(sub => {
      const status = (sub.status || '').toLowerCase();
      const tier = sub.tier || 'premium';
      const periodEnd = sub.current_period_end ? new Date(sub.current_period_end) : null;
      const uid = sub.user_id || normEmail(sub.user_email);

      if (status === 'active' || status === 'trialing' || status === 'incomplete') {
        if (tier === 'pro') activeProUsers.add(uid);
        else activePremiumUsers.add(uid);
      }
      if (status === 'canceled' && periodEnd && periodEnd > now) cancelledButActive++;
      if (status === 'canceled' && periodEnd && periodEnd <= now) {
        if (periodEnd >= ninetyDaysAgo) expired90d++;
        if (periodEnd >= sixtyDaysAgo) expired60d++;
        if (periodEnd >= thirtyDaysAgo) expired30d++;
      }
      if (sub.billing_interval === 'month') monthlyCount++;
      if (sub.billing_interval === 'year') annualCount++;
    });

    const subscriptionBreakdown = {
      activeOrTrialPremium: activePremiumUsers.size,
      activeOrTrialPro: activeProUsers.size,
      cancelledButActive, expired30d, expired60d, expired90d, monthlyCount, annualCount,
    };

    // 3. TRIAL METRICS — fall back to current_period_end if trial_end_date is null
    const trialSubs = allSubscriptions.filter(s => (s.status || '').toLowerCase() === 'trialing');
    const trialEndDates = trialSubs
      .map(s => s.trial_end_date || s.current_period_end)
      .filter(d => d)
      .map(d => new Date(d));

    const endingIn3Days = trialEndDates.filter(d => { const diff = d - now; return diff > 0 && diff <= 3 * 864e5; }).length;
    const endingIn7Days = trialEndDates.filter(d => { const diff = d - now; return diff > 0 && diff <= 7 * 864e5; }).length;
    const avgDaysRemaining = trialEndDates.length > 0
      ? trialEndDates.reduce((s, d) => s + Math.max(0, (d - now) / 864e5), 0) / trialEndDates.length : 0;

    const convertedLast30d = allSubscriptions.filter(sub => {
      const status = (sub.status || '').toLowerCase();
      const startedAt = sub.started_at || sub.current_period_start;
      return status === 'active' && startedAt && new Date(startedAt) >= thirtyDaysAgo;
    }).length;

    const trialEndedEmails = new Set(
      allSubscriptions
        .filter(s => (s.status || '').toLowerCase() === 'canceled' && s.trial_end_date && new Date(s.trial_end_date) >= thirtyDaysAgo)
        .map(s => normEmail(s.user_email))
    );
    const dropoffLast30d = Array.from(trialEndedEmails).filter(email =>
      !(subByEmail.get(email) || []).some(s => (s.status || '').toLowerCase() === 'active')
    ).length;

    const sevenDaysAgoStartOfDay = new Date(now);
    sevenDaysAgoStartOfDay.setDate(sevenDaysAgoStartOfDay.getDate() - 7);
    sevenDaysAgoStartOfDay.setHours(0, 0, 0, 0);
    const newSignupsLast7d = allUsers.filter(u => new Date(u.created_date) >= sevenDaysAgoStartOfDay).length;

    const trialMetrics = {
      currentlyOnTrial: trialSubs.length,
      avgDaysRemaining: Math.round(avgDaysRemaining * 10) / 10,
      endingIn3Days,
      endingIn7Days,
      convertedLast30d,
      dropoffLast30d,
      newSignupsLast7d,
    };

    // 4. GROWTH METRICS (last 8 weeks)
    const weeks = [];
    for (let i = 7; i >= 0; i--) {
      const weekEnd = new Date(now.getTime() - i * 7 * 864e5);
      const weekStart = new Date(weekEnd.getTime() - 7 * 864e5);
      weeks.push({
        week: weekStart.toISOString().split('T')[0],
        newUsers: allUsers.filter(u => { const d = new Date(u.created_date); return d >= weekStart && d < weekEnd; }).length,
        newPaidSubscribers: allSubscriptions.filter(sub => {
          const st = (sub.status || '').toLowerCase();
          const sa = sub.started_at || sub.current_period_start;
          if (!sa) return false;
          const d = new Date(sa);
          return ['active','trialing','incomplete'].includes(st) && d >= weekStart && d < weekEnd;
        }).length,
        newProSubscribers: allSubscriptions.filter(sub => {
          const tier = sub.tier || 'premium';
          const st = (sub.status || '').toLowerCase();
          const sa = sub.started_at || sub.current_period_start;
          if (!sa) return false;
          const d = new Date(sa);
          return tier === 'pro' && ['active','trialing','incomplete'].includes(st) && d >= weekStart && d < weekEnd;
        }).length,
      });
    }
    const growthMetrics = { lastEightWeeks: weeks };

    // 5. CHURN METRICS
    const churned30dPremium = allSubscriptions.filter(s => (s.tier||'premium').toLowerCase() === 'premium' && (s.status||'').toLowerCase() === 'canceled' && s.updated_date && new Date(s.updated_date) >= thirtyDaysAgo).length;
    const activePremium30d = allSubscriptions.filter(s => (s.tier||'premium').toLowerCase() === 'premium' && ['active','trialing','past_due','incomplete'].includes((s.status||'').toLowerCase())).length;
    const churned30dPro = allSubscriptions.filter(s => (s.tier||'').toLowerCase() === 'pro' && (s.status||'').toLowerCase() === 'canceled' && s.updated_date && new Date(s.updated_date) >= thirtyDaysAgo).length;
    const activePro30d = allSubscriptions.filter(s => (s.tier||'').toLowerCase() === 'pro' && ['active','trialing','past_due','incomplete'].includes((s.status||'').toLowerCase())).length;

    const churnMetrics = {
      premiumChurn30d: activePremium30d > 0 ? Math.round((churned30dPremium / activePremium30d) * 10000) / 100 : 0,
      proChurn30d: activePro30d > 0 ? Math.round((churned30dPro / activePro30d) * 10000) / 100 : 0,
      proToPremiumDowngrade: 0,
      premiumToFreeDowngrade: 0,
    };

    // 6. USAGE METRICS — derived from already-fetched user data only
    const activeUsersLast7d = allUsers.filter(u => {
      const lastActivity = u.updated_date || u.created_date;
      return lastActivity && new Date(lastActivity) >= new Date(now.getTime() - 7 * 864e5);
    }).length;

    const usageMetrics = {
      activeUsersLast7d,
      avgPipesPerUser: { average: 0 },    // not computed here to avoid rate limits
      avgTobaccosPerUser: { average: 0 }, // not computed here to avoid rate limits
      communityEngagement: 0,
    };

    // 7. PLATFORM BREAKDOWN
    const platformBreakdown = {
      apple: { paid: 0, unverified: 0, free: 0 },
      android: { paid: 0, free: 0 },
      web: { paid: 0, free: 0 },
      ios: { paid: 0, free: 0 },
      unknown: { paid: 0, free: 0 },
    };

    allUsers.forEach(u => {
      const subs = subByUserId.get(u.id) || subByEmail.get(normEmail(u.email)) || [];
      const validSubs = subs.filter(s => (s.status || '').toLowerCase() !== 'incomplete_expired');
      const rawPlatform = (u.platform || 'unknown').toLowerCase();
      const hasPaidSub = validSubs.some(s => ['active','trialing','incomplete'].includes((s.status||'').toLowerCase())) || u.subscription_level === 'paid';
      let platformKey = ['apple','android','web','ios','unknown'].includes(rawPlatform) ? rawPlatform : 'unknown';
      if (!platformBreakdown[platformKey]) platformBreakdown[platformKey] = { paid: 0, free: 0 };
      if (platformKey === 'apple') {
        const appleSub = validSubs.find(s => s.provider === 'apple');
        if (appleSub?.status === 'unverified') platformBreakdown.apple.unverified++;
        else if (appleSub && ['active','trialing'].includes(appleSub.status) && (!appleSub.current_period_end || new Date(appleSub.current_period_end) > now)) platformBreakdown.apple.paid++;
        else platformBreakdown.apple.free++;
      } else {
        if (hasPaidSub) platformBreakdown[platformKey].paid++;
        else platformBreakdown[platformKey].free++;
      }
    });

    return Response.json({
      userCounts,
      subscriptionBreakdown,
      trialMetrics,
      growthMetrics,
      churnMetrics,
      usageMetrics,
      platformBreakdown,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});