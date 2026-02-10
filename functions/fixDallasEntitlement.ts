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

    // Get their subscription
    const subs = await base44.asServiceRole.entities.Subscription.filter({
      user_email: 'dallas.hinton@gmail.com',
      status: 'active'
    });

    console.log('Active subscriptions:', subs.length);
    if (subs.length > 0) {
      console.log('Latest subscription tier:', subs[0].tier);
    }

    // Force update the data object
    const newData = {
      ...userData.data,
      entitlement_tier: 'pro',
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