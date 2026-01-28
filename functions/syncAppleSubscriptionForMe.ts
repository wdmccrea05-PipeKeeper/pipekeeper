import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const normEmail = (email) => String(email || "").trim().toLowerCase();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();

    if (!authUser?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const emailLower = normEmail(authUser.email);
    const body = await req.json().catch(() => ({}));
    
    const active = !!body.active;
    const expiresAt = body.expiresAt || null;
    const productId = body.productId || '';
    const originalTransactionId = body.originalTransactionId || '';
    
    // Determine tier
    let tier = body.tier || 'premium';
    if (!body.tier && productId.toLowerCase().includes('pro')) {
      tier = 'pro';
    }
    
    // Determine status
    const status = active ? 'active' : 'canceled';
    
    // Create stable synthetic subscription ID for Apple purchases
    const appleKey = `apple_${originalTransactionId || emailLower}`;
    
    const nowIso = new Date().toISOString();
    
    // Find existing Apple subscription for this user
    const existingSubs = await base44.asServiceRole.entities.Subscription.filter({
      user_email: emailLower
    });
    
    // Find Apple sub (starts with "apple_" or has no stripe_subscription_id)
    const appleSub = existingSubs.find(s => 
      (s.stripe_subscription_id || '').startsWith('apple_') ||
      !s.stripe_customer_id
    );
    
    const subData = {
      user_email: emailLower,
      stripe_subscription_id: appleKey,
      stripe_customer_id: null,
      status,
      tier,
      current_period_end: expiresAt,
      current_period_start: active ? nowIso : (appleSub?.current_period_start || null),
      started_at: appleSub?.started_at || nowIso,
      subscriptionStartedAt: appleSub?.subscriptionStartedAt || appleSub?.started_at || nowIso,
      billing_interval: 'month',
      amount: null,
      cancel_at_period_end: false
    };
    
    if (appleSub) {
      // Update existing Apple subscription
      await base44.asServiceRole.entities.Subscription.update(appleSub.id, subData);
    } else {
      // Create new Apple subscription
      await base44.asServiceRole.entities.Subscription.create(subData);
    }
    
    // Update User entity
    const users = await base44.asServiceRole.entities.User.filter({ email: emailLower });
    if (users && users.length > 0) {
      await base44.asServiceRole.entities.User.update(users[0].id, {
        subscription_level: active ? 'paid' : 'free',
        subscription_status: status,
        platform: 'ios'
      });
    }
    
    return Response.json({
      ok: true,
      synced: true,
      tier,
      status,
      active,
      email: emailLower
    });
  } catch (error) {
    console.error('[syncAppleSubscriptionForMe] error:', error);
    return Response.json({ 
      error: error?.message || 'Failed to sync Apple subscription',
      stack: error?.stack
    }, { status: 500 });
  }
});