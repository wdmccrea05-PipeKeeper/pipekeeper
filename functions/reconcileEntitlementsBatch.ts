// Batch entitlement reconciliation for admin use
// NO LOCAL IMPORTS - all logic inlined (Base44 functions cannot import local files)
import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";
import Stripe from "npm:stripe@17.5.0";

const normEmail = (email) => String(email || "").trim().toLowerCase();

function getStripe() {
  const key = (Deno.env.get("STRIPE_SECRET_KEY") || "").trim();
  if (!key || !key.startsWith("sk_")) throw new Error("Invalid STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

function isActiveStatus(status) {
  return ["active", "trialing", "trial"].includes((status || "").toLowerCase());
}

function getTierPriority(tier) {
  const t = (tier || "").toLowerCase();
  if (t === "pro") return 3;
  if (t === "premium") return 2;
  return 1;
}

async function reconcileUser(base44, userEntity, stripe, localSubsByUserId) {
  const email = normEmail(userEntity.email);
  const currentTier = userEntity.entitlement_tier || userEntity.data?.entitlement_tier || userEntity.subscription_tier || "free";
  const currentLevel = userEntity.subscription_level || "free";
  const currentStatus = userEntity.subscription_status || "";
  let stripeCustomerId = userEntity.stripe_customer_id || null;

  // Check if user already has entitlement fields set correctly in data blob
  const hasDataBlob = !!(userEntity.data?.entitlement_tier);
  const dataBlobTier = userEntity.data?.entitlement_tier || "free";

  // Check local Subscription entity first (avoids Stripe API call for most users)
  const localSubs = localSubsByUserId[userEntity.id] || [];
  const localActiveSub = localSubs
    .filter(s => isActiveStatus(s.status))
    .sort((a, b) => getTierPriority(b.tier) - getTierPriority(a.tier))[0] || null;

  let stripeTier = null;
  let stripeStatus = null;
  let appleTier = null;
  let appleStatus = null;

  // Set from local Subscription entity (fast path — no external API calls)
  if (localActiveSub) {
    if (localActiveSub.provider === "apple") {
      appleTier = localActiveSub.tier || "premium";
      appleStatus = localActiveSub.status;
    } else {
      stripeTier = localActiveSub.tier || "premium";
      stripeStatus = localActiveSub.status;
      if (localActiveSub.stripe_customer_id) stripeCustomerId = localActiveSub.stripe_customer_id;
    }
  }

  // Only hit Stripe API if user has a stripe_customer_id but no local subscription found
  if (!localActiveSub && stripeCustomerId) {
    try {
      const subsResponse = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: "all",
        limit: 5,
        expand: ["data.items.data.price"],
      });
      const activeSub = subsResponse.data?.find(s => s.status === "active" || s.status === "trialing");
      if (activeSub) {
        stripeStatus = activeSub.status;
        const priceId = activeSub.items?.data?.[0]?.price?.id;
        const proMonthly = Deno.env.get("STRIPE_PRICE_ID_PRO_MONTHLY");
        const proAnnual = Deno.env.get("STRIPE_PRICE_ID_PRO_ANNUAL");
        stripeTier = (priceId === proMonthly || priceId === proAnnual) ? "pro" : "premium";
      }
    } catch (e) {
      console.warn(`[reconcileEntitlementsBatch] Stripe check failed for ${email}:`, e?.message);
    }
  }

  // === RESOLVE FINAL TIER ===
  let finalTier = "free";
  let finalStatus = "inactive";
  let providerUsed = "none";

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
  } else {
    // Preserve existing paid tier if no active subscription found (don't downgrade)
    finalTier = currentTier !== "free" ? currentTier : "free";
    finalStatus = currentStatus || "inactive";
    providerUsed = currentTier !== "free" ? "preserved" : "none";
  }

  const finalLevel = finalTier === "free" ? "free" : "paid";

  // Only mark changed if data blob is missing OR tier is wrong
  const changed =
    !hasDataBlob ||
    dataBlobTier !== finalTier ||
    finalTier !== (userEntity.subscription_tier || "free") ||
    finalLevel !== currentLevel ||
    (stripeCustomerId && !userEntity.stripe_customer_id);

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
    // Accept both camelCase and snake_case for dry_run/dryRun
    const dryRun = (body.dryRun ?? body.dry_run) !== false;
    const batchSize = Math.min(body.batchSize || body.batch_size || 100, 500);
    const cursor = body.cursor || null;

    console.log(`[reconcileEntitlementsBatch] Starting: dryRun=${dryRun}, batchSize=${batchSize}`);

    const stripe = getStripe();
    const skip = cursor ? parseInt(cursor, 10) : 0;
    const users = await base44.asServiceRole.entities.User.list("-created_date", batchSize, skip);

    // Pre-fetch ALL local subscriptions in one batch — avoids N Stripe API calls for free users
    const allLocalSubs = await base44.asServiceRole.entities.Subscription.list("-created_date", 1000);
    const localSubsByUserId = {};
    for (const sub of (allLocalSubs || [])) {
      const uid = sub.user_id;
      if (uid) {
        if (!localSubsByUserId[uid]) localSubsByUserId[uid] = [];
        localSubsByUserId[uid].push(sub);
      }
    }

    let scanned = 0;
    let fixed = 0;
    let unchanged = 0;
    let errorsCount = 0;
    const sampleFixes = [];
    const sampleErrors = [];

    for (const userEntity of users) {
      try {
        const result = await reconcileUser(base44, userEntity, stripe, localSubsByUserId);
        scanned++;

        if (result.changed) {
          fixed++;
          if (!dryRun) {
            const updates = {
              subscription_tier: result.finalTier,
              subscription_level: result.finalLevel,
              subscription_status: result.finalStatus,
              // Write canonical entitlement_tier (top-level AND data blob) so resolver finds it
              entitlement_tier: result.finalTier,
              data: {
                ...(userEntity.data || {}),
                entitlement_tier: result.finalTier,
                subscription_tier: result.finalTier,
                subscription_level: result.finalLevel,
                subscription_status: result.finalStatus,
              },
            };
            if (result.stripeCustomerId && !userEntity.stripe_customer_id) {
              updates.stripe_customer_id = result.stripeCustomerId;
            }
            await base44.asServiceRole.entities.User.update(userEntity.id, updates);
          }
          if (sampleFixes.length < 10) {
            sampleFixes.push({
              email: userEntity.email,
              before: {
                tier: userEntity.subscription_tier || userEntity.data?.subscription_tier || "free",
                level: userEntity.subscription_level || userEntity.data?.subscription_level || "free",
              },
              after: { tier: result.finalTier, level: result.finalLevel },
              providerUsed: result.providerUsed,
            });
          }
        } else {
          unchanged++;
        }
      } catch (err) {
        errorsCount++;
        if (sampleErrors.length < 5) {
          sampleErrors.push({ email: userEntity.email, message: String(err?.message || err) });
        }
      }
    }

    return Response.json({
      ok: true,
      dryRun,
      scanned,
      fixed,
      unchanged,
      errorsCount,
      hasMore: users.length === batchSize,
      nextCursor: users.length === batchSize ? String(skip + batchSize) : null,
      sampleFixes,
      sampleErrors,
    });
  } catch (error) {
    console.error("[reconcileEntitlementsBatch] Fatal error:", error);
    return Response.json({
      ok: false,
      error: "BATCH_RECONCILE_FAILED",
      message: String(error?.message || error),
    }, { status: 500 });
  }
});