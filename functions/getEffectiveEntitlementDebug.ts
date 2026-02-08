import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

const normEmail = (email) => String(email || "").trim().toLowerCase();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();

    if (!authUser?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = normEmail(authUser.email);
    const userId = authUser.id || authUser.auth_user_id;

    console.log(`[ENTITLEMENT_DEBUG] Request for email=${email} userId=${userId}`);

    // Get user by ID first (primary lookup)
    let user = null;
    if (userId) {
      const byId = await base44.asServiceRole.entities.User.filter({ id: userId });
      user = byId?.[0];
      console.log(`[ENTITLEMENT_DEBUG] lookup by userId: ${user ? "FOUND" : "NOT_FOUND"}`);
    }

    // Fallback to email if ID lookup failed
    if (!user) {
      const byEmail = await base44.asServiceRole.entities.User.filter({ email });
      user = byEmail?.[0];
      console.log(`[ENTITLEMENT_DEBUG] lookup by email: ${user ? "FOUND" : "NOT_FOUND"}`);
    }

    if (!user) {
      return Response.json({
        error: "User record not found",
        email,
        userId,
      }, { status: 404 });
    }

    console.log(`[ENTITLEMENT_DEBUG] User found: id=${user.id} email=${user.email}`);
    console.log(`[ENTITLEMENT_DEBUG] subscription_level=${user.subscription_level} status=${user.subscription_status} tier=${user.subscription_tier}`);

    // Look up subscription records by user_id (primary) then email (fallback)
    let subscriptions = [];
    if (user.id) {
      subscriptions = await base44.asServiceRole.entities.Subscription.filter({
        user_id: user.id,
      });
      console.log(`[ENTITLEMENT_DEBUG] Found ${subscriptions.length} subscription(s) by user_id`);
    }

    if (subscriptions.length === 0 && user.email) {
      subscriptions = await base44.asServiceRole.entities.Subscription.filter({
        user_email: normEmail(user.email),
      });
      console.log(`[ENTITLEMENT_DEBUG] Found ${subscriptions.length} subscription(s) by email (fallback)`);
    }

    // Filter to active subscriptions
    const activeSubs = subscriptions.filter((s) =>
      ["active", "trialing", "trial", "past_due"].includes(s.status)
    );

    console.log(`[ENTITLEMENT_DEBUG] Active subscriptions: ${activeSubs.length}`);
    activeSubs.forEach((s, i) => {
      console.log(`[ENTITLEMENT_DEBUG]   [${i}] provider=${s.provider} tier=${s.tier} status=${s.status}`);
    });

    // Determine effective tier
    let effectiveTier = user.subscription_tier || "free";
    let source = "user_record";

    if (activeSubs.length > 0) {
      // Prefer pro, then premium
      const proCandidates = activeSubs.filter((s) => s.tier === "pro");
      const premiumCandidates = activeSubs.filter((s) => s.tier === "premium");

      if (proCandidates.length > 0) {
        effectiveTier = "pro";
        source = "pro_subscription";
      } else if (premiumCandidates.length > 0) {
        effectiveTier = "premium";
        source = "premium_subscription";
      }
    }

    console.log(`[ENTITLEMENT_DEBUG] RESULT: tier=${effectiveTier} source=${source}`);

    return Response.json({
      email,
      userId,
      effectiveTier,
      source,
      userSubscriptionLevel: user.subscription_level,
      userSubscriptionStatus: user.subscription_status,
      userSubscriptionTier: user.subscription_tier,
      subscriptionCount: subscriptions.length,
      activeSubscriptionCount: activeSubs.length,
      subscriptions: subscriptions.map((s) => ({
        id: s.id,
        provider: s.provider,
        tier: s.tier,
        status: s.status,
        created_date: s.created_date,
      })),
    });
  } catch (error) {
    console.error("[ENTITLEMENT_DEBUG] Error:", error);
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});