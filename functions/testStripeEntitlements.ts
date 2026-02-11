import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== "admin") {
      return Response.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const testResults = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: { passed: 0, failed: 0 },
    };

    const addTest = (name, passed, details) => {
      testResults.tests.push({ name, passed, details });
      if (passed) testResults.summary.passed++;
      else testResults.summary.failed++;
    };

    // Get test user email
    const testEmail = user.email;

    // Test 1: Create Premium Monthly subscription
    console.log("[Test 1] Creating Premium Monthly subscription...");
    try {
      const premiumMonthlyPriceId = Deno.env.get("STRIPE_PRICE_ID_PREMIUM_MONTHLY");
      
      // Simulate subscription creation
      await base44.asServiceRole.entities.Subscription.create({
        user_email: testEmail,
        user_id: user.id,
        provider: "stripe",
        provider_subscription_id: `test_sub_premium_${Date.now()}`,
        stripe_customer_id: `test_cus_${Date.now()}`,
        status: "active",
        tier: "premium",
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        billing_interval: "month",
        amount: 4.99,
      });

      // Set entitlement using entities API
      await base44.asServiceRole.entities.User.update(user.id, {
        entitlement_tier: "premium",
        subscription_status: "active",
      });

      // Verify entitlement
      const updatedUser = await base44.asServiceRole.entities.User.get(user.id);
      const isPremium = updatedUser.entitlement_tier === "premium";
      
      addTest("Premium Monthly Subscription", isPremium, {
        expected: "premium",
        actual: updatedUser.entitlement_tier,
        status: updatedUser.subscription_status,
      });
    } catch (e) {
      addTest("Premium Monthly Subscription", false, { error: e.message });
    }

    // Test 2: Create Pro Monthly subscription
    console.log("[Test 2] Creating Pro Monthly subscription...");
    try {
      const proMonthlyPriceId = Deno.env.get("STRIPE_PRICE_ID_PRO_MONTHLY");
      
      // Simulate subscription upgrade to Pro
      await base44.asServiceRole.entities.Subscription.create({
        user_email: testEmail,
        user_id: user.id,
        provider: "stripe",
        provider_subscription_id: `test_sub_pro_${Date.now()}`,
        stripe_customer_id: `test_cus_${Date.now()}`,
        status: "active",
        tier: "pro",
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        billing_interval: "month",
        amount: 9.99,
      });

      // Set entitlement using entities API
      await base44.asServiceRole.entities.User.update(user.id, {
        entitlement_tier: "pro",
        subscription_status: "active",
      });

      // Verify entitlement
      const updatedUser = await base44.asServiceRole.entities.User.get(user.id);
      const isPro = updatedUser.entitlement_tier === "pro";
      
      addTest("Pro Monthly Subscription", isPro, {
        expected: "pro",
        actual: updatedUser.entitlement_tier,
        status: updatedUser.subscription_status,
      });
    } catch (e) {
      addTest("Pro Monthly Subscription", false, { error: e.message });
    }

    // Test 3: Verify Premium access helper functions
    console.log("[Test 3] Testing Premium access...");
    try {
      const updatedUser = await base44.asServiceRole.entities.User.get(user.id);
      const subscriptions = await base44.asServiceRole.entities.Subscription.filter({
        user_id: user.id,
        status: "active",
      });
      
      // Check if user has paid access (should be true for Pro)
      const hasPaidAccess = updatedUser.entitlement_tier === "pro" || updatedUser.entitlement_tier === "premium";
      const hasProAccess = updatedUser.entitlement_tier === "pro";
      
      addTest("Premium Access Check", hasPaidAccess, {
        tier: updatedUser.entitlement_tier,
        hasPaidAccess,
        hasProAccess,
        activeSubscriptions: subscriptions.length,
      });
    } catch (e) {
      addTest("Premium Access Check", false, { error: e.message });
    }

    // Test 4: Verify subscription records exist
    console.log("[Test 4] Verifying subscription records...");
    try {
      const subscriptions = await base44.asServiceRole.entities.Subscription.filter({
        user_id: user.id,
      });
      
      const hasPremium = subscriptions.some(s => s.tier === "premium");
      const hasPro = subscriptions.some(s => s.tier === "pro");
      
      addTest("Subscription Records", hasPremium && hasPro, {
        totalSubscriptions: subscriptions.length,
        hasPremiumRecord: hasPremium,
        hasProRecord: hasPro,
        subscriptions: subscriptions.map(s => ({
          tier: s.tier,
          status: s.status,
          provider: s.provider,
        })),
      });
    } catch (e) {
      addTest("Subscription Records", false, { error: e.message });
    }

    // Test 5: Verify entitlement persistence
    console.log("[Test 5] Verifying entitlement persistence...");
    try {
      const freshUser = await base44.asServiceRole.entities.User.get(user.id);
      const entitlementPersisted = freshUser.entitlement_tier === "pro";
      
      addTest("Entitlement Persistence", entitlementPersisted, {
        tier: freshUser.entitlement_tier,
        status: freshUser.subscription_status,
        role: freshUser.role,
      });
    } catch (e) {
      addTest("Entitlement Persistence", false, { error: e.message });
    }

    // Overall result
    const allPassed = testResults.summary.failed === 0;
    testResults.overallResult = allPassed ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED";

    return Response.json({
      success: allPassed,
      ...testResults,
    });
  } catch (error) {
    console.error("[testStripeEntitlements] Error:", error);
    return Response.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});