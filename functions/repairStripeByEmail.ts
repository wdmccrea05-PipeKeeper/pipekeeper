import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeClient, stripeKeyErrorResponse } from "./_utils/stripe.ts";
import { scanForForbiddenStripeConstructors } from "./_utils/forbidStripeConstructor.ts";

const PRICE_ID_PRO_MONTHLY = (Deno.env.get("STRIPE_PRICE_ID_PRO_MONTHLY") || "").trim();
const PRICE_ID_PRO_ANNUAL = (Deno.env.get("STRIPE_PRICE_ID_PRO_ANNUAL") || "").trim();
const PRICE_ID_PREMIUM_MONTHLY = (Deno.env.get("STRIPE_PRICE_ID_PREMIUM_MONTHLY") || "").trim();
const PRICE_ID_PREMIUM_ANNUAL = (Deno.env.get("STRIPE_PRICE_ID_PREMIUM_ANNUAL") || "").trim();

const normEmail = (email) => String(email || "").trim().toLowerCase();

async function resolveTier(stripeSub, stripe) {
  try {
    const metadataTier = (stripeSub.metadata?.tier || "").toLowerCase();
    if (metadataTier === "pro" || metadataTier === "premium") {
      return metadataTier;
    }

    const priceId = stripeSub.items?.data?.[0]?.price?.id;
    if (priceId) {
      const price = await stripe.prices.retrieve(priceId);
      
      const lookupKey = (price.lookup_key || "").toLowerCase();
      if (lookupKey.includes("pro")) return "pro";
      if (lookupKey.includes("premium")) return "premium";
      
      const nickname = (price.nickname || "").toLowerCase();
      if (nickname.includes("pro")) return "pro";
      if (nickname.includes("premium")) return "premium";
      
      const productId = typeof price.product === "string" ? price.product : price.product?.id;
      if (productId) {
        const product = await stripe.products.retrieve(productId);
        
        const productMetadataTier = (product.metadata?.tier || "").toLowerCase();
        if (productMetadataTier === "pro" || productMetadataTier === "premium") {
          return productMetadataTier;
        }
        
        const productName = (product.name || "").toLowerCase();
        if (productName.includes("pro")) return "pro";
        if (productName.includes("premium")) return "premium";
      }
      
      if (priceId === PRICE_ID_PRO_MONTHLY || priceId === PRICE_ID_PRO_ANNUAL) {
        return "pro";
      }
      if (priceId === PRICE_ID_PREMIUM_MONTHLY || priceId === PRICE_ID_PREMIUM_ANNUAL) {
        return "premium";
      }
    }

    return null;
  } catch (err) {
    console.error(`[resolveTier] Failed:`, err.message);
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();

    if (me?.role !== "admin") {
      return Response.json({ ok: false, error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // Hard fail check: detect forbidden Stripe constructors
    const scan = await scanForForbiddenStripeConstructors();
    if (scan.ok && scan.forbidden.length > 0) {
      return Response.json({
        ok: false,
        error: "FORBIDDEN_STRIPE_CONSTRUCTOR_REMAINING",
        message: "Direct Stripe constructor usage detected. All functions must use getStripeClient() from _utils/stripe.ts",
        files: scan.forbidden,
      }, { status: 500 });
    }

    // Initialize Stripe with validation
    let stripe;
    try {
      stripe = getStripeClient();
    } catch (e) {
      return Response.json(stripeKeyErrorResponse(e), { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const email = normEmail(body.email || "");
    const dryRun = body.dryRun !== false;

    if (!email) {
      return Response.json({ ok: false, error: "EMAIL_REQUIRED" }, { status: 400 });
    }

    // 1. Find Stripe customer
    let customers;
    try {
      customers = await stripe.customers.list({ email, limit: 3 });
    } catch (e) {
      console.error("[repairStripeByEmail] Customer lookup failed:", e.message);
      return Response.json({
        ok: false,
        error: "STRIPE_LOOKUP_FAILED",
        message: `Failed to lookup Stripe customer: ${e.message}`,
      }, { status: 500 });
    }
    
    if (customers.data.length === 0) {
      return Response.json({ 
        ok: false, 
        error: "NOT_FOUND", 
        message: `No Stripe customer found for ${email}` 
      });
    }

    const customer = customers.data[0];

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
      console.error("[repairStripeByEmail] Subscription lookup failed:", e.message);
      return Response.json({
        ok: false,
        error: "STRIPE_LOOKUP_FAILED",
        message: `Failed to lookup subscriptions: ${e.message}`,
      }, { status: 500 });
    }

    if (subscriptions.data.length === 0) {
      return Response.json({
        ok: false,
        error: "NO_SUBSCRIPTIONS",
        message: `Customer ${customer.id} has no subscriptions`
      });
    }

    // 3. Choose subscription
    const activeOrTrialing = subscriptions.data.find(s => s.status === "active" || s.status === "trialing");
    const stripeSub = activeOrTrialing || subscriptions.data[0];

    // 4. Resolve tier
    const tier = await resolveTier(stripeSub, stripe);

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

    // 6. Find or create local Subscription
    let localSub = null;
    
    // Try by user_id first
    if (userRow.id) {
      const byUserId = await base44.asServiceRole.entities.Subscription.filter({
        user_id: userRow.id,
        provider: "stripe"
      });
      localSub = byUserId?.[0];
    }
    
    // Fallback to email
    if (!localSub) {
      const byEmail = await base44.asServiceRole.entities.Subscription.filter({
        user_email: email,
        provider: "stripe"
      });
      localSub = byEmail?.[0];
    }

    const isPaid = stripeSub.status === "active" || stripeSub.status === "trialing";

    const subscriptionPayload = {
      user_id: userRow.id,
      user_email: email,
      provider: "stripe",
      provider_subscription_id: stripeSub.id,
      stripe_subscription_id: stripeSub.id,
      stripe_customer_id: customer.id,
      status: stripeSub.status,
      tier: tier || "premium",
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
    };

    const userPayload = {
      subscription_level: isPaid ? "paid" : "free",
      subscription_status: stripeSub.status,
      subscription_tier: tier || "premium",
      stripe_customer_id: customer.id,
    };

    if (!dryRun) {
      // Apply changes
      if (localSub) {
        await base44.asServiceRole.entities.Subscription.update(localSub.id, subscriptionPayload);
      } else {
        await base44.asServiceRole.entities.Subscription.create(subscriptionPayload);
      }

      await base44.asServiceRole.entities.User.update(userRow.id, userPayload);
    }

    return Response.json({
      ok: true,
      email,
      stripe_customer_id: customer.id,
      stripe_subscription_id: stripeSub.id,
      tier: tier || "premium",
      status: stripeSub.status,
      applied: !dryRun,
      action: localSub ? "updated" : "created",
      diff: {
        subscription: subscriptionPayload,
        user: userPayload
      }
    });
  } catch (error) {
    console.error("[repairStripeByEmail] error:", error);
    const { safeStripeError } = await import("./_utils/stripe.ts");
    return Response.json({ 
      ok: false, 
      error: "FUNCTION_ERROR",
      message: safeStripeError(error)
    }, { status: 500 });
  }
});