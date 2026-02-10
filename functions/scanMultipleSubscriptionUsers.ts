import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Query subscriptions in smaller batches to avoid timeout
    const allSubs = [];
    let skip = 0;
    const batchSize = 50;
    let batch;

    do {
      batch = await base44.asServiceRole.entities.Subscription.list(1, batchSize, { skip });
      if (batch.length === 0) break;
      allSubs.push(...batch);
      skip += batchSize;
    } while (batch.length === batchSize);

    console.log(`Found ${allSubs.length} subscriptions`);

    // Filter to active only and group by user
    const subsByEmail = {};
    for (const sub of allSubs) {
      if (sub.status !== 'active') continue;
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

    // Check each user with multiple subscriptions
    for (const email of emailsWithMultiple) {
      const subs = subsByEmail[email];

      // Get user record
      const users = await base44.asServiceRole.entities.User.filter({ email });
      if (users.length === 0) continue;

      const paidUser = users[0];

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
          id: s.id,
          tier: s.tier,
          started: s.current_period_start || s.started_at
        })),
        needsFix: hasIssue
      });
    }

    const issuesNeedingFix = issues.filter(i => i.needsFix);

    return Response.json({
      totalUsersWithMultipleSubs: emailsWithMultiple.length,
      detailedIssues: issues,
      summary: {
        usersNeedingFix: issuesNeedingFix.length,
        issuesDetails: issuesNeedingFix
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});