// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const targetEmail = body.email;

    if (!targetEmail) {
      return Response.json({ error: 'email required in body' }, { status: 400 });
    }

    console.log(`[fixSpecificUserEntitlement] Fixing entitlements for ${targetEmail}`);

    // Get user
    const users = await base44.asServiceRole.entities.User.filter({ email: targetEmail.toLowerCase() });
    
    if (!users || users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUser = users[0];
    
    // Get their subscriptions
    const subs = await base44.asServiceRole.entities.Subscription.filter({ 
      user_email: targetEmail.toLowerCase() 
    });
    
    // Find active subscription
    const activeSub = subs?.find(s => {
      const status = (s.data?.status || '').toLowerCase();
      return ['active', 'trialing', 'trial'].includes(status);
    });
    
    let tier = 'free';
    let level = 'free';
    let status = 'inactive';
    let provider = null;
    let stripeCustomerId = null;
    
    if (activeSub) {
      tier = activeSub.data?.tier || 'premium';
      level = 'paid';
      status = activeSub.data?.status || 'active';
      provider = activeSub.data?.provider || 'stripe';
      stripeCustomerId = activeSub.data?.stripe_customer_id;
    }
    
    // Clean the data object - remove any nested data.data structure
    const cleanData = { ...(targetUser.data || {}) };
    delete cleanData.data; // Remove nested structure
    
    // Set proper entitlement fields
    cleanData.entitlement_tier = tier;
    cleanData.subscription_tier = tier;
    cleanData.subscription_level = level;
    cleanData.subscription_status = status;
    
    if (provider) {
      cleanData.subscription_provider = provider;
    }
    if (stripeCustomerId) {
      cleanData.stripe_customer_id = stripeCustomerId;
    }
    
    console.log(`[fixSpecificUserEntitlement] Setting tier=${tier}, level=${level}, status=${status}`);
    
    // Update user
    await base44.asServiceRole.entities.User.update(targetUser.id, {
      data: cleanData
    });
    
    // Force entitlement cache refresh in browser
    try {
      localStorage?.setItem('pk_force_entitlement_refresh', Date.now().toString());
    } catch {}
    
    // Re-fetch to confirm
    const updated = await base44.asServiceRole.entities.User.filter({ email: targetEmail.toLowerCase() });
    
    return Response.json({
      ok: true,
      before: {
        hadNestedData: targetUser.data?.data !== undefined,
        entitlement_tier: targetUser.data?.entitlement_tier,
        subscription_tier: targetUser.data?.subscription_tier
      },
      after: {
        entitlement_tier: updated[0]?.data?.entitlement_tier,
        subscription_tier: updated[0]?.data?.subscription_tier,
        hasNestedData: updated[0]?.data?.data !== undefined
      },
      subscription: activeSub ? {
        tier: activeSub.data?.tier,
        status: activeSub.data?.status,
        provider: activeSub.data?.provider
      } : null
    });

  } catch (error) {
    console.error('[fixSpecificUserEntitlement] Error:', error);
    return Response.json({ 
      ok: false, 
      error: error.message 
    }, { status: 500 });
  }
});