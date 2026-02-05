// Batch entitlement reconciliation for admin use
// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { reconcileUserEntitlements } from "./_utils/reconcileEntitlements.ts";

const normEmail = (email: string) => String(email || "").trim().toLowerCase();

Deno.serve(async (req: Request) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only
    if (user?.role !== "admin") {
      return Response.json({ 
        ok: false, 
        error: "FORBIDDEN",
        message: "Admin access required",
        where: "reconcileEntitlementsBatch"
      }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun !== false;
    const batchSize = Math.min(body.batchSize || 100, 500);

    console.log(`[reconcileEntitlementsBatch] Starting: dryRun=${dryRun}, batchSize=${batchSize}`);

    // Fetch users to reconcile
    const users = await base44.asServiceRole.entities.User.list('-created_date', batchSize);

    let processed = 0;
    let changed = 0;
    let errors = 0;
    const sampleFixes: any[] = [];
    const sampleErrors: any[] = [];

    for (const userEntity of users) {
      try {
        const result = await reconcileUserEntitlements(base44, userEntity, { forceStripeCheck: true, req });

        processed++;

        if (result.changed) {
          changed++;

          if (!dryRun) {
            const updates: any = {
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
        }
      } catch (err: any) {
        errors++;
        console.error(`[reconcileEntitlementsBatch] Error for ${userEntity.email}:`, err);
        
        if (sampleErrors.length < 5) {
          sampleErrors.push({
            email: userEntity.email,
            error: String(err?.message || err),
          });
        }
      }
    }

    return Response.json({
      ok: true,
      dryRun,
      processed,
      changed,
      errors,
      sampleFixes,
      sampleErrors,
    });
  } catch (error: any) {
    console.error("[reconcileEntitlementsBatch] Fatal error:", error);
    return Response.json({
      ok: false,
      error: "BATCH_RECONCILE_FAILED",
      message: String(error?.message || error),
      where: "reconcileEntitlementsBatch",
      hint: "Check Stripe keys and User entity access"
    }, { status: 500 });
  }
});