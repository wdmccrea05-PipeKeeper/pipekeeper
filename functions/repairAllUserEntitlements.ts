import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all users
    const allUsers = await base44.asServiceRole.entities.User.list();
    const results = [];

    for (const userData of allUsers) {
      try {
        const email = userData.email?.toLowerCase().trim();
        if (!email) continue;

        // Get user's subscriptions
        const subscriptions = await base44.asServiceRole.entities.Subscription.filter({
          user_email: email,
          status: 'active'
        });

        if (subscriptions.length === 0) continue;

        // Get the most relevant subscription (prioritize by: 1) pro tier, 2) most recent start date)
        const sortedSubs = subscriptions.sort((a, b) => {
          if (a.tier === 'pro' && b.tier !== 'pro') return -1;
          if (a.tier !== 'pro' && b.tier === 'pro') return 1;
          const aStart = new Date(a.current_period_start || a.started_at || 0).getTime();
          const bStart = new Date(b.current_period_start || b.started_at || 0).getTime();
          return bStart - aStart;
        });

        const activeSub = sortedSubs[0];
        const expectedTier = activeSub.tier || 'premium';

        // Check if user's entitlement_tier matches
        const userDataObj = userData.data || {};
        const currentEntitlementTier = userDataObj.entitlement_tier;

        if (currentEntitlementTier !== expectedTier) {
          // Update user with correct entitlement tier
          await base44.asServiceRole.entities.User.update(userData.id, {
            data: {
              ...userDataObj,
              entitlement_tier: expectedTier
            }
          });

          results.push({
            email,
            userId: userData.id,
            oldTier: currentEntitlementTier,
            newTier: expectedTier,
            subscriptionTier: activeSub.tier,
            status: 'fixed',
            provider: activeSub.provider
          });
        } else {
          results.push({
            email,
            userId: userData.id,
            tier: expectedTier,
            status: 'ok',
            provider: activeSub.provider
          });
        }
      } catch (e) {
        console.error(`Error processing user: ${e.message}`);
      }
    }

    const fixed = results.filter(r => r.status === 'fixed');
    const ok = results.filter(r => r.status === 'ok');

    return Response.json({
      summary: {
        total_paid_users: results.length,
        fixed_count: fixed.length,
        already_correct_count: ok.length
      },
      fixed,
      ok
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});