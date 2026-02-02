// Verify Stripe subscription and update entitlement
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeClient, safeStripeError } from "./_utils/stripe.ts";

const normEmail = (email) => String(email || "").trim().toLowerCase();

// Price ID to tier mapping
const PRICE_TO_TIER = {};

// Load from env
const PREMIUM_MONTHLY = Deno.env.get("STRIPE_PRICE_ID_PREMIUM_MONTHLY")?.trim();
const PREMIUM_ANNUAL = Deno.env.get("STRIPE_PRICE_ID_PREMIUM_ANNUAL")?.trim();
const PRO_MONTHLY = Deno.env.get("STRIPE_PRICE_ID_PRO_MONTHLY")?.trim();
const PRO_ANNUAL = Deno.env.get("STRIPE_PRICE_ID_PRO_ANNUAL")?.trim();

if (PREMIUM_MONTHLY) PRICE_TO_TIER[PREMIUM_MONTHLY] = "premium";
if (PREMIUM_ANNUAL) PRICE_TO_TIER[PREMIUM_ANNUAL] = "premium";
if (PRO_MONTHLY) PRICE_TO_TIER[PRO_MONTHLY] = "pro";
if (PRO_ANNUAL) PRICE_TO_TIER[PRO_ANNUAL] = "pro";

function determineTierFromPrice(priceId) {
  return PRICE_TO_TIER[priceId] || "premium";
}

Deno.serve(async (req) => {
  console.log("[verifyStripeEntitlement] ========== START ==========");
  console.log("[verifyStripeEntitlement] Timestamp:", new Date().toISOString());

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      console.error("[verifyStripeEntitlement] No authenticated user");
      return Response.json({ ok: false, error: "Unauthorized", needs_support: false }, { status: 401 });
    }

    const userEmail = normEmail(user.email);
    const userId = user.id;

    console.log("[verifyStripeEntitlement] User:", { userId, userEmail });

    // Initialize Stripe
    const stripe = await getStripeClient(req);
    console.log("[verifyStripeEntitlement] Stripe client initialized");

    // Find Stripe customer
    let customerId = user.stripe_customer_id || null;
    console.log("[verifyStripeEntitlement] Initial customerId:", customerId || "(none)");

    if (!customerId) {
      console.log("[verifyStripeEntitlement] Searching Stripe for customer by email...");
      const existingCustomers = await stripe.customers.list({ email: userEmail, limit: 1 });
      customerId = existingCustomers.data?.[0]?.id || null;
      console.log("[verifyStripeEntitlement] Found customer:", customerId || "(none)");
    }

    if (!customerId) {
      console.log("[verifyStripeEntitlement] No Stripe customer found");
      return Response.json({
        ok: true,
        plan: "free",
        status: "none",
        source: "stripe",
        updated: false,
        message: "No Stripe customer found",
      });
    }

    // Find active subscriptions
    console.log("[verifyStripeEntitlement] Fetching subscriptions for customer...");
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });

    console.log("[verifyStripeEntitlement] Found subscriptions:", subscriptions.data.length);

    // Find best active subscription
    const activeStatuses = ["active", "trialing", "past_due"];
    const activeSubs = subscriptions.data.filter((s) => activeStatuses.includes(s.status));

    console.log("[verifyStripeEntitlement] Active subscriptions:", activeSubs.length);

    if (activeSubs.length === 0) {
      console.log("[verifyStripeEntitlement] No active subscriptions");
      
      // Update to free
      try {
        const srv = base44.asServiceRole;
        await srv.entities.Subscription.filter({ user_id: userId }).then(async (subs) => {
          for (const sub of subs || []) {
            await srv.entities.Subscription.update(sub.id, {
              status: "canceled",
              tier: "free",
            });
          }
        });
      } catch (e) {
        console.warn("[verifyStripeEntitlement] Failed to update to free:", e?.message);
      }

      return Response.json({
        ok: true,
        plan: "free",
        status: "none",
        source: "stripe",
        updated: true,
      });
    }

    // Get best subscription
    const sub = activeSubs[0];
    const priceId = sub.items.data[0]?.price?.id || "";
    const tier = determineTierFromPrice(priceId);

    console.log("[verifyStripeEntitlement] Best subscription:", {
      id: sub.id,
      status: sub.status,
      priceId,
      tier,
    });

    // Update subscription entity
    try {
      const srv = base44.asServiceRole;
      
      // Find existing subscription record
      const existingSubs = await srv.entities.Subscription.filter({ user_id: userId });
      
      const subData = {
        user_id: userId,
        user_email: userEmail,
        provider: "stripe",
        provider_subscription_id: sub.id,
        stripe_customer_id: customerId,
        stripe_subscription_id: sub.id,
        status: sub.status,
        tier,
        current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        started_at: new Date(sub.created * 1000).toISOString(),
        subscriptionStartedAt: new Date(sub.created * 1000).toISOString(),
        cancel_at_period_end: sub.cancel_at_period_end || false,
      };

      if (existingSubs?.length > 0) {
        await srv.entities.Subscription.update(existingSubs[0].id, subData);
        console.log("[verifyStripeEntitlement] Updated existing subscription record");
      } else {
        await srv.entities.Subscription.create(subData);
        console.log("[verifyStripeEntitlement] Created new subscription record");
      }

      // Update user stripe_customer_id if missing
      if (!user.stripe_customer_id) {
        try {
          await srv.auth.updateUser(userEmail, { stripe_customer_id: customerId });
          console.log("[verifyStripeEntitlement] Updated user stripe_customer_id");
        } catch (e) {
          console.warn("[verifyStripeEntitlement] Failed to update user:", e?.message);
        }
      }

      console.log("[verifyStripeEntitlement] ========== SUCCESS ==========");

      return Response.json({
        ok: true,
        plan: tier,
        status: sub.status,
        source: "stripe",
        subscription_id: sub.id,
        customer_id: customerId,
        updated: true,
      });
    } catch (dbError) {
      console.error("[verifyStripeEntitlement] Database update failed:", dbError);
      
      return Response.json({
        ok: false,
        error: "Database update failed",
        needs_support: true,
        plan: tier,
        status: sub.status,
        subscription_id: sub.id,
        message: "Found subscription but couldn't update database. Please contact support.",
      }, { status: 500 });
    }
  } catch (error) {
    console.error("[verifyStripeEntitlement] Fatal error:", error);
    
    return Response.json({
      ok: false,
      error: safeStripeError(error),
      needs_support: true,
      message: "Verification failed. Please contact support.",
    }, { status: 500 });
  }
});