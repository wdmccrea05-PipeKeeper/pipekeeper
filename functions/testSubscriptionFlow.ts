import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.id) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const testType = body?.testType || "all"; // all, checkout, portal, specific

    const results = {
      user_id: user.id,
      email: user.email,
      tests: [],
      timestamp: new Date().toISOString(),
    };

    // Test 1: Premium Monthly Checkout
    if (testType === "all" || testType === "checkout_premium_monthly") {
      try {
        const res = await base44.functions.invoke("createCheckoutSession", {
          tier: "premium",
          interval: "monthly",
        });
        results.tests.push({
          name: "Premium Monthly Checkout",
          status: res.data?.url ? "✅ PASS" : "❌ FAIL",
          url: res.data?.url || null,
          error: res.data?.error || null,
        });
      } catch (e) {
        results.tests.push({
          name: "Premium Monthly Checkout",
          status: "❌ FAIL",
          error: e.message,
        });
      }
    }

    // Test 2: Premium Annual Checkout
    if (testType === "all" || testType === "checkout_premium_annual") {
      try {
        const res = await base44.functions.invoke("createCheckoutSession", {
          tier: "premium",
          interval: "annual",
        });
        results.tests.push({
          name: "Premium Annual Checkout",
          status: res.data?.url ? "✅ PASS" : "❌ FAIL",
          url: res.data?.url || null,
          error: res.data?.error || null,
        });
      } catch (e) {
        results.tests.push({
          name: "Premium Annual Checkout",
          status: "❌ FAIL",
          error: e.message,
        });
      }
    }

    // Test 3: Pro Monthly Checkout
    if (testType === "all" || testType === "checkout_pro_monthly") {
      try {
        const res = await base44.functions.invoke("createCheckoutSession", {
          tier: "pro",
          interval: "monthly",
        });
        results.tests.push({
          name: "Pro Monthly Checkout",
          status: res.data?.url ? "✅ PASS" : "❌ FAIL",
          url: res.data?.url || null,
          error: res.data?.error || null,
        });
      } catch (e) {
        results.tests.push({
          name: "Pro Monthly Checkout",
          status: "❌ FAIL",
          error: e.message,
        });
      }
    }

    // Test 4: Pro Annual Checkout
    if (testType === "all" || testType === "checkout_pro_annual") {
      try {
        const res = await base44.functions.invoke("createCheckoutSession", {
          tier: "pro",
          interval: "annual",
        });
        results.tests.push({
          name: "Pro Annual Checkout",
          status: res.data?.url ? "✅ PASS" : "❌ FAIL",
          url: res.data?.url || null,
          error: res.data?.error || null,
        });
      } catch (e) {
        results.tests.push({
          name: "Pro Annual Checkout",
          status: "❌ FAIL",
          error: e.message,
        });
      }
    }

    // Test 5: Manage Subscription (Customer Portal)
    if (testType === "all" || testType === "manage_subscription") {
      try {
        const res = await base44.functions.invoke(
          "createCustomerPortalSession",
          {}
        );
        const hasStripeError = res.data?.error?.includes("No Stripe subscription");
        results.tests.push({
          name: "Manage Subscription (Portal)",
          status: res.data?.url
            ? "✅ PASS"
            : hasStripeError
            ? "✅ PASS (Expected - no Stripe subscription)"
            : "❌ FAIL",
          note: res.data?.error
            ? "No active Stripe subscription found (expected if using Apple)"
            : "Portal session created",
          url: res.data?.url || null,
          error: res.data?.error || null,
        });
      } catch (e) {
        results.tests.push({
          name: "Manage Subscription (Portal)",
          status: "❌ FAIL",
          error: e.message,
        });
      }
    }

    // Test 6: Verify User Record
    if (testType === "all" || testType === "user_record") {
      try {
        const userProfile = await base44.entities.User.filter({
          email: user.email,
        });
        results.tests.push({
          name: "User Record Lookup",
          status: userProfile?.length > 0 ? "✅ PASS" : "⚠️ NOT FOUND",
          recordCount: userProfile?.length || 0,
        });
      } catch (e) {
        results.tests.push({
          name: "User Record Lookup",
          status: "❌ FAIL",
          error: e.message,
        });
      }
    }

    // Test 7: Verify Subscription Records
    if (testType === "all" || testType === "subscription_records") {
      try {
        const subs = await base44.entities.Subscription.filter({
          user_email: user.email.toLowerCase(),
        });
        results.tests.push({
          name: "Subscription Records",
          status: subs?.length > 0 ? "✅ FOUND" : "⚠️ NONE YET",
          count: subs?.length || 0,
          records: (subs || []).slice(0, 3).map((s) => ({
            provider: s.provider,
            status: s.status,
            tier: s.tier,
          })),
        });
      } catch (e) {
        results.tests.push({
          name: "Subscription Records",
          status: "❌ FAIL",
          error: e.message,
        });
      }
    }

    return Response.json(results);
  } catch (error) {
    return Response.json(
      { error: error.message || String(error) },
      { status: 500 }
    );
  }
});