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

    const targetEmail = 'kky22374@gmail.com';
    console.log(`[fixKKY] Fixing entitlements for ${targetEmail}`);

    // Get user by ID directly
    const userId = '6976706d73d3da9cc8707572';
    
    // Get their subscriptions
    const subs = await base44.asServiceRole.entities.Subscription.filter({ 
      user_email: targetEmail 
    });
    
    console.log(`[fixKKY] Found ${subs?.length || 0} subscriptions`);
    
    // Find active subscription
    const activeSub = subs?.find(s => {
      const status = (s.data?.status || '').toLowerCase();
      return ['active', 'trialing', 'trial'].includes(status);
    });
    
    const tier = activeSub?.data?.tier || 'premium';
    const level = 'paid';
    const status = activeSub?.data?.status || 'active';
    const provider = activeSub?.data?.provider || 'stripe';
    const stripeCustomerId = activeSub?.data?.stripe_customer_id || 'cus_TwDqZfx1xoU0zd';
    
    console.log(`[fixKKY] Active sub found: tier=${tier}, status=${status}`);
    
    // Update with clean structure
    await base44.asServiceRole.entities.User.update(userId, {
      data: {
        tos_accepted_at: "2026-01-25T19:35:35.883Z",
        isFreeGrandfathered: true,
        freeGrandfatheredAt: "2026-01-25T20:13:23.947Z",
        platform: "web",
        subscription_level: level,
        subscription_tier: tier,
        subscription_status: status,
        isFoundingMember: true,
        foundingMemberSince: "2026-01-29T00:00:00.000Z",
        foundingMemberAcknowledged: true,
        subscription_provider: provider,
        stripe_customer_id: stripeCustomerId,
        entitlement_tier: tier
      }
    });
    
    console.log(`[fixKKY] User updated successfully`);
    
    // Re-fetch to confirm
    const users = await base44.asServiceRole.entities.User.filter({ email: targetEmail });
    const updated = users?.[0];
    
    return Response.json({
      ok: true,
      result: {
        entitlement_tier: updated?.data?.entitlement_tier,
        subscription_tier: updated?.data?.subscription_tier,
        subscription_status: updated?.data?.subscription_status,
        hasNestedData: updated?.data?.data !== undefined
      },
      message: 'User needs to log out and back in for changes to take effect'
    });

  } catch (error) {
    console.error('[fixKKY] Error:', error);
    return Response.json({ 
      ok: false, 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});