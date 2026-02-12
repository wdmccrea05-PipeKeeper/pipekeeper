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

    console.log('[testPaidUsers] Starting comprehensive test of all paid users');

    // Get all active subscriptions
    const allSubs = await base44.asServiceRole.entities.Subscription.list();
    const activeSubs = allSubs.filter(s => {
      const status = (s.data?.status || '').toLowerCase();
      return ['active', 'trialing', 'trial'].includes(status);
    });

    console.log(`[testPaidUsers] Found ${activeSubs.length} active subscriptions`);

    const issues = [];
    const fixed = [];
    const alreadyCorrect = [];

    for (const sub of activeSubs) {
      const email = (sub.data?.user_email || '').toLowerCase();
      const userId = sub.data?.user_id;
      
      if (!email) {
        issues.push({
          subscription_id: sub.id,
          issue: 'no_email',
          severity: 'HIGH'
        });
        continue;
      }

      try {
        // Get user
        const users = await base44.asServiceRole.entities.User.filter({ email });
        
        if (!users || users.length === 0) {
          issues.push({
            email,
            issue: 'user_not_found',
            severity: 'CRITICAL',
            subscription_tier: sub.data?.tier
          });
          continue;
        }

        const targetUser = users[0];
        const subTier = sub.data?.tier || 'premium';
        const userTier = targetUser.data?.entitlement_tier || targetUser.data?.subscription_tier;
        const hasNestedData = targetUser.data?.data !== undefined;
        const missingEntitlementFields = !targetUser.data?.entitlement_tier && !targetUser.data?.subscription_tier;

        // Check for issues
        if (hasNestedData || missingEntitlementFields || userTier === 'free' || userTier !== subTier) {
          issues.push({
            email,
            user_id: targetUser.id,
            issues: {
              hasNestedData,
              missingEntitlementFields,
              userTier,
              expectedTier: subTier,
              tierMismatch: userTier !== subTier
            }
          });

          // Fix the user
          const cleanData = { ...(targetUser.data || {}) };
          delete cleanData.data; // Remove nested structure

          cleanData.entitlement_tier = subTier;
          cleanData.subscription_tier = subTier;
          cleanData.subscription_level = 'paid';
          cleanData.subscription_status = sub.data?.status || 'active';
          cleanData.subscription_provider = sub.data?.provider || 'stripe';
          
          if (sub.data?.stripe_customer_id) {
            cleanData.stripe_customer_id = sub.data.stripe_customer_id;
          }

          await base44.asServiceRole.entities.User.update(targetUser.id, {
            data: cleanData
          });

          fixed.push({
            email,
            fixed: {
              from: userTier,
              to: subTier,
              removedNesting: hasNestedData
            }
          });

        } else {
          alreadyCorrect.push(email);
        }

      } catch (err) {
        issues.push({
          email,
          issue: 'error_processing',
          error: err.message,
          severity: 'HIGH'
        });
      }
    }

    return Response.json({
      ok: true,
      summary: {
        totalActiveSubs: activeSubs.length,
        issuesFound: issues.length,
        usersFixed: fixed.length,
        alreadyCorrect: alreadyCorrect.length
      },
      issues: issues.slice(0, 50),
      fixed: fixed.slice(0, 50),
      recommendation: fixed.length > 0 
        ? `Fixed ${fixed.length} paid users. They need to log out and back in.`
        : 'All paid users have correct entitlements.'
    });

  } catch (error) {
    console.error('[testPaidUsers] Error:', error);
    return Response.json({ 
      ok: false, 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});