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

    console.log('[repairMissingUserEntitlements] Starting repair for users without entitlement fields');

    // Get all users
    const allUsers = await base44.asServiceRole.entities.User.list();
    
    let repaired = 0;
    let errors = 0;
    const results = [];

    for (const u of allUsers) {
      try {
        const hasEntitlementFields = u.data?.entitlement_tier || 
                                       u.data?.subscription_tier || 
                                       u.data?.subscription_status;

        if (hasEntitlementFields) {
          continue;
        }

        console.log(`[repairMissingUserEntitlements] Adding entitlement fields to ${u.email}`);

        // Initialize with free tier defaults
        const cleanData = { ...(u.data || {}) };
        delete cleanData.data; // Remove any nested structure
        
        cleanData.entitlement_tier = 'free';
        cleanData.subscription_tier = 'free';
        cleanData.subscription_level = 'free';
        cleanData.subscription_status = 'inactive';
        cleanData.platform = cleanData.platform || 'web';

        // Update the user
        await base44.asServiceRole.entities.User.update(u.id, {
          data: cleanData
        });

        repaired++;
        results.push({ 
          email: u.email, 
          status: 'repaired'
        });

      } catch (err) {
        errors++;
        results.push({ 
          email: u.email, 
          status: 'error', 
          error: err.message 
        });
        console.error(`[repairMissingUserEntitlements] Failed for ${u.email}:`, err);
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
      results: results.slice(0, 50) // Limit results to first 50
    });

  } catch (error) {
    console.error('[repairMissingUserEntitlements] Error:', error);
    return Response.json({ 
      ok: false, 
      error: error.message 
    }, { status: 500 });
  }
});