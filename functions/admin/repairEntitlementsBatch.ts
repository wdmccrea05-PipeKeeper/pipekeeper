// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { reconcileUserEntitlements } from "../_utils/reconcileEntitlements.js";

const normEmail = (email) => String(email || "").trim().toLowerCase();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== "admin") {
      return Response.json({
        ok: false,
        error: "FORBIDDEN",
        message: "Admin access required"
      }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun !== false;
    const batchSize = Math.min(body.batchSize || 100, 500);
    const tierFilter = body.tierFilter || null; // Optional: "free", "premium", "pro"

    console.log(`[repairEntitlementsBatch] Starting: dryRun=${dryRun}, batchSize=${batchSize}, tierFilter=${tierFilter || "all"}`);

    // Fetch users to repair
    let usersToRepair = await base44.asServiceRole.entities.User.list('-created_date', batchSize);

    // Apply optional tier filter to focus repairs on specific tier issues
    if (tierFilter) {
      usersToRepair = usersToRepair.filter(u => (u.subscription_tier || "free") === tierFilter);
    }

    let processed = 0;
    let changed = 0;
    let alreadyCorrect = 0;
    let errors = 0;
    const sampleFixes = [];
    const sampleErrors = [];

    for (const userEntity of usersToRepair) {
      try {
        const result = await reconcileUserEntitlements(base44, userEntity, {
          forceStripeCheck: true,
        });

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
              before: {
                tier: userEntity.subscription_tier,
                level: userEntity.subscription_level,
                status: userEntity.subscription_status,
              },
              after: {
                tier: result.finalTier,
                level: result.finalLevel,
                status: result.finalStatus,
              },
              provider: result.providerUsed,
            });
          }
        } else {
          alreadyCorrect++;
        }
      } catch (err) {
        errors++;
        console.error(`[repairEntitlementsBatch] Error for ${userEntity.email}:`, err);

        if (sampleErrors.length < 5) {
          sampleErrors.push({
            email: userEntity.email,
            error: String(err?.message || err),
          });
        }
      }
    }

    console.log(`[repairEntitlementsBatch] Complete: processed=${processed}, changed=${changed}, alreadyCorrect=${alreadyCorrect}, errors=${errors}`);

    return Response.json({
      ok: true,
      dryRun,
      batchSize,
      tierFilter: tierFilter || "all",
      processed,
      changed,
      alreadyCorrect,
      errors,
      sampleFixes,
      sampleErrors,
    });
  } catch (error) {
    console.error("[repairEntitlementsBatch] Fatal error:", error);
    return Response.json({
      ok: false,
      error: "BATCH_REPAIR_FAILED",
      message: String(error?.message || error),
    }, { status: 500 });
  }
});
