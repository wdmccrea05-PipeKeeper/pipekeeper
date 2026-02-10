import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's subscription data to determine hasPaidAccess
    const userData = user.data || {};
    const entitlementTier = userData.entitlement_tier;
    const subscriptionLevel = userData.subscription_level;
    const hasPaidAccess = 
      entitlementTier === 'premium' || 
      entitlementTier === 'pro' ||
      subscriptionLevel === 'paid';

    // Simulate the canCreatePipe logic
    if (hasPaidAccess) {
      return Response.json({
        success: true,
        hasPaidAccess: true,
        canCreate: true,
        currentCount: 0,
        limit: null,
        message: 'Paid user - unlimited access ✅'
      });
    }

    // Check actual count for free users
    const pipes = await base44.entities.Pipe.filter({ created_by: user.email });
    const count = pipes?.length || 0;
    const FREE_LIMIT = 5;
    const canCreate = count < FREE_LIMIT;

    return Response.json({
      success: true,
      hasPaidAccess: false,
      canCreate,
      currentCount: count,
      limit: FREE_LIMIT,
      message: canCreate 
        ? `Free user can add more pipes (${count}/${FREE_LIMIT})` 
        : `Free user at limit (${count}/${FREE_LIMIT}) ❌`
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});