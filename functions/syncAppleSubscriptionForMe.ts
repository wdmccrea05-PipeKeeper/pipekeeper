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
    const userId = authUser.id;
    
    if (!userId) {
      return Response.json({ 
        error: 'User ID not available',
        code: 'NO_USER_ID'
      }, { status: 400 });
    }
    
    const body = await req.json().catch(() => ({}));
    
    const active = !!body.active;
    const expiresAt = body.expiresAt || null;
    const productId = body.productId || '';
    const originalTransactionId = body.originalTransactionId || '';
    
    // Require originalTransactionId for active subscriptions
    if (active && !originalTransactionId) {
      return Response.json({
        ok: false,
        error: 'Active subscription requires originalTransactionId',
        code: 'MISSING_ORIGINAL_TX'
      }, { status: 400 });
    }
    
    // Determine tier
    let tier = body.tier || 'premium';
    if (!body.tier && productId.toLowerCase().includes('pro')) {
      tier = 'pro';
    }
    
    // Determine status
    const status = active ? 'active' : 'expired';
    
    // Create stable provider subscription ID
    const providerSubId = originalTransactionId || `apple_${userId}`;
    
    const nowIso = new Date().toISOString();
    
    // Find existing Apple subscription by provider_subscription_id
    const existingSubs = await base44.asServiceRole.entities.Subscription.filter({
      provider: 'apple',
      provider_subscription_id: providerSubId
    });
    
    const existingAppleSub = existingSubs?.[0];
    
    // CONFLICT CHECK: If subscription exists and belongs to different user, deny
    if (existingAppleSub && existingAppleSub.user_id && existingAppleSub.user_id !== userId) {
      console.warn(`[syncAppleSubscriptionForMe] Apple subscription ${providerSubId} already linked to user ${existingAppleSub.user_id}, requested by ${userId}`);
      return Response.json({
        ok: false,
        error: 'This Apple subscription is already linked to a different PipeKeeper account',
        code: 'ALREADY_LINKED',
        existing_user_id: existingAppleSub.user_id
      }, { status: 409 });
    }
    
    const subData = {
      user_id: userId,
      user_email: emailLower,
      provider: 'apple',
      provider_subscription_id: providerSubId,
      stripe_subscription_id: null,
      stripe_customer_id: null,
      status,
      tier,
      current_period_end: expiresAt,
      current_period_start: active ? nowIso : (existingAppleSub?.current_period_start || null),
      started_at: existingAppleSub?.started_at || nowIso,
      subscriptionStartedAt: existingAppleSub?.subscriptionStartedAt || existingAppleSub?.started_at || nowIso,
      billing_interval: 'month',
      amount: null,
      cancel_at_period_end: false
    };
    
    if (existingAppleSub) {
      // Update existing Apple subscription
      await base44.asServiceRole.entities.Subscription.update(existingAppleSub.id, subData);
      console.log(`[syncAppleSubscriptionForMe] Updated Apple subscription ${providerSubId} for user ${userId}`);
    } else {
      // Create new Apple subscription
      await base44.asServiceRole.entities.Subscription.create(subData);
      console.log(`[syncAppleSubscriptionForMe] Created Apple subscription ${providerSubId} for user ${userId}`);
    }
    
    // Create or update User entity
    const users = await base44.asServiceRole.entities.User.filter({ email: emailLower });
    if (users && users.length > 0) {
      await base44.asServiceRole.entities.User.update(users[0].id, {
        subscription_level: active ? 'paid' : 'free',
        subscription_status: status,
        platform: 'ios'
      });
      console.log(`[syncAppleSubscriptionForMe] Updated user ${emailLower} subscription_level=${active ? 'paid' : 'free'}`);
    } else {
      // Create entity User if doesn't exist
      await base44.asServiceRole.entities.User.create({
        email: emailLower,
        full_name: `User ${emailLower}`,
        role: 'user',
        subscription_level: active ? 'paid' : 'free',
        subscription_status: status,
        platform: 'ios'
      });
      console.log(`[syncAppleSubscriptionForMe] Created user ${emailLower} subscription_level=${active ? 'paid' : 'free'}`);
    }
    
    return Response.json({
      ok: true,
      synced: true,
      tier,
      status,
      active,
      user_id: userId,
      provider_subscription_id: providerSubId
    });
  } catch (error) {
    console.error('[syncAppleSubscriptionForMe] error:', error);
    return Response.json({ 
      ok: false,
      error: error?.message || 'Failed to sync Apple subscription',
      stack: error?.stack
    }, { status: 500 });
  }
});