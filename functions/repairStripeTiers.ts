import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import Stripe from "npm:stripe@17.5.0";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";
const PRICE_ID_PRO_MONTHLY = (Deno.env.get("STRIPE_PRICE_ID_PRO_MONTHLY") || "").trim();
const PRICE_ID_PRO_ANNUAL = (Deno.env.get("STRIPE_PRICE_ID_PRO_ANNUAL") || "").trim();
const PRICE_ID_PREMIUM_MONTHLY = (Deno.env.get("STRIPE_PRICE_ID_PREMIUM_MONTHLY") || "").trim();
const PRICE_ID_PREMIUM_ANNUAL = (Deno.env.get("STRIPE_PRICE_ID_PREMIUM_ANNUAL") || "").trim();

const normEmail = (email) => String(email || "").trim().toLowerCase();

async function resolveTierFromStripe(stripeSubId, stripe) {
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
    console.error(`[resolveTierFromStripe] Failed for ${stripeSubId}:`, err.message);
    throw err;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();

    // Admin-only
    if (me?.role !== "admin") {
      return Response.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    if (!STRIPE_SECRET_KEY) {
      return Response.json({ ok: false, error: "STRIPE_NOT_CONFIGURED" }, { status: 500 });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-12-18.acacia" });

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun !== false; // Default to true
    const limit = body.limit || 200;

    console.log(`[repairStripeTiers] Starting (dryRun=${dryRun}, limit=${limit})`);

    // Fetch active Stripe subscriptions
    const allSubs = await base44.asServiceRole.entities.Subscription.filter({
      provider: "stripe",
    });

    // Filter to active/trialing or future-dated
    const eligibleSubs = allSubs.filter((sub) => {
      const status = (sub.status || "").toLowerCase();
      if (status === "active" || status === "trialing") return true;
      
      const periodEnd = sub.current_period_end;
      if (periodEnd && new Date(periodEnd) > new Date()) return true;
      
      return false;
    });

    const subsToRepair = eligibleSubs.slice(0, limit);

    const results = {
      scanned: subsToRepair.length,
      updatedSubscriptions: 0,
      updatedUsers: 0,
      unknownTier: 0,
      missingStripeSubscription: 0,
      samples: {
        updated: [],
        unknown: [],
        missing: [],
      },
    };

    for (const sub of subsToRepair) {
      const stripeSubId = sub.provider_subscription_id || sub.stripe_subscription_id;
      if (!stripeSubId) {
        results.missingStripeSubscription++;
        if (results.samples.missing.length < 5) {
          results.samples.missing.push({
            subscription_id: sub.id,
            user_email: sub.user_email,
            reason: "No Stripe subscription ID",
          });
        }
        continue;
      }

      try {
        const resolvedTier = await resolveTierFromStripe(stripeSubId, stripe);

        if (!resolvedTier) {
          results.unknownTier++;
          if (results.samples.unknown.length < 5) {
            results.samples.unknown.push({
              subscription_id: sub.id,
              user_email: sub.user_email,
              stripe_sub_id: stripeSubId,
              current_tier: sub.tier,
              reason: "Could not resolve tier from Stripe",
            });
          }
          continue;
        }

        const needsUpdate = sub.tier !== resolvedTier;
        
        if (needsUpdate) {
          if (!dryRun) {
            // Update subscription tier
            await base44.asServiceRole.entities.Subscription.update(sub.id, {
              tier: resolvedTier,
            });
            results.updatedSubscriptions++;

            // Update user tier - try user_id first, then email
            let userRow = null;
            if (sub.user_id) {
              const byUserId = await base44.asServiceRole.entities.User.filter({
                id: sub.user_id,
              });
              userRow = byUserId?.[0];
            }
            
            if (!userRow && sub.user_email) {
              const byEmail = await base44.asServiceRole.entities.User.filter({
                email: normEmail(sub.user_email),
              });
              userRow = byEmail?.[0];
            }

            if (userRow) {
              const isPaid = sub.status === "active" || sub.status === "trialing";
              await base44.asServiceRole.entities.User.update(userRow.id, {
                subscription_tier: resolvedTier,
                subscription_level: isPaid ? "paid" : "free",
                subscription_status: sub.status,
              });
              results.updatedUsers++;
            }
          } else {
            results.updatedSubscriptions++;
            results.updatedUsers++;
          }

          if (results.samples.updated.length < 10) {
            results.samples.updated.push({
              subscription_id: sub.id,
              user_email: sub.user_email,
              user_id: sub.user_id,
              stripe_sub_id: stripeSubId,
              old_tier: sub.tier,
              new_tier: resolvedTier,
            });
          }
        }
      } catch (err) {
        results.missingStripeSubscription++;
        if (results.samples.missing.length < 5) {
          results.samples.missing.push({
            subscription_id: sub.id,
            user_email: sub.user_email,
            stripe_sub_id: stripeSubId,
            reason: `Stripe API error: ${err.message}`,
          });
        }
      }
    }

    return Response.json({
      ok: true,
      dryRun,
      ...results,
    });
  } catch (error) {
    console.error("[repairStripeTiers] error:", error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});