// Repair entitlements for a single user by email - admin only
// NO LOCAL IMPORTS: reconciliation logic inlined
import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";
import Stripe from "npm:stripe@17.5.0";

const normEmail = (email) => String(email || "").trim().toLowerCase();

function getStripe() {
  const key = (Deno.env.get("STRIPE_SECRET_KEY") || "").trim();
  if (!key || !key.startsWith("sk_")) throw new Error("Invalid STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

function isActiveStatus(status) {
  return ["active", "trialing", "trial"].includes((status || "").toLowerCase());
}

function getTierPriority(tier) {
  const t = (tier || "").toLowerCase();
  if (t === "pro") return 3;
  if (t === "premium") return 2;
  return 1;
}

async function reconcileUser(base44, userRow) {
  const email = normEmail(userRow.email);
  const currentTier = userRow.subscription_tier || "free";
  const currentLevel = userRow.subscription_level || "free";
  const currentStatus = userRow.subscription_status || "";
  let stripeCustomerId = userRow.stripe_customer_id || null;

  const wasEverPaid = currentLevel === "paid" || currentTier === "premium" ||
    currentTier === "pro" || isActiveStatus(currentStatus);

  let stripeTier = null, stripeStatus = null;
  let appleTier = null, appleStatus = null;

  // Stripe check
  try {
    const stripe = getStripe();
    let customerId = stripeCustomerId;
    if (!customerId) {
      const customers = await stripe.customers.list({ email, limit: 1 });
      customerId = customers.data?.[0]?.id || null;
    }
    if (customerId) {
      stripeCustomerId = customerId;
      const subs = await stripe.subscriptions.list({
        customer: customerId, status: "all", limit: 10,
        expand: ["data.items.data.price"],
      });
      const activeSub = subs.data?.find(s => s.status === "active" || s.status === "trialing");
      if (activeSub) {
        stripeStatus = activeSub.status;
        const priceId = activeSub.items?.data?.[0]?.price?.id;
        const proMonthly = Deno.env.get("STRIPE_PRICE_ID_PRO_MONTHLY");
        const proAnnual = Deno.env.get("STRIPE_PRICE_ID_PRO_ANNUAL");
        stripeTier = (priceId === proMonthly || priceId === proAnnual) ? "pro" : "premium";
      }
    }
  } catch (e) {
    console.warn(`[repairUserEntitlementByEmail] Stripe check failed:`, e?.message);
  }

  // Apple check
  try {
    const appleSubs = await base44.asServiceRole.entities.Subscription.filter({
      user_id: userRow.id, provider: "apple",
    });
    const activeSub = (appleSubs || []).find(s => isActiveStatus(s.status));
    if (activeSub) { appleStatus = activeSub.status; appleTier = activeSub.tier || "premium"; }
  } catch (e) {
    console.warn(`[repairUserEntitlementByEmail] Apple check failed:`, e?.message);
  }

  // Resolve final tier
  let finalTier = "free", finalStatus = "", providerUsed = "none";
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
  } else if (wasEverPaid) {
    finalTier = currentTier; finalStatus = currentStatus; providerUsed = "preserved";
  } else {
    finalTier = "free"; finalStatus = "inactive"; providerUsed = "none";
  }

  const finalLevel = finalTier === "free" ? "free" : "paid";
  const changed = finalTier !== currentTier || finalLevel !== currentLevel ||
    finalStatus !== currentStatus || (stripeCustomerId && !userRow.stripe_customer_id);

  return { finalTier, finalLevel, finalStatus, stripeCustomerId, providerUsed, changed };
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json({ ok: false, error: "METHOD_NOT_ALLOWED" }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();

    if (me?.role !== "admin") {
      return Response.json({ ok: false, error: "FORBIDDEN", message: "Admin access required" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const email = normEmail(body.email || "");
    const dryRun = body.dryRun !== false;

    if (!email) {
      return Response.json({ ok: false, error: "EMAIL_REQUIRED", message: "Email is required" }, { status: 400 });
    }

    console.log(`[repairUserEntitlementByEmail] Processing: ${email}, dryRun=${dryRun}`);

    const userRows = await base44.asServiceRole.entities.User.filter({ email });
    const userRow = userRows?.[0];

    if (!userRow) {
      return Response.json({ ok: false, error: "USER_NOT_FOUND", message: `No User entity found for ${email}` });
    }

    const before = {
      subscription_tier: userRow.subscription_tier,
      subscription_level: userRow.subscription_level,
      subscription_status: userRow.subscription_status,
      stripe_customer_id: userRow.stripe_customer_id,
    };

    const result = await reconcileUser(base44, userRow);

    if (!result.changed) {
      return Response.json({
        ok: true, email, changed: false,
        message: "User entitlements are already correct",
        before, after: before, provider: result.providerUsed, applied: false,
      });
    }

    const updates = {
      // Canonical entitlement field (primary source of truth)
      entitlement_tier: result.finalTier,
      // Legacy fields kept for backward compatibility
      subscription_tier: result.finalTier,
      subscription_level: result.finalLevel,
      subscription_status: result.finalStatus,
      // Nested data blob sync so all read paths see the same value
      data: {
        ...(userRow.data || {}),
        entitlement_tier: result.finalTier,
        subscription_tier: result.finalTier,
        subscription_level: result.finalLevel,
        subscription_status: result.finalStatus,
      },
    };
    if (result.stripeCustomerId && !userRow.stripe_customer_id) {
      updates.stripe_customer_id = result.stripeCustomerId;
    }

    const after = {
      subscription_tier: result.finalTier,
      subscription_level: result.finalLevel,
      subscription_status: result.finalStatus,
      stripe_customer_id: result.stripeCustomerId || userRow.stripe_customer_id,
    };

    if (!dryRun) {
      await base44.asServiceRole.entities.User.update(userRow.id, updates);
    }

    return Response.json({ ok: true, email, changed: true, applied: !dryRun, provider: result.providerUsed, before, after });
  } catch (error) {
    console.error("[repairUserEntitlementByEmail] error:", error);
    return Response.json({ ok: false, error: "FUNCTION_ERROR", message: String(error?.message || error) }, { status: 500 });
  }
});