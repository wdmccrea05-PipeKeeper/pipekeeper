import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import Stripe from "npm:stripe@17.5.0";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";
const PRICE_ID_PRO_MONTHLY = (Deno.env.get("STRIPE_PRICE_ID_PRO_MONTHLY") || "").trim();
const PRICE_ID_PRO_ANNUAL = (Deno.env.get("STRIPE_PRICE_ID_PRO_ANNUAL") || "").trim();
const PRICE_ID_PREMIUM_MONTHLY = (Deno.env.get("STRIPE_PRICE_ID_PREMIUM_MONTHLY") || "").trim();
const PRICE_ID_PREMIUM_ANNUAL = (Deno.env.get("STRIPE_PRICE_ID_PREMIUM_ANNUAL") || "").trim();

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-12-18.acacia" });

async function resolveTier(stripeSubId, stripe) {
  try {
    const sub = await stripe.subscriptions.retrieve(stripeSubId);
    
    // Priority 1: Subscription metadata
    const metadataTier = (sub.metadata?.tier || "").toLowerCase();
    if (metadataTier === "pro" || metadataTier === "premium") {
      return metadataTier;
    }

    // Priority 2: Price lookup_key or nickname
    const priceId = sub.items?.data?.[0]?.price?.id;
    if (priceId) {
      const price = await stripe.prices.retrieve(priceId);
      
      const lookupKey = (price.lookup_key || "").toLowerCase();
      if (lookupKey.includes("pro")) return "pro";
      if (lookupKey.includes("premium")) return "premium";
      
      const nickname = (price.nickname || "").toLowerCase();
      if (nickname.includes("pro")) return "pro";
      if (nickname.includes("premium")) return "premium";
      
      // Priority 3: Product metadata or name
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
      
      // Priority 4: Env-mapped priceId
      if (priceId === PRICE_ID_PRO_MONTHLY || priceId === PRICE_ID_PRO_ANNUAL) {
        return "pro";
      }
      if (priceId === PRICE_ID_PREMIUM_MONTHLY || priceId === PRICE_ID_PREMIUM_ANNUAL) {
        return "premium";
      }
    }

    return null;
  } catch (err) {
    console.error(`[resolveTier] Failed to resolve tier for ${stripeSubId}:`, err.message);
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only
    if (user?.role !== "admin") {
      return Response.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun !== false; // Default to dry run for safety
    const limit = body.limit || 50;

    console.log(`[repairStripeTiers] Starting repair (dryRun=${dryRun}, limit=${limit})`);

    // Fetch active Stripe subscriptions
    const allSubs = await base44.asServiceRole.entities.Subscription.filter({
      provider: "stripe",
    });

    const activeSubs = allSubs.filter((sub) => {
      const status = (sub.status || "").toLowerCase();
      return status === "active" || status === "trialing";
    });

    const subsToRepair = activeSubs.slice(0, limit);

    const results = {
      total: subsToRepair.length,
      repaired: 0,
      skipped: 0,
      errors: 0,
      details: [],
    };

    for (const sub of subsToRepair) {
      try {
        const stripeSubId = sub.provider_subscription_id || sub.stripe_subscription_id;
        if (!stripeSubId) {
          results.skipped++;
          results.details.push({
            subscription_id: sub.id,
            user_email: sub.user_email,
            status: "skipped",
            reason: "No Stripe subscription ID",
          });
          continue;
        }

        const currentTier = sub.tier;
        const resolvedTier = await resolveTier(stripeSubId, stripe);

        if (!resolvedTier) {
          results.skipped++;
          results.details.push({
            subscription_id: sub.id,
            user_email: sub.user_email,
            stripe_sub_id: stripeSubId,
            status: "skipped",
            reason: "Could not resolve tier",
          });
          continue;
        }

        if (currentTier === resolvedTier) {
          results.skipped++;
          results.details.push({
            subscription_id: sub.id,
            user_email: sub.user_email,
            stripe_sub_id: stripeSubId,
            status: "skipped",
            reason: `Tier already correct: ${currentTier}`,
          });
          continue;
        }

        // Update subscription tier
        if (!dryRun) {
          await base44.asServiceRole.entities.Subscription.update(sub.id, {
            tier: resolvedTier,
          });

          // Update user tier
          if (sub.user_email) {
            const users = await base44.asServiceRole.entities.User.filter({
              email: sub.user_email,
            });
            if (users?.length) {
              await base44.asServiceRole.entities.User.update(users[0].id, {
                subscription_tier: resolvedTier,
              });
            }
          }
        }

        results.repaired++;
        results.details.push({
          subscription_id: sub.id,
          user_email: sub.user_email,
          user_id: sub.user_id,
          stripe_sub_id: stripeSubId,
          status: "repaired",
          old_tier: currentTier,
          new_tier: resolvedTier,
          dry_run: dryRun,
        });
      } catch (err) {
        results.errors++;
        results.details.push({
          subscription_id: sub.id,
          user_email: sub.user_email,
          status: "error",
          error: err.message,
        });
      }
    }

    return Response.json({
      ok: true,
      dry_run: dryRun,
      results,
      message: dryRun
        ? "Dry run complete - set dryRun: false to apply changes"
        : "Repair complete",
    });
  } catch (error) {
    console.error("[repairStripeTiers] error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});