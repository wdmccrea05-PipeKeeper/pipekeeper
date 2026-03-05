import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import Stripe from "npm:stripe@17.5.0";

const normEmail = (email) => String(email || "").trim().toLowerCase();

function isActiveStatus(status) {
  return ["active", "trialing", "trial"].includes((status || "").toLowerCase());
}

function getTierPriority(tier) {
  const t = (tier || "").toLowerCase();
  if (t === "pro") return 3;
  if (t === "premium") return 2;
  return 1;
}

async function reconcileUserEntitlements(base44, user) {
  const email = normEmail(user.email);
  let currentTier = user.subscription_tier || "free";
  let currentLevel = user.subscription_level || "free";
  let currentStatus = user.subscription_status || "";
  let stripeCustomerId = user.stripe_customer_id || null;

  const wasEverPaid = currentLevel === "paid" || currentTier === "premium" || currentTier === "pro" || isActiveStatus(currentStatus);

  let stripeTier = null;
  let stripeStatus = null;
  let appleTier = null;
  let appleStatus = null;

  // === STRIPE RECOVERY ===
  const needsStripeRecovery = !stripeCustomerId || !currentTier || currentTier === "free" || !isActiveStatus(currentStatus);

  if (needsStripeRecovery) {
    try {
      const stripeKey = (Deno.env.get("STRIPE_SECRET_KEY") || "").trim();
      if (stripeKey && (stripeKey.startsWith("sk_live_") || stripeKey.startsWith("sk_test_"))) {
        const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

        let customer = null;
        try {
          const searchResults = await stripe.customers.search({ query: `email:'${email}'`, limit: 1 });
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
            const activeSub = subsResponse.data.find(s => s.status === "active" || s.status === "trialing");
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
      console.warn("[reconcileUserEntitlements] Stripe recovery failed:", e?.message || e);
    }
  } else {
    if (isActiveStatus(currentStatus)) {
      stripeTier = currentTier;
      stripeStatus = currentStatus;
    }
  }

  // === APPLE CHECK ===
  try {
    const appleSubs = await base44.asServiceRole.entities.Subscription.filter({ user_email: email, provider: "apple" });
    if (Array.isArray(appleSubs) && appleSubs.length > 0) {
      const activeSub = appleSubs.find(s => s && isActiveStatus(s.status));
      const bestSub = activeSub || appleSubs[0];
      if (bestSub) {
        appleStatus = bestSub.status;
        if (isActiveStatus(bestSub.status)) appleTier = bestSub.tier || "premium";
      }
    }
  } catch (e) {
    console.warn("[reconcileUserEntitlements] Apple check failed:", e?.message || e);
  }

  // === RESOLVE FINAL TIER ===
  let finalTier = "free";
  let finalStatus = "";
  let providerUsed = "none";

  const stripeActive = stripeTier && isActiveStatus(stripeStatus);
  const appleActive = appleTier && isActiveStatus(appleStatus);

  if (stripeActive && appleActive) {
    if (getTierPriority(stripeTier) >= getTierPriority(appleTier)) {
      finalTier = stripeTier; finalStatus = stripeStatus; providerUsed = "stripe";
    } else {
      finalTier = appleTier; finalStatus = appleStatus; providerUsed = "apple";
    }
  } else if (stripeActive) {
    finalTier = stripeTier; finalStatus = stripeStatus; providerUsed = "stripe";
  } else if (appleActive) {
    finalTier = appleTier; finalStatus = appleStatus; providerUsed = "apple";
  } else {
    if (wasEverPaid) {
      finalTier = currentTier; finalStatus = currentStatus; providerUsed = "preserved";
    } else {
      finalTier = "free"; finalStatus = "inactive"; providerUsed = "none";
    }
  }

  const finalLevel = finalTier === "free" ? "free" : "paid";
  const changed = finalTier !== currentTier || finalLevel !== currentLevel || finalStatus !== currentStatus || (stripeCustomerId && !user.stripe_customer_id);

  console.log(`[reconcileUserEntitlements] ${email}: tier=${currentTier}→${finalTier}, level=${currentLevel}→${finalLevel}, provider=${providerUsed}`);

  return { finalTier, finalLevel, finalStatus, stripeCustomerId, providerUsed, changed };
}

Deno.serve(async (req) => {
  try {
    let body = {};
    try { body = await req.json(); } catch { body = {}; }

    const platform = body.platform || "web";

    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me().catch((err) => {
      console.error('[reconcileEntitlementsOnLogin] Auth check failed:', err.message);
      return null;
    });

    if (!authUser?.id || !authUser?.email) {
      return Response.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const email = normEmail(authUser.email);

    let userEntity;
    try {
      userEntity = await base44.asServiceRole.entities.User.get(authUser.id);
    } catch {
      const users = await base44.asServiceRole.entities.User.filter({ email });
      userEntity = users?.[0];
    }

    if (!userEntity) {
      return Response.json({ ok: false, error: "USER_NOT_FOUND" }, { status: 404 });
    }

    const before = {
      platform: userEntity.platform,
      last_login_platform: userEntity.last_login_platform,
      subscription_tier: userEntity.subscription_tier,
      subscription_level: userEntity.subscription_level,
      subscription_status: userEntity.subscription_status,
      stripe_customer_id: userEntity.stripe_customer_id,
    };

    const result = await reconcileUserEntitlements(base44, userEntity);
    const { finalTier, finalLevel, finalStatus, stripeCustomerId, providerUsed } = result;

    // Write all canonical fields including flat entitlement_tier and nested data.*
    const updates = {
      last_login_platform: platform,
      subscription_tier: finalTier,
      subscription_level: finalLevel,
      subscription_status: finalStatus,
      entitlement_tier: finalTier,
      data: {
        ...(userEntity.data || {}),
        entitlement_tier: finalTier,
        subscription_tier: finalTier,
        subscription_level: finalLevel,
        subscription_status: finalStatus,
      },
    };

    if (!userEntity.platform) updates.platform = platform;
    if (stripeCustomerId && !userEntity.stripe_customer_id) updates.stripe_customer_id = stripeCustomerId;

    await base44.asServiceRole.entities.User.update(userEntity.id, updates);

    return Response.json({
      ok: true,
      before,
      after: {
        platform: updates.platform || userEntity.platform,
        last_login_platform: platform,
        subscription_tier: finalTier,
        subscription_level: finalLevel,
        subscription_status: finalStatus,
        stripe_customer_id: stripeCustomerId || userEntity.stripe_customer_id,
      },
      providerUsed,
      reconciled: true,
    });

  } catch (error) {
    console.error("[reconcileEntitlementsOnLogin] error:", error);
    return Response.json({ ok: false, error: "RECONCILE_FAILED", message: String(error?.message || error) }, { status: 500 });
  }
});