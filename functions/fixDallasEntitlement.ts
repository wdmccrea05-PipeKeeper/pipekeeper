import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get dallas.hinton@gmail.com
    const users = await base44.asServiceRole.entities.User.filter({
      email: 'dallas.hinton@gmail.com'
    });

    if (!users || users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = users[0];
    console.log('Current user data:', JSON.stringify(userData.data, null, 2));

    // Get their subscriptions
    const subs = await base44.asServiceRole.entities.Subscription.filter({
      user_email: 'dallas.hinton@gmail.com',
      status: 'active'
    });

    console.log('Active subscriptions:', subs.length);
    subs.forEach((s, i) => {
      console.log(`Sub ${i}: tier=${s.tier}, started=${s.current_period_start || s.started_at}`);
    });

    // Choose the most recent PRO subscription, or most recent if no pro exists
    const sortedSubs = subs.sort((a, b) => {
      if (a.tier === 'pro' && b.tier !== 'pro') return -1;
      if (a.tier !== 'pro' && b.tier === 'pro') return 1;
      const aStart = new Date(a.current_period_start || a.started_at || 0).getTime();
      const bStart = new Date(b.current_period_start || b.started_at || 0).getTime();
      return bStart - aStart;
    });

    const correctTier = sortedSubs[0]?.tier || 'premium';
    console.log('Correct tier to set:', correctTier);

    // Force update the data object
    const newData = {
      ...userData.data,
      entitlement_tier: correctTier,
      updated_at: new Date().toISOString()
    };

    console.log('Updating user with new data:', JSON.stringify(newData, null, 2));

    const result = await base44.asServiceRole.entities.User.update(userData.id, {
      data: newData
    });

    console.log('Update result:', JSON.stringify(result, null, 2));

    // Verify the update took
    const verifyUsers = await base44.asServiceRole.entities.User.filter({
      email: 'dallas.hinton@gmail.com'
    });

    const verifyData = verifyUsers[0]?.data || {};

    return Response.json({
      userId: userData.id,
      email: userData.email,
      oldTier: userData.data?.entitlement_tier,
      newTier: verifyData.entitlement_tier,
      subscriptionTier: subs[0]?.tier,
      status: verifyData.entitlement_tier === 'pro' ? 'SUCCESS' : 'FAILED'
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});