import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeClient, getStripeKeyPrefix, stripeKeyErrorResponse, safeStripeError } from "./_utils/stripe.ts";
import { scanForForbiddenStripeConstructors } from "./_utils/forbidStripeConstructor.ts";

const PRICE_ID_PRO_MONTHLY = (Deno.env.get("STRIPE_PRICE_ID_PRO_MONTHLY") || "").trim();
const PRICE_ID_PRO_ANNUAL = (Deno.env.get("STRIPE_PRICE_ID_PRO_ANNUAL") || "").trim();
const PRICE_ID_PREMIUM_MONTHLY = (Deno.env.get("STRIPE_PRICE_ID_PREMIUM_MONTHLY") || "").trim();
const PRICE_ID_PREMIUM_ANNUAL = (Deno.env.get("STRIPE_PRICE_ID_PREMIUM_ANNUAL") || "").trim();

const normEmail = (email) => String(email || "").trim().toLowerCase();

async function resolveTierFromStripe(stripeSub, stripe) {
  try {
    // Priority 1: Subscription metadata
    const metadataTier = (stripeSub.metadata?.tier || "").toLowerCase();
    if (metadataTier === "pro" || metadataTier === "premium") {
      return metadataTier;
    }

    // Priority 2: Price lookup_key or nickname
    const priceId = stripeSub.items?.data?.[0]?.price?.id;
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
    console.error(`[resolveTierFromStripe] Failed:`, err.message);
    throw err;
  }
}

async function findStripeSubscription(localSub, stripe) {
  // Skip Apple subscriptions
  if (localSub.provider === "apple") {
    return { status: "SKIP_APPLE", stripeSub: null };
  }

  // A) Try provider_subscription_id
  if (localSub.provider_subscription_id) {
    try {
      const stripeSub = await stripe.subscriptions.retrieve(localSub.provider_subscription_id);
      return { status: "FOUND_BY_PROVIDER_ID", stripeSub, recoveryMethod: "provider_subscription_id" };
    } catch (err) {
      console.warn(`[findStripeSubscription] Failed to retrieve by provider_subscription_id ${localSub.provider_subscription_id}:`, err.message);
    }
  }

  // B) Try stripe_subscription_id
  if (localSub.stripe_subscription_id) {
    try {
      const stripeSub = await stripe.subscriptions.retrieve(localSub.stripe_subscription_id);
      return { status: "FOUND_BY_STRIPE_ID", stripeSub, recoveryMethod: "stripe_subscription_id" };
    } catch (err) {
      console.warn(`[findStripeSubscription] Failed to retrieve by stripe_subscription_id ${localSub.stripe_subscription_id}:`, err.message);
    }
  }

  // C) Try stripe_customer_id
  if (localSub.stripe_customer_id) {
    try {
      const result = await stripe.subscriptions.list({
        customer: localSub.stripe_customer_id,
        status: "all",
        limit: 10,
        expand: ["data.items.data.price.product", "data.items.data.price"]
      });

      if (result.data.length === 0) {
        return { status: "NO_SUBS_FOR_CUSTOMER", stripeSub: null };
      }

      // Prefer active/trialing, else most recent
      const activeOrTrialing = result.data.find(s => s.status === "active" || s.status === "trialing");
      const stripeSub = activeOrTrialing || result.data[0];

      return { status: "RECOVERED_BY_CUSTOMER", stripeSub, recoveryMethod: "stripe_customer_id" };
    } catch (err) {
      console.error(`[findStripeSubscription] Failed to list by customer ${localSub.stripe_customer_id}:`, err.message);
      return { status: "CUSTOMER_LOOKUP_ERROR", stripeSub: null, error: err.message };
    }
  }

  // D) No Stripe IDs available
  return { status: "NO_STRIPE_IDS", stripeSub: null };
}

Deno.serve(async (req) => {
  const keyPrefix = getStripeKeyPrefix();
  
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();

    // Admin-only
    if (me?.role !== "admin") {
      return Response.json({ 
        ok: false,
        error: "FORBIDDEN",
        message: "Admin access required",
        keyPrefix 
      }, { status: 403 });
    }

    // Hard fail check: detect forbidden Stripe constructors
    const scan = await scanForForbiddenStripeConstructors();
    if (scan.ok && scan.forbidden.length > 0) {
      return Response.json({
        ok: false,
        error: "FORBIDDEN_STRIPE_CONSTRUCTOR_REMAINING",
        message: "Direct Stripe constructor usage detected. All functions must use getStripeClient() from _utils/stripe.ts",
        files: scan.forbidden,
        keyPrefix,
      }, { status: 500 });
    }

    // Initialize Stripe with validation
    let stripe;
    try {
      stripe = getStripeClient();
    } catch (e) {
      const err = stripeKeyErrorResponse(e);
      return Response.json(err, { status: 500 });
    }

    // Sanity check: verify Stripe connection before processing
    try {
      await stripe.balance.retrieve();
    } catch (e) {
      console.error("[repairStripeTiers] Stripe auth failed:", e.message);
      return Response.json({
        ok: false,
        error: "STRIPE_AUTH_FAILED",
        keyPrefix,
        stripeSanityOk: false,
        message: "Could not authenticate with Stripe API. Check STRIPE_SECRET_KEY.",
        details: safeStripeError(e),
      }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun !== false; // Default to true
    const limit = body.limit || 200;

    console.log(`[repairStripeTiers] Starting (dryRun=${dryRun}, limit=${limit})`);

    // Fetch all subscriptions (including those without IDs)
    const allSubs = await base44.asServiceRole.entities.Subscription.list();

    // Filter to Stripe or unknown provider, and eligible status
    const eligibleSubs = allSubs.filter((sub) => {
      // Skip Apple explicitly
      if (sub.provider === "apple") return false;

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
      recoveredByCustomer: 0,
      noStripeIds: 0,
      unknownTier: 0,
      skippedApple: 0,
      missingStripeSubscription: 0,
      samples: {
        updated: [],
        recovered: [],
        unknown: [],
        missing: [],
      },
    };

    for (const localSub of subsToRepair) {
      const lookupResult = await findStripeSubscription(localSub, stripe);

      if (lookupResult.status === "SKIP_APPLE") {
        results.skippedApple++;
        continue;
      }

      if (!lookupResult.stripeSub) {
        if (lookupResult.status === "NO_STRIPE_IDS") {
          results.noStripeIds++;
        } else {
          results.missingStripeSubscription++;
        }
        
        if (results.samples.missing.length < 5) {
          results.samples.missing.push({
            subscription_id: localSub.id,
            user_email: localSub.user_email,
            stripe_customer_id: localSub.stripe_customer_id,
            status: lookupResult.status,
            reason: lookupResult.error || lookupResult.status,
          });
        }
        continue;
      }

      const stripeSub = lookupResult.stripeSub;

      // Backfill missing IDs if recovered by customer
      let needsBackfill = false;
      if (lookupResult.status === "RECOVERED_BY_CUSTOMER") {
        needsBackfill = true;
        results.recoveredByCustomer++;
        
        if (results.samples.recovered.length < 10) {
          results.samples.recovered.push({
            subscription_id: localSub.id,
            user_email: localSub.user_email,
            stripe_customer_id: localSub.stripe_customer_id,
            recovered_stripe_sub_id: stripeSub.id,
            recovery_method: lookupResult.recoveryMethod,
          });
        }
      }

      // Resolve tier
      let resolvedTier = null;
      try {
        resolvedTier = await resolveTierFromStripe(stripeSub, stripe);
      } catch (err) {
        console.error(`[repairStripeTiers] Tier resolution failed for ${stripeSub.id}:`, err.message);
      }

      if (!resolvedTier) {
        // Keep existing tier if we can't resolve
        resolvedTier = localSub.tier || null;
        results.unknownTier++;
        
        if (results.samples.unknown.length < 5) {
          results.samples.unknown.push({
            subscription_id: localSub.id,
            user_email: localSub.user_email,
            stripe_sub_id: stripeSub.id,
            current_tier: localSub.tier,
            reason: "Could not resolve tier from Stripe",
          });
        }
      }

      const needsTierUpdate = localSub.tier !== resolvedTier;
      
      if (needsBackfill || needsTierUpdate) {
        if (!dryRun) {
          // Update subscription
          const updatePayload = {};
          
          if (needsBackfill) {
            updatePayload.provider = "stripe";
            updatePayload.provider_subscription_id = stripeSub.id;
            updatePayload.stripe_subscription_id = stripeSub.id;
            updatePayload.stripe_customer_id = typeof stripeSub.customer === "string" 
              ? stripeSub.customer 
              : stripeSub.customer?.id;
          }
          
          if (needsTierUpdate && resolvedTier) {
            updatePayload.tier = resolvedTier;
          }

          await base44.asServiceRole.entities.Subscription.update(localSub.id, updatePayload);
          results.updatedSubscriptions++;

          // Update user tier
          let userRow = null;
          if (localSub.user_id) {
            const byUserId = await base44.asServiceRole.entities.User.filter({
              id: localSub.user_id,
            });
            userRow = byUserId?.[0];
          }
          
          if (!userRow && localSub.user_email) {
            const byEmail = await base44.asServiceRole.entities.User.filter({
              email: normEmail(localSub.user_email),
            });
            userRow = byEmail?.[0];
          }

          if (userRow && resolvedTier) {
            const isPaid = stripeSub.status === "active" || stripeSub.status === "trialing";
            await base44.asServiceRole.entities.User.update(userRow.id, {
              subscription_tier: resolvedTier,
              subscription_level: isPaid ? "paid" : "free",
              subscription_status: stripeSub.status,
            });
            results.updatedUsers++;
          }
        } else {
          // Dry run counts
          results.updatedSubscriptions++;
          if (resolvedTier) results.updatedUsers++;
        }

        if (results.samples.updated.length < 10) {
          results.samples.updated.push({
            subscription_id: localSub.id,
            user_email: localSub.user_email,
            user_id: localSub.user_id,
            stripe_sub_id: stripeSub.id,
            recovery_method: lookupResult.recoveryMethod,
            old_tier: localSub.tier,
            new_tier: resolvedTier,
            backfilled_ids: needsBackfill,
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
    const { safeStripeError } = await import("./_utils/stripe.ts");
    return Response.json({ 
      ok: false, 
      error: "FUNCTION_ERROR",
      message: safeStripeError(error)
    }, { status: 500 });
  }
});