// Repair Stripe subscription tiers from live data
// Updated: 2026-02-05
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeClient, safeStripeError } from "./_utils/stripeClient.ts";

const PRICE_ID_PRO_MONTHLY = (Deno.env.get("STRIPE_PRICE_ID_PRO_MONTHLY") || "").trim();
const PRICE_ID_PRO_ANNUAL = (Deno.env.get("STRIPE_PRICE_ID_PRO_ANNUAL") || "").trim();
const PRICE_ID_PREMIUM_MONTHLY = (Deno.env.get("STRIPE_PRICE_ID_PREMIUM_MONTHLY") || "").trim();
const PRICE_ID_PREMIUM_ANNUAL = (Deno.env.get("STRIPE_PRICE_ID_PREMIUM_ANNUAL") || "").trim();

const normEmail = (email: string) => String(email || "").trim().toLowerCase();

// Canonical price ID → planKey map from env vars
function buildPriceIdToPlanKeyMap(): Record<string, string> {
  const e = Deno.env;
  return {
    [e.get("VITE_STRIPE_PIPEKEEPER_MONTHLY") || ""]:    "pipekeeper_pro_monthly",
    [e.get("VITE_STRIPE_PIPEKEEPER_ANNUAL") || ""]:     "pipekeeper_pro_annual",
    [e.get("VITE_STRIPE_WHISKEYKEEPER_MONTHLY") || ""]: "whiskeykeeper_pro_monthly",
    [e.get("VITE_STRIPE_WHISKEYKEEPER_ANNUAL") || ""]:  "whiskeykeeper_pro_annual",
    [e.get("VITE_STRIPE_CIGARKEEPER_MONTHLY") || ""]:   "cigarkeeper_pro_monthly",
    [e.get("VITE_STRIPE_CIGARKEEPER_ANNUAL") || ""]:    "cigarkeeper_pro_annual",
    [e.get("VITE_STRIPE_WINEKEEPER_MONTHLY") || ""]:    "winekeeper_pro_monthly",
    [e.get("VITE_STRIPE_WINEKEEPER_ANNUAL") || ""]:     "winekeeper_pro_annual",
    [e.get("VITE_STRIPE_THREE_BUNDLE_MONTHLY") || ""]:  "three_module_bundle_monthly",
    [e.get("VITE_STRIPE_THREE_BUNDLE_ANNUAL") || ""]:   "three_module_bundle_annual",
    [e.get("VITE_STRIPE_FOUR_BUNDLE_MONTHLY") || ""]:   "four_module_bundle_monthly",
    [e.get("VITE_STRIPE_FOUR_BUNDLE_ANNUAL") || ""]:    "four_module_bundle_annual",
    [e.get("VITE_STRIPE_FOUNDERS_MONTHLY") || ""]:      "founders_bundle_monthly",
    [e.get("VITE_STRIPE_FOUNDERS_ANNUAL") || ""]:       "founders_bundle_annual",
  };
}

// Resolve modules from planKey. Founders = PK+WK (2 modules), NOT 4.
function modulesFromPlanKey(planKey: string): string[] {
  const key = String(planKey || "").toLowerCase();
  if (key.startsWith("pipekeeper_"))    return ["pipekeeper"];
  if (key.startsWith("whiskeykeeper_")) return ["whiskeykeeper"];
  if (key.startsWith("cigarkeeper_"))   return ["cigarkeeper"];
  if (key.startsWith("winekeeper_"))    return ["winekeeper"];
  if (key.includes("three_module"))     return ["pipekeeper", "whiskeykeeper", "cigarkeeper"];
  if (key.includes("four_module"))      return ["pipekeeper", "whiskeykeeper", "cigarkeeper", "winekeeper"];
  if (key.includes("founders"))         return ["pipekeeper", "whiskeykeeper"]; // 2 modules, NOT 4
  return [];
}

async function resolveTierFromStripe(stripeSub: any, stripe: any) {
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
  } catch (err: any) {
    console.error(`[resolveTierFromStripe] Failed:`, err.message);
    throw err;
  }
}

async function findStripeSubscriptionWithEmailRecovery(localSub: any, stripe: any) {
  // Skip Apple subscriptions
  if (localSub.provider === "apple") {
    return { status: "SKIP_APPLE", stripeSub: null, customer: null };
  }

  // A) Try provider_subscription_id
  if (localSub.provider_subscription_id) {
    try {
      const stripeSub = await stripe.subscriptions.retrieve(localSub.provider_subscription_id, {
        expand: ["items.data.price.product", "items.data.price"]
      });
      return { status: "FOUND_BY_PROVIDER_ID", stripeSub, recoveryMethod: "provider_subscription_id", customer: null };
    } catch (err: any) {
      console.warn(`[findStripeSubscription] Failed to retrieve by provider_subscription_id:`, err.message);
    }
  }

  // B) Try stripe_subscription_id
  if (localSub.stripe_subscription_id) {
    try {
      const stripeSub = await stripe.subscriptions.retrieve(localSub.stripe_subscription_id, {
        expand: ["items.data.price.product", "items.data.price"]
      });
      return { status: "FOUND_BY_STRIPE_ID", stripeSub, recoveryMethod: "stripe_subscription_id", customer: null };
    } catch (err: any) {
      console.warn(`[findStripeSubscription] Failed to retrieve by stripe_subscription_id:`, err.message);
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
        return { status: "NO_SUBS_FOR_CUSTOMER", stripeSub: null, customer: null };
      }

      // Prefer active/trialing, else most recent
      const activeOrTrialing = result.data.find((s: any) => s.status === "active" || s.status === "trialing");
      const stripeSub = activeOrTrialing || result.data[0];

      return { status: "RECOVERED_BY_CUSTOMER", stripeSub, recoveryMethod: "stripe_customer_id", customer: null };
    } catch (err: any) {
      console.error(`[findStripeSubscription] Failed to list by customer:`, err.message);
    }
  }

  // D) Email recovery fallback
  const email = normEmail(localSub.user_email || "");
  if (email) {
    try {
      // Try search API first (more efficient)
      let customers: any;
      try {
        customers = await stripe.customers.search({
          query: `email:'${email}'`,
          limit: 5
        });
      } catch (e) {
        // Fallback to list if search not available
        customers = await stripe.customers.list({
          email,
          limit: 10
        });
      }

      if (customers.data && customers.data.length > 0) {
        const customer = customers.data[0];
        
        // List subscriptions for this customer
        const subs = await stripe.subscriptions.list({
          customer: customer.id,
          status: "all",
          limit: 10,
          expand: ["data.items.data.price.product", "data.items.data.price"]
        });

        if (subs.data.length > 0) {
          // Prefer active/trialing
          const activeOrTrialing = subs.data.find((s: any) => s.status === "active" || s.status === "trialing");
          const stripeSub = activeOrTrialing || subs.data[0];

          return { 
            status: "RECOVERED_BY_EMAIL", 
            stripeSub, 
            recoveryMethod: "email_search",
            customer,
            needsBackfill: true
          };
        }
      }
    } catch (err: any) {
      console.error(`[findStripeSubscription] Email recovery failed:`, err.message);
    }
  }

  // E) No recovery possible
  return { status: "NO_STRIPE_IDS", stripeSub: null, customer: null };
}

Deno.serve(async (req: Request) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();

    // Admin-only
    if (me?.role !== "admin") {
      return Response.json({ 
        ok: false,
        error: "FORBIDDEN",
        message: "Admin access required"
      }, { status: 403 });
    }

    console.log("[repairStripeTiers] Initializing Stripe client...");

    // Initialize Stripe using ENV-only client
    const { stripe } = getStripeClient();

    console.log("[repairStripeTiers] Stripe client initialized successfully");

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun !== false; // Default to true
    const limit = body.limit || 200;

    console.log(`[repairStripeTiers] Starting (dryRun=${dryRun}, limit=${limit})`);

    // Fetch all subscriptions
    const allSubs = await base44.asServiceRole.entities.Subscription.list();

    // Filter to Stripe or unknown provider, and eligible status
    const eligibleSubs = allSubs.filter((sub: any) => {
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
      recoveredByEmail: 0,
      noStripeIds: 0,
      unknownTier: 0,
      skippedApple: 0,
      missingStripeSubscription: 0,
      samples: {
        updated: [] as any[],
        recovered: [] as any[],
        unknown: [] as any[],
        missing: [] as any[],
      },
    };

    for (const localSub of subsToRepair) {
      const lookupResult = await findStripeSubscriptionWithEmailRecovery(localSub, stripe);

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
            reason: lookupResult.status,
          });
        }
        continue;
      }

      const stripeSub = lookupResult.stripeSub;

      // Backfill missing IDs if recovered
      let needsBackfill = false;
      if (lookupResult.status === "RECOVERED_BY_CUSTOMER") {
        needsBackfill = true;
        results.recoveredByCustomer++;
      } else if (lookupResult.status === "RECOVERED_BY_EMAIL") {
        needsBackfill = true;
        results.recoveredByEmail++;
      }
      
      if (needsBackfill && results.samples.recovered.length < 10) {
        results.samples.recovered.push({
          subscription_id: localSub.id,
          user_email: localSub.user_email,
          recovered_stripe_sub_id: stripeSub.id,
          recovery_method: lookupResult.recoveryMethod,
        });
      }

      // Resolve tier
      let resolvedTier = null;
      try {
        resolvedTier = await resolveTierFromStripe(stripeSub, stripe);
      } catch (err: any) {
        console.error(`[repairStripeTiers] Tier resolution failed:`, err.message);
      }

      if (!resolvedTier) {
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
          const updatePayload: any = {};
          
          if (needsBackfill) {
            updatePayload.provider = "stripe";
            updatePayload.provider_subscription_id = stripeSub.id;
            updatePayload.stripe_subscription_id = stripeSub.id;
            const customerId = typeof stripeSub.customer === "string" 
              ? stripeSub.customer 
              : stripeSub.customer?.id;
            if (customerId) {
              updatePayload.stripe_customer_id = customerId;
            }

            // Backfill normalized reporting fields from Stripe data
            const priceId = stripeSub.items?.data?.[0]?.price?.id || null;
            const priceMap = buildPriceIdToPlanKeyMap();
            const planKey = priceId ? (priceMap[priceId] || null) : null;
            const planKeyModules = planKey ? modulesFromPlanKey(planKey) : [];
            const metadataModules = String(stripeSub.metadata?.modules_csv || "")
              .split(",").map((m: string) => m.trim().toLowerCase()).filter(Boolean);
            const activeModules = planKeyModules.length > 0 ? planKeyModules : metadataModules;
            const isBundle = activeModules.length > 1;
            const billingIntervalRaw = stripeSub.items?.data?.[0]?.price?.recurring?.interval || null;
            const renewalAmount = stripeSub.items?.data?.[0]?.price?.unit_amount
              ? stripeSub.items.data[0].price.unit_amount / 100 : null;

            if (priceId) updatePayload.price_id = priceId;
            if (planKey) updatePayload.planKey = planKey;
            if (activeModules.length > 0) {
              updatePayload.modules_csv = activeModules.join(",");
              updatePayload.module_count = activeModules.length;
              updatePayload.primary_module = activeModules[0];
              updatePayload.product_kind = isBundle ? "bundle" : "single";
              if (isBundle) {
                updatePayload.bundle_name = planKey?.includes("founders") ? "Founders Bundle"
                  : planKey?.includes("three_module") ? "3-Module Bundle"
                  : planKey?.includes("four_module") ? "4-Module Bundle"
                  : "Bundle";
              }
            }
            if (billingIntervalRaw) updatePayload.billing_interval = billingIntervalRaw;
            if (renewalAmount !== null) updatePayload.renewal_amount = renewalAmount;
            if (stripeSub.current_period_start) {
              updatePayload.current_period_start = new Date(stripeSub.current_period_start * 1000).toISOString();
            }
            if (stripeSub.current_period_end) {
              updatePayload.current_period_end = new Date(stripeSub.current_period_end * 1000).toISOString();
            }
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
  } catch (error: any) {
    return Response.json({ 
      ok: false, 
      error: "REPAIR_FAILED",
      message: safeStripeError(String(error?.message || error))
    }, { status: 500 });
  }
});