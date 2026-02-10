import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all users with paid subscriptions
    const allUsers = await base44.asServiceRole.entities.User.list();
    const paidUsers = allUsers.filter(u => u.entitlement_tier === 'pro' || u.entitlement_tier === 'premium');

    console.log(`Scanning ${paidUsers.length} paid users for multiple subscriptions...`);

    const issues = [];

    for (const paidUser of paidUsers) {
      const subs = await base44.asServiceRole.entities.Subscription.filter({
        user_email: paidUser.email,
        status: 'active'
      });

      if (subs.length > 1) {
        // Sort to find correct tier
        const sortedSubs = subs.sort((a, b) => {
          if (a.tier === 'pro' && b.tier !== 'pro') return -1;
          if (a.tier !== 'pro' && b.tier === 'pro') return 1;
          const aStart = new Date(a.current_period_start || a.started_at || 0).getTime();
          const bStart = new Date(b.current_period_start || b.started_at || 0).getTime();
          return bStart - aStart;
        });

        const correctTier = sortedSubs[0]?.tier || 'premium';
        const hasIssue = paidUser.entitlement_tier !== correctTier;

        issues.push({
          email: paidUser.email,
          userId: paidUser.id,
          currentEntitlementTier: paidUser.entitlement_tier,
          correctTier: correctTier,
          subscriptionCount: subs.length,
          subscriptions: subs.map(s => ({
            tier: s.tier,
            status: s.status,
            started: s.current_period_start || s.started_at
          })),
          needsFix: hasIssue
        });
      }
    }

    const issuesNeedingFix = issues.filter(i => i.needsFix);

    return Response.json({
      totalPaidUsers: paidUsers.length,
      usersWithMultipleSubs: issues.length,
      usersWithMisalignment: issuesNeedingFix.length,
      issues: issuesNeedingFix.length > 0 ? issuesNeedingFix : issues
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});