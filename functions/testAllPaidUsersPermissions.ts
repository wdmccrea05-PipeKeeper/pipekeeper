import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Canonical resolver functions (inlined)
 */
function normalizeTier(tier) {
  if (!tier) return "free";
  const lower = String(tier).toLowerCase().trim();
  if (lower === "pro") return "pro";
  if (lower === "premium") return "premium";
  return "free";
}

function getEntitlementTier(user, subscription) {
  if (user?.role === "admin") return "pro";
  if (user?.tier) return normalizeTier(user.tier);
  if (user?.entitlementTier) return normalizeTier(user.entitlementTier);
  if (user?.subscriptionTier) return normalizeTier(user.subscriptionTier);
  if (subscription?.tier) return normalizeTier(subscription.tier);
  return "free";
}

function hasPaidAccess(user, subscription) {
  const tier = getEntitlementTier(user, subscription);
  return tier === "premium" || tier === "pro";
}

function hasProAccess(user, subscription) {
  const tier = getEntitlementTier(user, subscription);
  return tier === "pro";
}

function getPlanLabel(user, subscription) {
  const tier = getEntitlementTier(user, subscription);
  if (tier === "pro") return "Pro";
  if (tier === "premium") return "Premium";
  return "Free";
}

/**
 * Tests all active paid subscriptions to verify canonical resolver grants correct access
 * Admin-only function
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin access
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all active subscriptions
    const subscriptions = await base44.asServiceRole.entities.Subscription.filter({ 
      status: "active" 
    });

    const results = [];

    for (const sub of subscriptions) {
      const userEmail = sub.user_email;
      const userId = sub.user_id;

      // Fetch user entity
      let userRecord = null;
      try {
        if (userId) {
          const users = await base44.asServiceRole.entities.User.filter({ id: userId });
          userRecord = users[0];
        }
        if (!userRecord && userEmail) {
          const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
          userRecord = users[0];
        }
      } catch (err) {
        console.warn(`Failed to fetch user for ${userEmail}:`, err);
      }

      // Test canonical resolver
      const tier = getEntitlementTier(userRecord, sub);
      const hasPaid = hasPaidAccess(userRecord, sub);
      const hasPro = hasProAccess(userRecord, sub);
      const label = getPlanLabel(userRecord, sub);

      // Expected values based on subscription
      const expectedTier = (sub.tier || '').toLowerCase();
      const expectedPaid = true; // All active subs should have paid access
      const expectedPro = expectedTier === 'pro';

      // Determine test status
      const tierMatch = tier === expectedTier;
      const paidMatch = hasPaid === expectedPaid;
      const proMatch = hasPro === expectedPro;

      const allPass = tierMatch && paidMatch && proMatch;

      results.push({
        email: userEmail,
        userId: userId || 'N/A',
        provider: sub.provider,
        subTier: sub.tier,
        subStatus: sub.status,
        // Results
        tier,
        hasPaid,
        hasPro,
        label,
        // Expected
        expectedTier,
        expectedPaid,
        expectedPro,
        // Pass/Fail
        tierMatch,
        paidMatch,
        proMatch,
        status: allPass ? 'pass' : (hasPaid ? 'warning' : 'fail'),
        issues: [
          !tierMatch && `Tier mismatch: got ${tier}, expected ${expectedTier}`,
          !paidMatch && `Paid access: got ${hasPaid}, expected ${expectedPaid}`,
          !proMatch && `Pro access: got ${hasPro}, expected ${expectedPro}`,
        ].filter(Boolean)
      });
    }

    // Calculate summary
    const pass = results.filter(r => r.status === 'pass').length;
    const fail = results.filter(r => r.status === 'fail').length;
    const warning = results.filter(r => r.status === 'warning').length;

    return Response.json({
      results,
      summary: { pass, fail, warning },
      totalTested: results.length
    });

  } catch (error) {
    console.error('[testAllPaidUsersPermissions] Error:', error);
    return Response.json({ 
      error: error.message,
      results: [],
      summary: { pass: 0, fail: 1, warning: 0 }
    }, { status: 500 });
  }
});