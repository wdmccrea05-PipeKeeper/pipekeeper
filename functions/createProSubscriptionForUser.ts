import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    // Get user by email
    const users = await base44.asServiceRole.entities.User.filter({
      email: email.toLowerCase().trim()
    });

    if (users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const userRecord = users[0];
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Create new Pro subscription
    const newSub = await base44.asServiceRole.entities.Subscription.create({
      user_id: userRecord.id,
      user_email: email.toLowerCase().trim(),
      provider: 'apple',
      provider_subscription_id: `pro_manual_${userRecord.id}`,
      status: 'active',
      tier: 'pro',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      started_at: now.toISOString(),
      subscriptionStartedAt: now.toISOString(),
      billing_interval: 'month'
    });

    return Response.json({
      success: true,
      message: `Created active Pro subscription for ${email}`,
      subscription: {
        id: newSub.id,
        email: newSub.user_email,
        tier: newSub.tier,
        status: newSub.status,
        periodEnd: newSub.current_period_end
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});