import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Verify all Pro users have correct entitlements unlocked
 * Tests: Dallas Hinton, Michael Woodbury, and any user with tier="pro"
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const results = {
      timestamp: new Date().toISOString(),
      tested: [],
      issues: [],
    };

    // Test specific known Pro users
    const testEmails = [
      'dallas.hinton@outlook.com', // Dallas Hinton
      'michael@woodburylawfl.com', // Michael Woodbury
    ];

    // Get all users with Pro tier from Subscription entity
    const proSubs = await base44.asServiceRole.entities.Subscription.filter({
      tier: 'pro',
      status: 'active',
    });

    const proEmails = new Set([
      ...testEmails,
      ...proSubs.map((s) => s.user_email?.toLowerCase()).filter(Boolean),
    ]);

    for (const email of proEmails) {
      try {
        // Fetch user by email
        const users = await base44.asServiceRole.entities.User.filter({
          email: email.toLowerCase(),
        });

        if (!users || users.length === 0) {
          results.issues.push({
            email,
            error: 'User not found',
          });
          continue;
        }

        const testUser = users[0];
        const userId = testUser.id;

        // Check entitlement tier
        const tier =
          testUser.entitlement_tier ||
          testUser.tier ||
          testUser.data?.entitlement_tier ||
          'free';

        // Check subscription status
        const subs = await base44.asServiceRole.entities.Subscription.filter({
          user_email: email.toLowerCase(),
        });

        const activeSub = subs?.find((s) => s.status === 'active');

        const testResult = {
          email,
          userId,
          entitlement_tier: tier,
          subscription_status: activeSub?.status || 'none',
          subscription_tier: activeSub?.tier || 'none',
          passed: tier === 'pro' && activeSub?.status === 'active',
        };

        results.tested.push(testResult);

        if (!testResult.passed) {
          results.issues.push({
            email,
            expected: 'tier=pro, status=active',
            actual: `tier=${tier}, status=${activeSub?.status || 'none'}`,
          });
        }
      } catch (err) {
        results.issues.push({
          email,
          error: err.message,
        });
      }
    }

    const allPassed = results.issues.length === 0 && results.tested.length > 0;

    return Response.json({
      success: allPassed,
      summary: `${results.tested.filter((t) => t.passed).length}/${results.tested.length} pro users verified`,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});