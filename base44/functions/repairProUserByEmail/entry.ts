// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeClient, safeStripeError, stripeSanityCheck } from "./_utils/stripe.js";

const PRICE_ID_PRO_MONTHLY = (Deno.env.get("STRIPE_PRICE_ID_PRO_MONTHLY") || "").trim();
const PRICE_ID_PRO_ANNUAL = (Deno.env.get("STRIPE_PRICE_ID_PRO_ANNUAL") || "").trim();

// All known paid plan price IDs (per-module and bundle keys)
function getKnownPaidPriceIds() {
  const vars = [
    "STRIPE_PRICE_ID_PRO_MONTHLY", "STRIPE_PRICE_ID_PRO_ANNUAL",
    "VITE_STRIPE_PIPEKEEPER_MONTHLY", "VITE_STRIPE_PIPEKEEPER_ANNUAL",
    "VITE_STRIPE_WHISKEYKEEPER_MONTHLY", "VITE_STRIPE_WHISKEYKEEPER_ANNUAL",
    "VITE_STRIPE_CIGARKEEPER_MONTHLY", "VITE_STRIPE_CIGARKEEPER_ANNUAL",
    "VITE_STRIPE_WINEKEEPER_MONTHLY", "VITE_STRIPE_WINEKEEPER_ANNUAL",
    "VITE_STRIPE_FOUNDERS_MONTHLY", "VITE_STRIPE_FOUNDERS_ANNUAL",
    "VITE_STRIPE_THREE_BUNDLE_MONTHLY", "VITE_STRIPE_THREE_BUNDLE_ANNUAL",
    "VITE_STRIPE_FOUR_BUNDLE_MONTHLY", "VITE_STRIPE_FOUR_BUNDLE_ANNUAL",
  ];
  return new Set(vars.map(v => (Deno.env.get(v) || "").trim()).filter(Boolean));
}

// Derive which modules the plan covers from the plan key or price lookup key
function modulesFromPlanKey(planKey: string): string[] {
  const key = String(planKey || "").toLowerCase();
  if (key.startsWith("pipekeeper_")) return ["pipekeeper"];
  if (key.startsWith("whiskeykeeper_")) return ["whiskeykeeper"];
  if (key.startsWith("cigarkeeper_")) return ["cigarkeeper"];
  if (key.startsWith("winekeeper_")) return ["winekeeper"];
  if (key.includes("four_module")) return ["pipekeeper", "whiskeykeeper", "cigarkeeper", "winekeeper"];
  if (key.includes("three_module")) return ["pipekeeper", "whiskeykeeper", "cigarkeeper"];
  if (key.includes("founders")) return ["pipekeeper", "whiskeykeeper"];
  return ["pipekeeper"]; // safe default: at minimum grant pipekeeper access
}

const normEmail = (email) => String(email || "").trim().toLowerCase();

async function isProSubscription(stripeSub, stripe) {
  try {
    const metadataTier = (stripeSub.metadata?.tier || "").toLowerCase();
    if (metadataTier === "pro") return true;
    if (metadataTier === "premium") return false;

    const priceId = stripeSub.items?.data?.[0]?.price?.id;
    if (!priceId) return false;

    // Check against all known paid price IDs (legacy and modern per-module)
    const knownPaidIds = getKnownPaidPriceIds();
    if (knownPaidIds.has(priceId)) return true;

    const price = await stripe.prices.retrieve(priceId);

    const lookupKey = (price.lookup_key || "").toLowerCase();
    if (lookupKey.includes("pro") || lookupKey.includes("pipekeeper") ||
        lookupKey.includes("whiskeykeeper") || lookupKey.includes("founders") ||
        lookupKey.includes("bundle")) return true;

    const nickname = (price.nickname || "").toLowerCase();
    if (nickname.includes("pro") || nickname.includes("pipekeeper") ||
        nickname.includes("whiskeykeeper")) return true;

    const productId = typeof price.product === "string" ? price.product : price.product?.id;
    if (productId) {
      const product = await stripe.products.retrieve(productId);

      const productMetadataTier = (product.metadata?.tier || "").toLowerCase();
      if (productMetadataTier === "pro") return true;

      const productName = (product.name || "").toLowerCase();
      if (productName.includes("pro") || productName.includes("pipekeeper") ||
          productName.includes("whiskeykeeper") || productName.includes("founders") ||
          productName.includes("bundle")) return true;
    }

    return false;
  } catch (err) {
    console.error(`[isProSubscription] Failed:`, err.message);
    return false;
  }
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json({
        ok: false,
        error: "METHOD_NOT_ALLOWED",
        message: "Only POST requests are allowed"
      }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();

    if (me?.role !== "admin") {
      return Response.json({
        ok: false,
        error: "FORBIDDEN",
        message: "Admin access required"
      }, { status: 403 });
    }

    let stripe;
    try {
      stripe = getStripeClient();
      await stripeSanityCheck(stripe);
    } catch (e) {
      console.error("[repairProUserByEmail] Stripe init failed:", e);
      return Response.json({
        ok: false,
        error: "STRIPE_INIT_FAILED",
        message: safeStripeError(e),
      }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const email = normEmail(body.email || "");
    const dryRun = body.dryRun !== false;

    if (!email) {
      return Response.json({
        ok: false,
        error: "EMAIL_REQUIRED",
        message: "Email is required"
      }, { status: 400 });
    }

    console.log(`[repairProUserByEmail] Processing: ${email}, dryRun=${dryRun}`);

    // 1. Find Stripe customer
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

    if (!customer) {
      return Response.json({
        ok: false,
        error: "NOT_FOUND",
        message: `No Stripe customer found for ${email}`
      });
    }

    console.log(`[repairProUserByEmail] Found Stripe customer: ${customer.id}`);

    // 2. Get subscriptions for customer
    let subscriptions;
    try {
      subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: "all",
        limit: 10,
        expand: ["data.items.data.price.product", "data.items.data.price"]
      });
    } catch (e) {
      return Response.json({
        ok: false,
        error: "STRIPE_LOOKUP_FAILED",
        message: `Failed to lookup subscriptions: ${safeStripeError(e)}`,
      }, { status: 500 });
    }

    if (subscriptions.data.length === 0) {
      return Response.json({
        ok: false,
        error: "NO_SUBSCRIPTIONS",
        message: `Customer ${customer.id} has no subscriptions`
      });
    }

    // 3. Choose subscription (prefer active/trialing)
    const activeOrTrialing = subscriptions.data.find(s => s.status === "active" || s.status === "trialing");
    const stripeSub = activeOrTrialing || subscriptions.data[0];

    console.log(`[repairProUserByEmail] Using subscription: ${stripeSub.id}, status: ${stripeSub.status}`);

    // 4. Verify this is a Pro subscription
    const isPro = await isProSubscription(stripeSub, stripe);
    if (!isPro) {
      return Response.json({
        ok: false,
        error: "NOT_PRO_SUBSCRIPTION",
        message: `Subscription ${stripeSub.id} is not a Pro tier subscription`,
        subscription_id: stripeSub.id,
        status: stripeSub.status,
      });
    }

    // 5. Find local user
    const userRows = await base44.asServiceRole.entities.User.filter({ email });
    const userRow = userRows?.[0];

    if (!userRow) {
      return Response.json({
        ok: false,
        error: "USER_NOT_FOUND",
        message: `No local User entity found for ${email}`
      });
    }

    console.log(`[repairProUserByEmail] Found local user: ${userRow.id}, current tier=${userRow.subscription_tier}`);

    const isPaid = stripeSub.status === "active" || stripeSub.status === "trialing";

    // Determine which modules this subscription covers
    const priceId = stripeSub.items?.data?.[0]?.price?.id || null;
    let planKey: string | null = null;
    try {
      const price = await stripe.prices.retrieve(priceId || "");
      planKey = price.lookup_key || null;
    } catch { /* planKey stays null */ }
    const activeModules = modulesFromPlanKey(planKey || "");
    const pipekeeper_paid = activeModules.includes("pipekeeper");
    const whiskeykeeper_paid = activeModules.includes("whiskeykeeper");

    const userPayload = {
      // Canonical entitlement field — primary source checked by getEntitlementTier
      entitlement_tier: "pro",
      // Per-module paid flags — checked by checkFreeTierLimit and isModulePaid
      pipekeeper_paid,
      whiskeykeeper_paid,
      paid_modules_csv: activeModules.join(","),
      has_paid_access: isPaid,
      // Legacy fields kept for backward compatibility
      subscription_level: isPaid ? "paid" : "free",
      subscription_status: stripeSub.status,
      subscription_tier: "pro",
      stripe_customer_id: customer.id,
      subscription_provider: "stripe",
      updated_date: new Date().toISOString(),
    };

    // 6. Find or create local Subscription
    let localSub = null;
    if (userRow.id) {
      const byUserId = await base44.asServiceRole.entities.Subscription.filter({
        user_id: userRow.id,
        provider: "stripe"
      });
      localSub = byUserId?.[0];
    }
    if (!localSub) {
      const byEmail = await base44.asServiceRole.entities.Subscription.filter({
        user_email: email,
        provider: "stripe"
      });
      localSub = byEmail?.[0];
    }

    const subscriptionPayload = {
      user_id: userRow.id,
      user_email: email,
      provider: "stripe",
      provider_subscription_id: stripeSub.id,
      stripe_subscription_id: stripeSub.id,
      stripe_customer_id: customer.id,
      status: stripeSub.status,
      tier: "pro",
      planKey,
      modules_csv: activeModules.join(","),
      primary_module: activeModules[0] || null,
      current_period_start: stripeSub.current_period_start
        ? new Date(stripeSub.current_period_start * 1000).toISOString()
        : null,
      current_period_end: stripeSub.current_period_end
        ? new Date(stripeSub.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: !!stripeSub.cancel_at_period_end,
      billing_interval: stripeSub.items?.data?.[0]?.price?.recurring?.interval || "year",
      amount: stripeSub.items?.data?.[0]?.price?.unit_amount
        ? stripeSub.items.data[0].price.unit_amount / 100
        : null,
      updated_date: new Date().toISOString(),
    };

    const before = {
      subscription_tier: userRow.subscription_tier,
      subscription_level: userRow.subscription_level,
      subscription_status: userRow.subscription_status,
    };

    if (!dryRun) {
      if (localSub) {
        await base44.asServiceRole.entities.Subscription.update(localSub.id, subscriptionPayload);
        console.log(`[repairProUserByEmail] Updated subscription: ${localSub.id}`);
      } else {
        const newSub = await base44.asServiceRole.entities.Subscription.create(subscriptionPayload);
        console.log(`[repairProUserByEmail] Created subscription: ${newSub.id}`);
      }

      await base44.asServiceRole.entities.User.update(userRow.id, userPayload);
      console.log(`[repairProUserByEmail] Updated user ${userRow.id} to Pro tier`);
    } else {
      console.log(`[repairProUserByEmail] Dry run - no changes applied`);
    }

    return Response.json({
      ok: true,
      email,
      stripe_customer_id: customer.id,
      stripe_subscription_id: stripeSub.id,
      tier: "pro",
      status: stripeSub.status,
      applied: !dryRun,
      action: localSub ? "updated" : "created",
      before,
      after: userPayload,
    });
  } catch (error) {
    console.error("[repairProUserByEmail] error:", error);
    return Response.json({
      ok: false,
      error: "FUNCTION_ERROR",
      message: safeStripeError(error)
    }, { status: 500 });
  }
});