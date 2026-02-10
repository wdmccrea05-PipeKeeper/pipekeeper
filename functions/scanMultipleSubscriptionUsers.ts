import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all active subscriptions and group by user
    const allSubs = await base44.asServiceRole.entities.Subscription.filter({
      status: 'active'
    }, 1000);

    console.log(`Found ${allSubs.length} active subscriptions`);

    // Group subscriptions by user email
    const subsByEmail = {};
    for (const sub of allSubs) {
      if (!subsByEmail[sub.user_email]) {
        subsByEmail[sub.user_email] = [];
      }
      subsByEmail[sub.user_email].push(sub);
    }

    // Find users with multiple subscriptions
    const emailsWithMultiple = Object.entries(subsByEmail)
      .filter(([_, subs]) => subs.length > 1)
      .map(([email]) => email);

    console.log(`Found ${emailsWithMultiple.length} users with multiple active subscriptions`);

    const issues = [];

    // Fetch user records for affected users only
    const allUsers = await base44.asServiceRole.entities.User.list(200);

    for (const email of emailsWithMultiple) {
      const paidUser = allUsers.find(u => u.email === email);
      if (!paidUser) continue;

      const subs = subsByEmail[email];

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
      totalUsersChecked: emailsWithMultiple.length,
      usersWithMultipleSubs: issues.length,
      usersWithMisalignment: issuesNeedingFix.length,
      issues: issuesNeedingFix.length > 0 ? issuesNeedingFix : issues
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});