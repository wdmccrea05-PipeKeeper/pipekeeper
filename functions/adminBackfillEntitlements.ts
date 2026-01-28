// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { reconcileUserEntitlements } from "./_utils/reconcileEntitlements.ts";

function needsReconciliation(user: any): boolean {
  const tier = user.subscription_tier;
  const level = user.subscription_level;
  const status = user.subscription_status;
  const hasStripe = !!user.stripe_customer_id;

  // Needs reconciliation if tier is missing/free but has indicators of paid status
  if (!tier || tier === "free") {
    if (hasStripe || (status && status !== "inactive" && status !== "none")) {
      return true;
    }
  }

  if (level === "free" && (hasStripe || (status && status !== "inactive" && status !== "none"))) {
    return true;
  }

  return false;
}

Deno.serve(async (req) => {
  try {
    // Only accept POST
    if (req.method !== "POST") {
      return Response.json({ 
        ok: false, 
        error: "METHOD_NOT_ALLOWED",
        message: "Only POST requests are allowed"
      }, { status: 405 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const batchSize = Math.min(body.batchSize || 100, 200);
    const cursor = body.cursor || null;
    const dryRun = body.dryRun !== false; // Default to true for safety

    // Auth - admin only
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();

    if (!authUser?.role || authUser.role !== "admin") {
      return Response.json({ 
        ok: false, 
        error: "FORBIDDEN",
        message: "Admin access required"
      }, { status: 403 });
    }

    console.log(`[adminBackfillEntitlements] Starting batch: size=${batchSize}, dryRun=${dryRun}, cursor=${cursor}`);

    // Fetch users paginated
    let users;
    try {
      users = await base44.asServiceRole.entities.User.list("-created_date", batchSize);
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
        const before = {
          tier: user.subscription_tier,
          level: user.subscription_level,
          status: user.subscription_status,
          stripe_customer_id: user.stripe_customer_id,
        };

        const result = await reconcileUserEntitlements(base44, user, { 
          forceStripeCheck: true 
        });

        if (result.changed) {
          if (!dryRun) {
            const updates: any = {
              subscription_tier: result.finalTier,
              subscription_level: result.finalLevel,
              subscription_status: result.finalStatus,
            };

            if (result.stripeCustomerId && !user.stripe_customer_id) {
              updates.stripe_customer_id = result.stripeCustomerId;
            }

            // Preserve founding member and grandfathered status
            if (user.isFoundingMember !== undefined) {
              updates.isFoundingMember = user.isFoundingMember;
            }
            if (user.isFreeGrandfathered !== undefined) {
              updates.isFreeGrandfathered = user.isFreeGrandfathered;
            }

            await base44.asServiceRole.entities.User.update(user.id, updates);
            
            console.log(`[adminBackfillEntitlements] Fixed user: ${user.email}, ${before.tier} → ${result.finalTier}`);
          }

          fixed++;
          if (sampleFixes.length < 10) {
            sampleFixes.push({
              email: user.email,
              before,
              after: {
                tier: result.finalTier,
                level: result.finalLevel,
                status: result.finalStatus,
                stripe_customer_id: result.stripeCustomerId || before.stripe_customer_id,
              },
              providerUsed: result.providerUsed,
            });
          }
        } else {
          unchanged++;
        }
      } catch (e: any) {
        errorsCount++;
        console.error(`[adminBackfillEntitlements] Error processing ${user.email}:`, e);
        if (sampleErrors.length < 5) {
          sampleErrors.push({
            email: user.email,
            message: String(e?.message || e),
          });
        }
      }
    }

    const lastUserId = users.length > 0 ? users[users.length - 1]?.id : null;
    const hasMore = users.length === batchSize;

    console.log(`[adminBackfillEntitlements] Batch complete: scanned=${scanned}, fixed=${fixed}, unchanged=${unchanged}, errors=${errorsCount}`);

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
    console.error("[adminBackfillEntitlements] Fatal error:", error);
    return Response.json({
      ok: false,
      error: "BATCH_RECONCILE_FAILED",
      message: String(error?.message || error),
    }, { status: 500 });
  }
});