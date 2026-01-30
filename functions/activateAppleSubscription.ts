import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { email, subscriptionId, tier = 'pro' } = await req.json();

    if (!email || !subscriptionId) {
      return Response.json({ error: 'Email and subscriptionId required' }, { status: 400 });
    }

    // Get the subscription
    const subs = await base44.asServiceRole.entities.Subscription.filter({
      user_email: email.toLowerCase().trim(),
      id: subscriptionId
    });

    if (subs.length === 0) {
      return Response.json({ error: 'Subscription not found' }, { status: 404 });
    }

    const sub = subs[0];

    // Activate it with specified tier
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const updated = await base44.asServiceRole.entities.Subscription.update(sub.id, {
      status: 'active',
      tier: tier,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      started_at: sub.started_at || now.toISOString()
    });

    return Response.json({
      success: true,
      message: `Activated subscription ${subscriptionId}`,
      updated
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});