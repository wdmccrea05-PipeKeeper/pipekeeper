// Repair entitlements for a batch of users - admin only
// NO LOCAL IMPORTS: all reconciliation logic is inlined
import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";
import Stripe from "npm:stripe@17.5.0";

function getStripe() {
  const key = (Deno.env.get("STRIPE_SECRET_KEY") || "").trim();
  if (!key || !key.startsWith("sk_")) throw new Error("Invalid STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

const normEmail = (email) => String(email || "").trim().toLowerCase();

function isActiveStatus(status) {
  return ["active", "trialing", "trial"].includes((status || "").toLowerCase());
}

function getTierPriority(tier) {
  const t = (tier || "").toLowerCase();
  if (t === "pro") return 3;
  if (t === "premium") return 2;
  return 1;
}

async function reconcileUser(base44, userEntity, stripe) {
  const email = normEmail(userEntity.email);
  const currentTier = userEntity.subscription_tier || "free";
  const currentLevel = userEntity.subscription_level || "free";
  const currentStatus = userEntity.subscription_status || "";
  let stripeCustomerId = userEntity.stripe_customer_id || null;

  const wasEverPaid = currentLevel === "paid" ||
    currentTier === "premium" || currentTier === "pro" ||
    isActiveStatus(currentStatus);

  let stripeTier = null, stripeStatus = null;
  let appleTier = null, appleStatus = null;

  // Stripe check
  try {
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
    console.warn(`[repairEntitlementsBatch] Stripe check failed for ${email}:`, e?.message);
  }

  // Apple check
  try {
    const appleSubs = await base44.asServiceRole.entities.Subscription.filter({
      user_id: userEntity.id, provider: "apple",
    });
    const activeSub = (appleSubs || []).find(s => isActiveStatus(s.status));
    if (activeSub) { appleStatus = activeSub.status; appleTier = activeSub.tier || "premium"; }
  } catch (e) {
    console.warn(`[repairEntitlementsBatch] Apple check failed for ${email}:`, e?.message);
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
    finalStatus !== currentStatus || (stripeCustomerId && !userEntity.stripe_customer_id);

  return { finalTier, finalLevel, finalStatus, stripeCustomerId, providerUsed, changed };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== "admin") {
      return Response.json({ ok: false, error: "FORBIDDEN", message: "Admin access required" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun !== false;
    const batchSize = Math.min(body.batchSize || 100, 500);
    const tierFilter = body.tierFilter || null;

    console.log(`[repairEntitlementsBatch] Starting: dryRun=${dryRun}, batchSize=${batchSize}, tierFilter=${tierFilter || "all"}`);

    const stripe = getStripe();
    let usersToRepair = await base44.asServiceRole.entities.User.list("-created_date", batchSize);
    if (tierFilter) {
      usersToRepair = usersToRepair.filter(u => (u.subscription_tier || "free") === tierFilter);
    }

    let processed = 0, changed = 0, alreadyCorrect = 0, errors = 0;
    const sampleFixes = [], sampleErrors = [];

    for (const userEntity of usersToRepair) {
      try {
        const result = await reconcileUser(base44, userEntity, stripe);
        processed++;

        if (result.changed) {
          changed++;
          if (!dryRun) {
            const updates = {
              subscription_tier: result.finalTier,
              subscription_level: result.finalLevel,
              subscription_status: result.finalStatus,
            };
            if (result.stripeCustomerId && !userEntity.stripe_customer_id) {
              updates.stripe_customer_id = result.stripeCustomerId;
            }
            await base44.asServiceRole.entities.User.update(userEntity.id, updates);
          }
          if (sampleFixes.length < 10) {
            sampleFixes.push({
              email: userEntity.email,
              before: { tier: userEntity.subscription_tier, level: userEntity.subscription_level, status: userEntity.subscription_status },
              after: { tier: result.finalTier, level: result.finalLevel, status: result.finalStatus },
              provider: result.providerUsed,
            });
          }
        } else {
          alreadyCorrect++;
        }
      } catch (err) {
        errors++;
        if (sampleErrors.length < 5) {
          sampleErrors.push({ email: userEntity.email, error: String(err?.message || err) });
        }
      }
    }

    return Response.json({ ok: true, dryRun, batchSize, tierFilter: tierFilter || "all", processed, changed, alreadyCorrect, errors, sampleFixes, sampleErrors });
  } catch (error) {
    return Response.json({ ok: false, error: "BATCH_REPAIR_FAILED", message: String(error?.message || error) }, { status: 500 });
  }
});