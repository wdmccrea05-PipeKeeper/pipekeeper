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

    console.log('[bulkUpdate] Starting bulk entitlement update');

    // Get all active subscriptions
    const allSubs = await base44.asServiceRole.entities.Subscription.list();
    const activeSubs = allSubs.filter(s => {
      const status = (s.data?.status || s.status || '').toLowerCase();
      return ['active', 'trialing', 'trial'].includes(status);
    });

    console.log(`[bulkUpdate] Found ${activeSubs.length} active subscriptions`);

    const results = {
      updated: [],
      errors: [],
      skipped: []
    };

    for (const sub of activeSubs) {
      const email = (sub.data?.user_email || sub.user_email || '').toLowerCase();
      const userId = sub.data?.user_id || sub.user_id;
      
      if (!email) {
        results.skipped.push({
          subscription_id: sub.id,
          reason: 'no_email'
        });
        continue;
      }

      try {
        // Get user
        const users = await base44.asServiceRole.entities.User.filter({ email });
        
        if (!users || users.length === 0) {
          results.errors.push({
            email,
            error: 'user_not_found'
          });
          continue;
        }

        const targetUser = users[0];
        const subTier = sub.data?.tier || sub.tier || 'premium';
        const subStatus = sub.data?.status || sub.status || 'active';
        const provider = sub.data?.provider || sub.provider || 'stripe';

        // Clean and update user data
        const cleanData = { ...(targetUser.data || {}) };
        delete cleanData.data; // Remove any nested structure

        cleanData.entitlement_tier = subTier;
        cleanData.subscription_tier = subTier;
        cleanData.subscription_level = 'paid';
        cleanData.subscription_status = subStatus;
        cleanData.subscription_provider = provider;
        
        if (sub.data?.stripe_customer_id || sub.stripe_customer_id) {
          cleanData.stripe_customer_id = sub.data?.stripe_customer_id || sub.stripe_customer_id;
        }

        await base44.asServiceRole.entities.User.update(targetUser.id, {
          data: cleanData
        });

        results.updated.push({
          email,
          tier: subTier,
          status: subStatus
        });

      } catch (err) {
        results.errors.push({
          email,
          error: err.message
        });
      }
    }

    return Response.json({
      ok: true,
      summary: {
        totalActiveSubs: activeSubs.length,
        updated: results.updated.length,
        errors: results.errors.length,
        skipped: results.skipped.length
      },
      results
    });

  } catch (error) {
    console.error('[bulkUpdate] Error:', error);
    return Response.json({ 
      ok: false, 
      error: error.message 
    }, { status: 500 });
  }
});