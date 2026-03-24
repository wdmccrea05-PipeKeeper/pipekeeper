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

    console.log('[repairAllUserEntitlementStructure] Starting repair for all users');

    // Get all users
    const allUsers = await base44.asServiceRole.entities.User.list();
    
    let repaired = 0;
    let errors = 0;
    const results = [];

    for (const u of allUsers) {
      try {
        const hasNestedData = u.data?.data !== undefined;
        const needsRepair = hasNestedData || !u.data?.entitlement_tier;

        if (!needsRepair) {
          results.push({ email: u.email, status: 'ok', reason: 'no repair needed' });
          continue;
        }

        console.log(`[repairAllUserEntitlementStructure] Repairing ${u.email}`);

        // Clean the data structure
        const cleanData = { ...(u.data || {}) };
        
        // Remove nested data object
        delete cleanData.data;

        // Ensure entitlement fields exist
        if (!cleanData.entitlement_tier) {
          cleanData.entitlement_tier = cleanData.subscription_tier || 'free';
        }
        if (!cleanData.subscription_level) {
          cleanData.subscription_level = (cleanData.subscription_tier && cleanData.subscription_tier !== 'free') ? 'paid' : 'free';
        }
        if (!cleanData.subscription_status) {
          cleanData.subscription_status = cleanData.subscription_tier === 'free' ? 'inactive' : 'active';
        }

        // Update the user
        await base44.asServiceRole.entities.User.update(u.id, {
          data: cleanData
        });

        repaired++;
        results.push({ 
          email: u.email, 
          status: 'repaired', 
          hadNestedData: hasNestedData,
          tier: cleanData.entitlement_tier 
        });

      } catch (err) {
        errors++;
        results.push({ 
          email: u.email, 
          status: 'error', 
          error: err.message 
        });
        console.error(`[repairAllUserEntitlementStructure] Failed for ${u.email}:`, err);
      }
    }

    return Response.json({
      ok: true,
      summary: {
        total: allUsers.length,
        repaired,
        errors,
        unchanged: allUsers.length - repaired - errors
      },
      results
    });

  } catch (error) {
    console.error('[repairAllUserEntitlementStructure] Error:', error);
    return Response.json({ 
      ok: false, 
      error: error.message 
    }, { status: 500 });
  }
});