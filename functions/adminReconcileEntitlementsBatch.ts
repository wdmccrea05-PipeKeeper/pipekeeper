import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeClient, safeStripeError } from "./_utils/stripe.ts";

const normEmail = (email: string) => String(email || "").trim().toLowerCase();

function isActiveStatus(status: string): boolean {
  const activeStatuses = ["active", "trialing", "trial"];
  return activeStatuses.includes((status || "").toLowerCase());
}

function getTierPriority(tier: string): number {
  const t = (tier || "").toLowerCase();
  if (t === "pro") return 3;
  if (t === "premium") return 2;
  return 1;
}

function needsReconciliation(user: any): boolean {
  // Needs reconciliation if:
  // - subscription_tier is missing/empty
  // - OR subscription_level is "free" but has stripe_customer_id
  // - OR subscription_level is "free" but subscription_status suggests paid
  const tier = user.subscription_tier;
  const level = user.subscription_level;
  const status = user.subscription_status;
  const hasStripe = !!user.stripe_customer_id;

  if (!tier || tier === "free") {
    if (hasStripe || isActiveStatus(status)) {
      return true;
    }
  }

  if (level === "free" && (hasStripe || isActiveStatus(status))) {
    return true;
  }

  return false;
}

Deno.serve(async (req) => {
  try {
    let body;
    try {
      body = await req.json().catch(() => ({}));
    } catch {
      body = {};
    }

    const limit = Math.min(body.limit || 100, 200);
    const cursor = body.cursor || null;
    const dryRun = body.dryRun || false;

    // Auth - admin only
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();

    if (!authUser?.role || authUser.role !== "admin") {
      return Response.json({ 
        ok: false, 
        error: "FORBIDDEN" 
      }, { status: 403 });
    }

    // Initialize Stripe
    let stripe;
    try {
      stripe = getStripeClient();
    } catch (e: any) {
      return Response.json({
        ok: false,
        error: "STRIPE_INIT_FAILED",
        message: safeStripeError(e)
      }, { status: 500 });
    }

    // Fetch users paginated
    let users;
    try {
      if (cursor) {
        // Use cursor-based pagination if supported, else skip/limit
        users = await base44.asServiceRole.entities.User.list(limit);
      } else {
        users = await base44.asServiceRole.entities.User.list(limit);
      }
    } catch (e: any) {
      return Response.json({
        ok: false,
        error: "USER_LIST_FAILED",
        message: String(e?.message || e)
      }, { status: 500 });
    }

    let scanned = 0;
    let fixed = 0;
    let unchanged = 0;
    let errorsCount = 0;
    const sampleFixes: any[] = [];
    const sampleErrors: any[] = [];

    for (const user of users) {
      scanned++;

      if (!needsReconciliation(user)) {
        unchanged++;
        continue;
      }

      try {
        const email = normEmail(user.email);
        const before = {
          tier: user.subscription_tier,
          level: user.subscription_level,
          status: user.subscription_status,
          stripe_customer_id: user.stripe_customer_id,
        };

        let currentTier = user.subscription_tier || "free";
        let currentLevel = user.subscription_level || "free";
        let currentStatus = user.subscription_status || "";
        let stripeCustomerId = user.stripe_customer_id || null;

        const wasEverPaid = currentLevel === "paid" || 
                            currentTier === "premium" || 
                            currentTier === "pro" ||
                            isActiveStatus(currentStatus);

        let stripeTier = null;
        let stripeStatus = null;
        let appleTier = null;
        let appleStatus = null;

        // Stripe recovery
        const needsStripeRecovery = !stripeCustomerId || 
                                     !currentTier || 
                                     currentTier === "free" ||
                                     !isActiveStatus(currentStatus);

        if (needsStripeRecovery) {
          try {
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

            if (customer?.id) {
              stripeCustomerId = customer.id;

              const subsResponse = await stripe.subscriptions.list({
                customer: customer.id,
                status: "all",
                limit: 10,
                expand: ["data.items.data.price"],
              });

              if (subsResponse.data?.length > 0) {
                const activeSub = subsResponse.data.find((s: any) => 
                  s.status === "active" || s.status === "trialing"
                );
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
          } catch (e: any) {
            // Non-fatal, continue
          }
        } else {
          if (isActiveStatus(currentStatus)) {
            stripeTier = currentTier;
            stripeStatus = currentStatus;
          }
        }

        // Apple check
        try {
          const appleSubs = await base44.asServiceRole.entities.Subscription.filter({
            user_email: email,
            provider: "apple",
          });

          if (appleSubs?.length > 0) {
            const activeSub = appleSubs.find((s: any) => isActiveStatus(s.status));
            const bestSub = activeSub || appleSubs[0];

            appleStatus = bestSub.status;
            if (isActiveStatus(bestSub.status)) {
              appleTier = bestSub.tier || "premium";
            }
          }
        } catch (e: any) {
          // Non-fatal
        }

        // Resolve final tier
        let finalTier = "free";
        let finalStatus = "";
        let providerUsed = "none";

        const stripeActive = stripeTier && isActiveStatus(stripeStatus);
        const appleActive = appleTier && isActiveStatus(appleStatus);

        if (stripeActive && appleActive) {
          if (getTierPriority(stripeTier) >= getTierPriority(appleTier)) {
            finalTier = stripeTier;
            finalStatus = stripeStatus;
            providerUsed = "stripe";
          } else {
            finalTier = appleTier;
            finalStatus = appleStatus;
            providerUsed = "apple";
          }
        } else if (stripeActive) {
          finalTier = stripeTier;
          finalStatus = stripeStatus;
          providerUsed = "stripe";
        } else if (appleActive) {
          finalTier = appleTier;
          finalStatus = appleStatus;
          providerUsed = "apple";
        } else {
          if (wasEverPaid) {
            finalTier = currentTier;
            finalStatus = currentStatus;
            providerUsed = "preserved";
          } else {
            finalTier = "free";
            finalStatus = "inactive";
            providerUsed = "none";
          }
        }

        const finalLevel = (finalTier === "free") ? "free" : "paid";

        // Check if changes needed
        const changed = 
          finalTier !== before.tier ||
          finalLevel !== before.level ||
          finalStatus !== before.status ||
          (stripeCustomerId && !before.stripe_customer_id);

        if (changed) {
          if (!dryRun) {
            const updates: any = {
              subscription_tier: finalTier,
              subscription_level: finalLevel,
              subscription_status: finalStatus,
            };

            if (stripeCustomerId && !user.stripe_customer_id) {
              updates.stripe_customer_id = stripeCustomerId;
            }

            await base44.asServiceRole.entities.User.update(user.id, updates);
          }

          fixed++;
          if (sampleFixes.length < 10) {
            sampleFixes.push({
              email,
              before,
              after: {
                tier: finalTier,
                level: finalLevel,
                status: finalStatus,
                stripe_customer_id: stripeCustomerId || before.stripe_customer_id,
              },
              providerUsed,
            });
          }
        } else {
          unchanged++;
        }
      } catch (e: any) {
        errorsCount++;
        if (sampleErrors.length < 5) {
          sampleErrors.push({
            email: user.email,
            message: String(e?.message || e),
          });
        }
      }
    }

    const lastUserId = users.length > 0 ? users[users.length - 1]?.id : null;
    const hasMore = users.length === limit;

    return Response.json({
      ok: true,
      dryRun,
      scanned,
      fixed,
      unchanged,
      errorsCount,
      sampleFixes,
      sampleErrors,
      nextCursor: hasMore ? lastUserId : null,
      hasMore,
    });

  } catch (error: any) {
    console.error("[adminReconcileEntitlementsBatch] error:", error);
    return Response.json({
      ok: false,
      error: "BATCH_RECONCILE_FAILED",
      message: String(error?.message || error),
    }, { status: 500 });
  }
});