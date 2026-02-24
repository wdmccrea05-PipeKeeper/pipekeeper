// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeClient, safeStripeError, stripeSanityCheck } from "./_utils/stripe.js";

const PRICE_ID_PRO_MONTHLY = (Deno.env.get("STRIPE_PRICE_ID_PRO_MONTHLY") || "").trim();
const PRICE_ID_PRO_ANNUAL = (Deno.env.get("STRIPE_PRICE_ID_PRO_ANNUAL") || "").trim();

const normEmail = (email: string) => String(email || "").trim().toLowerCase();

async function isProTier(stripeSub: any, stripe: any): Promise<boolean> {
  try {
    const metadataTier = (stripeSub.metadata?.tier || "").toLowerCase();
    if (metadataTier === "pro") return true;
    if (metadataTier === "premium") return false;

    const priceId = stripeSub.items?.data?.[0]?.price?.id;
    if (priceId) {
      if (priceId === PRICE_ID_PRO_MONTHLY || priceId === PRICE_ID_PRO_ANNUAL) {
        return true;
      }

      try {
        const price = await stripe.prices.retrieve(priceId);

        const lookupKey = (price.lookup_key || "").toLowerCase();
        if (lookupKey.includes("pro")) return true;
        if (lookupKey.includes("premium")) return false;

        const nickname = (price.nickname || "").toLowerCase();
        if (nickname.includes("pro")) return true;
        if (nickname.includes("premium")) return false;

        const productId = typeof price.product === "string" ? price.product : price.product?.id;
        if (productId) {
          try {
            const product = await stripe.products.retrieve(productId);

            const productMetadataTier = (product.metadata?.tier || "").toLowerCase();
            if (productMetadataTier === "pro") return true;
            if (productMetadataTier === "premium") return false;

            const productName = (product.name || "").toLowerCase();
            if (productName.includes("pro")) return true;
          } catch (err) {
            console.warn(`[repairProUserByEmail] Failed to retrieve product ${productId}:`, safeStripeError(err));
          }
        }
      } catch (err) {
        console.warn(`[repairProUserByEmail] Failed to retrieve price ${priceId}:`, safeStripeError(err));
      }
    }

    return false;
  } catch (err) {
    console.error(`[repairProUserByEmail] isProTier check failed:`, safeStripeError(err));
    return false;
  }
}

Deno.serve(async (req: Request) => {
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

    let stripe: any;
    try {
      stripe = await getStripeClient(req);
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
    const dryRun = body.dryRun === true;

    if (!email) {
      return Response.json({
        ok: false,
        error: "EMAIL_REQUIRED",
        message: "Email is required"
      }, { status: 400 });
    }

    console.log(`[repairProUserByEmail] Processing: ${email}, dryRun=${dryRun}`);

    // 1. Find local user
    const userRows = await base44.asServiceRole.entities.User.filter({ email });
    const userRow = userRows?.[0];

    if (!userRow) {
      return Response.json({
        ok: false,
        error: "USER_NOT_FOUND",
        message: `No local User entity found for ${email}`
      }, { status: 404 });
    }

    console.log(`[repairProUserByEmail] Found local user: ${userRow.id}`);

    // 2. Find active Stripe subscription via Stripe API
    let customer: any = null;
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
        error: "STRIPE_CUSTOMER_NOT_FOUND",
        message: `No Stripe customer found for ${email}`
      }, { status: 404 });
    }

    console.log(`[repairProUserByEmail] Found Stripe customer: ${customer.id}`);

    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 10,
      expand: ["data.items.data.price.product", "data.items.data.price"]
    });

    const stripeSub = subscriptions.data.find(
      (s: any) => s.status === "active" || s.status === "trialing"
    );

    if (!stripeSub) {
      return Response.json({
        ok: false,
        error: "NO_ACTIVE_SUBSCRIPTION",
        message: `No active Stripe subscription found for ${email}`
      }, { status: 404 });
    }

    console.log(`[repairProUserByEmail] Using subscription: ${stripeSub.id}, status: ${stripeSub.status}`);

    // 3. Verify this is a Pro tier subscription
    const priceId = stripeSub.items?.data?.[0]?.price?.id;
    const proTier = await isProTier(stripeSub, stripe);

    if (!proTier) {
      return Response.json({
        ok: false,
        error: "NOT_PRO_TIER",
        message: "Subscription is not Pro tier",
        price_id: priceId,
        stripe_subscription_id: stripeSub.id,
        stripe_status: stripeSub.status
      });
    }

    // 4. Find local Subscription entity
    let localSub: any = null;

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

    const previousTier = localSub?.tier ?? userRow.subscription_tier;
    const needsUpdate = localSub?.tier !== "pro" || userRow.subscription_tier !== "pro";

    // 5. Apply updates
    if (needsUpdate && !dryRun) {
      if (localSub) {
        await base44.asServiceRole.entities.Subscription.update(localSub.id, { tier: "pro" });
        console.log(`[repairProUserByEmail] Updated Subscription ${localSub.id} tier → "pro"`);
      }

      await base44.asServiceRole.entities.User.update(userRow.id, { subscription_tier: "pro" });
      console.log(`✅ REPAIRED: ${email} tier updated to "pro"`);
    } else if (!needsUpdate) {
      console.log(`[repairProUserByEmail] No update needed - tier already "pro" for ${email}`);
    } else {
      console.log(`[repairProUserByEmail] Dry run - no changes applied`);
    }

    return Response.json({
      ok: true,
      email,
      user_id: userRow.id,
      subscription_id: localSub?.id ?? null,
      stripe_subscription_id: stripeSub.id,
      price_id: priceId,
      previous_tier: previousTier,
      new_tier: "pro",
      updated: !dryRun && needsUpdate,
      dryRun
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
