// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import Stripe from "npm:stripe@17.5.0";

const normEmail = (email) => String(email || "").trim().toLowerCase();

function isActiveStatus(status) {
  const activeStatuses = ["active", "trialing", "trial"];
  return activeStatuses.includes((status || "").toLowerCase());
}

function getTierPriority(tier) {
  const t = (tier || "").toLowerCase();
  if (t === "pro") return 3;
  if (t === "premium") return 2;
  return 1;
}

function safeStripeError(e) {
  if (!e) return "Unknown Stripe error";
  if (typeof e === "string") return e;
  if (e.message) return e.message;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

async function reconcileUserEntitlements(base44, user, options = {}) {
  const email = normEmail(user.email);
  
  console.log(`[reconcileUserEntitlements] Start: ${email}, forceStripeCheck=${options.forceStripeCheck}`);
  
  let currentTier = user.subscription_tier || "free";
  let currentLevel = user.subscription_level || "free";
  let currentStatus = user.subscription_status || "";
  let stripeCustomerId = user.stripe_customer_id || null;

  const wasEverPaid = currentLevel === "paid" || 
                      currentTier === "premium" || 
                      currentTier === "pro" ||
                      isActiveStatus(currentStatus);

  let stripeTier = null;
  let stripeStatus = null;
  let appleTier = null;
  let appleStatus = null;

  const needsStripeRecovery = options.forceStripeCheck || 
                               !stripeCustomerId || 
                               !currentTier || 
                               currentTier === "free" ||
                               !isActiveStatus(currentStatus);

  if (needsStripeRecovery) {
    try {
      const key = Deno.env.get("STRIPE_SECRET_KEY") || "";
      if (key && key.startsWith("sk_")) {
        const stripe = new Stripe(key, { apiVersion: "2024-06-20" });
        
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

          const subsResponse = await stripe.subscriptions.list({
            customer: customer.id,
            status: "all",
            limit: 10,
            expand: ["data.items.data.price"],
          });

          if (subsResponse.data?.length > 0) {
            const activeSub = subsResponse.data.find((s) => 
              s.status === "active" || s.status === "trialing"
            );
            const bestSub = activeSub || subsResponse.data[0];

            stripeStatus = bestSub.status;

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
      }
    } catch (e) {
      console.warn("[reconcileUserEntitlements] Stripe recovery failed:", safeStripeError(e));
    }
  } else {
    if (isActiveStatus(currentStatus)) {
      stripeTier = currentTier;
      stripeStatus = currentStatus;
    }
  }

  try {
    const appleSubs = await base44.asServiceRole.entities.Subscription.filter({
      user_email: email,
      provider: "apple",
    });

    if (Array.isArray(appleSubs) && appleSubs.length > 0) {
      const activeSub = appleSubs.find((s) => s && isActiveStatus(s.status));
      const bestSub = activeSub || appleSubs[0];

      if (bestSub) {
        appleStatus = bestSub.status;
        if (isActiveStatus(bestSub.status)) {
          appleTier = bestSub.tier || "premium";
        }
      }
    }
  } catch (e) {
    console.warn("[reconcileUserEntitlements] Apple check failed:", e);
  }

  let finalTier = "free";
  let finalStatus = "";
  let providerUsed = "none";

  const stripeActive = stripeTier && isActiveStatus(stripeStatus);
  const appleActive = appleTier && isActiveStatus(appleStatus);

  if (stripeActive && appleActive) {
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

  const changed = 
    finalTier !== currentTier ||
    finalLevel !== currentLevel ||
    finalStatus !== currentStatus ||
    (stripeCustomerId && !user.stripe_customer_id);

  console.log(`[reconcileUserEntitlements] Complete: ${email}, tier=${currentTier}→${finalTier}, level=${currentLevel}→${finalLevel}, changed=${changed}, provider=${providerUsed}`);

  return {
    finalTier,
    finalLevel,
    finalStatus,
    stripeCustomerId,
    providerUsed,
    changed,
  };
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

    // Run reconciliation
    const result = await reconcileUserEntitlements(base44, userEntity, { req });

    const finalTier = result.finalTier;
    const finalLevel = result.finalLevel;
    const finalStatus = result.finalStatus;
    const stripeCustomerId = result.stripeCustomerId;
    const providerUsed = result.providerUsed;

    // === UPDATE USER ENTITY ===
    const updates = {
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

  } catch (error) {
    console.error("[reconcileEntitlementsOnLogin] error:", error);
    return Response.json({
      ok: false,
      error: "RECONCILE_FAILED",
      message: String(error?.message || error),
    }, { status: 500 });
  }
});