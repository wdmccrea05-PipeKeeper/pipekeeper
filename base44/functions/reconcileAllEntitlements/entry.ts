// Automated entitlement reconciliation - processes in small batches with delays to avoid rate limits
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 1500; // 1.5s between batches

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me().catch(() => null);

    // Allow admins or scheduled automation (no auth user)
    if (caller && caller.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    let body = {};
    try { body = await req.json(); } catch { body = {}; }
    const offset = parseInt(body.offset || 0, 10);
    const batchLimit = parseInt(body.batchLimit || 500, 10);

    console.log(`[reconcileAllEntitlements] Starting reconciliation (offset=${offset}, batchLimit=${batchLimit})...`);

    const allSubs = await base44.asServiceRole.entities.Subscription.filter(
      { status: "active" },
      "-updated_date",
      batchLimit,
      offset
    );

    console.log(`[reconcileAllEntitlements] Found ${allSubs.length} active subscriptions`);

    const results = {
      total: allSubs.length,
      fixed: 0,
      skipped: 0,
      errors: [],
      userIdBackfilled: 0,
    };

    // Process in batches with delays
    for (let i = 0; i < allSubs.length; i += BATCH_SIZE) {
      const batch = allSubs.slice(i, i + BATCH_SIZE);

      for (const sub of batch) {
        try {
          const email = String(sub.user_email || "").trim().toLowerCase();

          if (!email) {
            results.skipped++;
            continue;
          }

          const users = await base44.asServiceRole.entities.User.filter({ email });
          const user = users?.[0];

          if (!user) {
            results.errors.push({ email, error: "User not found" });
            continue;
          }

          // Backfill user_id in subscription if missing
          if (!sub.user_id && user.id) {
            await base44.asServiceRole.entities.Subscription.update(sub.id, { user_id: user.id });
            results.userIdBackfilled++;
          }

          const expectedTier = sub.tier || "premium";
          const expectedLevel = "paid";
          const expectedStatus = "active";

          const needsUpdate =
            user.subscription_level !== expectedLevel ||
            user.subscription_status !== expectedStatus ||
            user.subscription_tier !== expectedTier ||
            user.entitlement_tier !== expectedTier;

          if (needsUpdate) {
            console.log(`[reconcile] Fixing ${email}: tier=${user.subscription_tier}->${expectedTier}`);

            await base44.asServiceRole.entities.User.update(user.id, {
              subscription_level: expectedLevel,
              subscription_status: expectedStatus,
              subscription_tier: expectedTier,
              entitlement_tier: expectedTier,
              stripe_customer_id: sub.stripe_customer_id || user.stripe_customer_id,
              data: {
                ...(user.data || {}),
                entitlement_tier: expectedTier,
                subscription_tier: expectedTier,
                subscription_level: expectedLevel,
                subscription_status: expectedStatus,
              },
            });

            results.fixed++;
          }
        } catch (err) {
          const isRateLimit = err?.message?.includes("Rate limit") || err?.status === 429;
          console.error(`[reconcile] Error processing ${sub.user_email}:`, err.message);
          results.errors.push({
            email: sub.user_email,
            error: isRateLimit ? "Rate limit - will retry next run" : err.message,
          });
          // Extra delay on rate limit
          if (isRateLimit) await sleep(3000);
        }
      }

      // Delay between batches (skip after last batch)
      if (i + BATCH_SIZE < allSubs.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    console.log("[reconcileAllEntitlements] Completed:", results);

    return Response.json({ ok: true, ...results });

  } catch (error) {
    console.error("[reconcileAllEntitlements] Fatal error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});