import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeClient, safeStripeError, getStripeKeyPrefix } from "./_utils/stripe.ts";

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
      body = await req.json().catch(() => ({}));
    } catch {
      body = {};
    }

    const platform = body.platform || "web";

    // Auth
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();

    if (!authUser?.id || !authUser?.email) {
      return Response.json({ 
        ok: false, 
        error: "UNAUTHENTICATED" 
      }, { status: 401 });
    }

    const email = normEmail(authUser.email);

    // Load User entity (prefer by ID, fallback to email filter)
    let userEntity;
    try {
      userEntity = await base44.asServiceRole.entities.User.get(authUser.id);
    } catch {
      const users = await base44.asServiceRole.entities.User.filter({ email });
      userEntity = users?.[0];
    }

    if (!userEntity) {
      return Response.json({
        ok: false,
        error: "USER_NOT_FOUND",
        message: "User entity not found"
      }, { status: 404 });
    }

    const before = {
      platform: userEntity.platform,
      last_login_platform: userEntity.last_login_platform,
      subscription_tier: userEntity.subscription_tier,
      subscription_level: userEntity.subscription_level,
      subscription_status: userEntity.subscription_status,
      stripe_customer_id: userEntity.stripe_customer_id,
    };

    // GUARD: Start with existing known tier/status
    let currentTier = userEntity.subscription_tier || "free";
    let currentLevel = userEntity.subscription_level || "free";
    let currentStatus = userEntity.subscription_status || "";
    let stripeCustomerId = userEntity.stripe_customer_id || null;

    const wasEverPaid = currentLevel === "paid" || 
                        currentTier === "premium" || 
                        currentTier === "pro" ||
                        isActiveStatus(currentStatus);

    // Track providers found
    let stripeTier = null;
    let stripeStatus = null;
    let appleTier = null;
    let appleStatus = null;

    // === STRIPE RECOVERY ===
    // If stripe_customer_id missing OR tier/status empty -> try recovery
    const needsStripeRecovery = !stripeCustomerId || 
                                 !currentTier || 
                                 currentTier === "free" ||
                                 !isActiveStatus(currentStatus);

    if (needsStripeRecovery) {
      try {
        const stripe = getStripeClient();

        // Find customer by email
        let customer = null;
        try {
          const searchResults = await stripe.customers.search({
            query: `email:'${email}'`,
            limit: 1,
          });
          customer = searchResults.data?.[0];
        } catch {
          const customers = await stripe.customers.list({ email, limit: 1 });
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
            // Pick best: active/trialing first, else latest
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
        console.warn("[reconcileEntitlementsOnLogin] Stripe recovery failed:", safeStripeError(e));
      }
    } else {
      // Already have Stripe data - use it
      if (isActiveStatus(currentStatus)) {
        stripeTier = currentTier;
        stripeStatus = currentStatus;
      }
    }

    // === APPLE CHECK ===
    // Check for Apple subscription records
    try {
      const appleSubs = await base44.asServiceRole.entities.Subscription.filter({
        user_id: authUser.id,
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
      console.warn("[reconcileEntitlementsOnLogin] Apple check failed:", e);
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
      // GUARD: Don't downgrade to free if user was previously paid
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
      last_login_platform: platform,
      subscription_tier: finalTier,
      subscription_level: finalLevel,
      subscription_status: finalStatus,
    };

    // Only set platform if it's currently empty (don't overwrite original platform)
    if (!userEntity.platform) {
      updates.platform = platform;
    }

    // GUARD: Never blank stripe_customer_id once set
    if (stripeCustomerId && !userEntity.stripe_customer_id) {
      updates.stripe_customer_id = stripeCustomerId;
    }

    await base44.asServiceRole.entities.User.update(userEntity.id, updates);

    const after = {
      platform: updates.platform || userEntity.platform,
      last_login_platform: platform,
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
      reconciled: true,
    });

  } catch (error: any) {
    console.error("[reconcileEntitlementsOnLogin] error:", error);
    return Response.json({
      ok: false,
      error: "RECONCILE_FAILED",
      message: String(error?.message || error),
    }, { status: 500 });
  }
});