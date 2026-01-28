import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeClient, safeStripeError } from "./_utils/stripe.ts";

const normEmail = (email: string) => String(email || "").trim().toLowerCase();

function isActiveStatus(status: string): boolean {
  const activeStatuses = ["active", "trialing", "trial"];
  return activeStatuses.includes((status || "").toLowerCase());
}

function getTierPriority(tier: string): number {
  const t = (tier || "").toLowerCase();
  if (t === "pro") return 3;
  if (t === "premium") return 2;
  return 1; // free
}

Deno.serve(async (req) => {
  try {
    // Parse input
    let body;
    try {
      body = await req.json();
    } catch {
      return Response.json({
        ok: false,
        error: "INVALID_INPUT",
        message: "Invalid JSON body"
      }, { status: 400 });
    }

    const targetEmail = normEmail(body.email);
    if (!targetEmail) {
      return Response.json({
        ok: false,
        error: "MISSING_EMAIL",
        message: "Email is required"
      }, { status: 400 });
    }

    // Auth - must be admin
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();

    if (!authUser?.role || authUser.role !== "admin") {
      return Response.json({ 
        ok: false, 
        error: "FORBIDDEN",
        message: "Admin access required"
      }, { status: 403 });
    }

    // Find user by email
    const users = await base44.asServiceRole.entities.User.filter({ email: targetEmail });
    const userEntity = users?.[0];

    if (!userEntity) {
      return Response.json({
        ok: false,
        error: "USER_NOT_FOUND",
        message: `No user found with email: ${targetEmail}`
      }, { status: 404 });
    }

    const before = {
      email: userEntity.email,
      subscription_tier: userEntity.subscription_tier,
      subscription_level: userEntity.subscription_level,
      subscription_status: userEntity.subscription_status,
      stripe_customer_id: userEntity.stripe_customer_id,
    };

    // Start with existing known tier/status
    let currentTier = userEntity.subscription_tier || "free";
    let currentLevel = userEntity.subscription_level || "free";
    let currentStatus = userEntity.subscription_status || "";
    let stripeCustomerId = userEntity.stripe_customer_id || null;

    const wasEverPaid = currentLevel === "paid" || 
                        currentTier === "premium" || 
                        currentTier === "pro" ||
                        isActiveStatus(currentStatus);

    let stripeTier = null;
    let stripeStatus = null;
    let appleTier = null;
    let appleStatus = null;

    // === STRIPE RECOVERY ===
    try {
      const stripe = getStripeClient();

      // Find customer by email
      let customer = null;
      try {
        const searchResults = await stripe.customers.search({
          query: `email:'${targetEmail}'`,
          limit: 1,
        });
        customer = searchResults.data?.[0];
      } catch {
        const customers = await stripe.customers.list({ email: targetEmail, limit: 1 });
        customer = customers.data?.[0];
      }

      if (customer?.id) {
        stripeCustomerId = customer.id;

        // Find active subscriptions
        const subsResponse = await stripe.subscriptions.list({
          customer: customer.id,
          status: "all",
          limit: 10,
          expand: ["data.items.data.price"],
        });

        if (subsResponse.data?.length > 0) {
          const activeSub = subsResponse.data.find((s: any) => 
            s.status === "active" || s.status === "trialing"
          );
          const bestSub = activeSub || subsResponse.data[0];

          stripeStatus = bestSub.status;

          // Determine tier from price
          const priceId = bestSub.items?.data?.[0]?.price?.id;
          const proMonthly = Deno.env.get("STRIPE_PRICE_ID_PRO_MONTHLY");
          const proAnnual = Deno.env.get("STRIPE_PRICE_ID_PRO_ANNUAL");

          if (priceId === proMonthly || priceId === proAnnual) {
            stripeTier = "pro";
          } else if (isActiveStatus(bestSub.status)) {
            stripeTier = "premium";
          }
        }
      }
    } catch (e: any) {
      console.warn("[adminReconcileEntitlementsByEmail] Stripe recovery failed:", safeStripeError(e));
    }

    // === APPLE CHECK ===
    try {
      const appleSubs = await base44.asServiceRole.entities.Subscription.filter({
        user_email: targetEmail,
        provider: "apple",
      });

      if (appleSubs?.length > 0) {
        const activeSub = appleSubs.find((s: any) => isActiveStatus(s.status));
        const bestSub = activeSub || appleSubs[0];

        appleStatus = bestSub.status;
        if (isActiveStatus(bestSub.status)) {
          appleTier = bestSub.tier || "premium";
        }
      }
    } catch (e: any) {
      console.warn("[adminReconcileEntitlementsByEmail] Apple check failed:", e);
    }

    // === RESOLVE FINAL TIER ===
    let finalTier = "free";
    let finalStatus = "";
    let providerUsed = "none";

    const stripeActive = stripeTier && isActiveStatus(stripeStatus);
    const appleActive = appleTier && isActiveStatus(appleStatus);

    if (stripeActive && appleActive) {
      // Both active: choose higher tier
      if (getTierPriority(stripeTier) >= getTierPriority(appleTier)) {
        finalTier = stripeTier;
        finalStatus = stripeStatus;
        providerUsed = "stripe";
      } else {
        finalTier = appleTier;
        finalStatus = appleStatus;
        providerUsed = "apple";
      }
    } else if (stripeActive) {
      finalTier = stripeTier;
      finalStatus = stripeStatus;
      providerUsed = "stripe";
    } else if (appleActive) {
      finalTier = appleTier;
      finalStatus = appleStatus;
      providerUsed = "apple";
    } else {
      // No active providers
      if (wasEverPaid) {
        finalTier = currentTier;
        finalStatus = currentStatus;
        providerUsed = "preserved";
      } else {
        finalTier = "free";
        finalStatus = "inactive";
        providerUsed = "none";
      }
    }

    const finalLevel = (finalTier === "free") ? "free" : "paid";

    // === UPDATE USER ENTITY ===
    const updates: any = {
      subscription_tier: finalTier,
      subscription_level: finalLevel,
      subscription_status: finalStatus,
    };

    if (stripeCustomerId && !userEntity.stripe_customer_id) {
      updates.stripe_customer_id = stripeCustomerId;
    }

    await base44.asServiceRole.entities.User.update(userEntity.id, updates);

    const after = {
      email: userEntity.email,
      subscription_tier: finalTier,
      subscription_level: finalLevel,
      subscription_status: finalStatus,
      stripe_customer_id: stripeCustomerId || userEntity.stripe_customer_id,
    };

    return Response.json({
      ok: true,
      before,
      after,
      providerUsed,
      changes: {
        tierChanged: before.subscription_tier !== after.subscription_tier,
        levelChanged: before.subscription_level !== after.subscription_level,
        statusChanged: before.subscription_status !== after.subscription_status,
        customerIdAdded: !before.stripe_customer_id && after.stripe_customer_id,
      }
    });

  } catch (error: any) {
    console.error("[adminReconcileEntitlementsByEmail] error:", error);
    return Response.json({
      ok: false,
      error: "RECONCILE_FAILED",
      message: String(error?.message || error),
    }, { status: 500 });
  }
});