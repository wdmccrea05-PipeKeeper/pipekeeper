// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { reconcileUserEntitlements } from "./_utils/reconcileEntitlements.js";

const normEmail = (email) => String(email || "").trim().toLowerCase();

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json({
        ok: false,
        error: "METHOD_NOT_ALLOWED",
        message: "Only POST requests are allowed"
      }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();

    if (me?.role !== "admin") {
      return Response.json({
        ok: false,
        error: "FORBIDDEN",
        message: "Admin access required"
      }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const email = normEmail(body.email || "");
    const dryRun = body.dryRun !== false;

    if (!email) {
      return Response.json({
        ok: false,
        error: "EMAIL_REQUIRED",
        message: "Email is required"
      }, { status: 400 });
    }

    console.log(`[repairUserEntitlementByEmail] Processing: ${email}, dryRun=${dryRun}`);

    // Find the user
    const userRows = await base44.asServiceRole.entities.User.filter({ email });
    const userRow = userRows?.[0];

    if (!userRow) {
      return Response.json({
        ok: false,
        error: "USER_NOT_FOUND",
        message: `No User entity found for ${email}`
      });
    }

    console.log(`[repairUserEntitlementByEmail] Found user: ${userRow.id}, current tier=${userRow.subscription_tier}`);

    const before = {
      subscription_tier: userRow.subscription_tier,
      subscription_level: userRow.subscription_level,
      subscription_status: userRow.subscription_status,
      stripe_customer_id: userRow.stripe_customer_id,
    };

    // Run reconciliation to find correct entitlement
    const result = await reconcileUserEntitlements(base44, userRow, {
      forceStripeCheck: true,
      req,
    });

    console.log(`[repairUserEntitlementByEmail] Reconciliation: tier=${result.finalTier}, level=${result.finalLevel}, changed=${result.changed}, provider=${result.providerUsed}`);

    if (!result.changed) {
      return Response.json({
        ok: true,
        email,
        changed: false,
        message: "User entitlements are already correct",
        before,
        after: before,
        provider: result.providerUsed,
        applied: false,
      });
    }

    const updates = {
      subscription_tier: result.finalTier,
      subscription_level: result.finalLevel,
      subscription_status: result.finalStatus,
    };

    if (result.stripeCustomerId && !userRow.stripe_customer_id) {
      updates.stripe_customer_id = result.stripeCustomerId;
    }

    const after = {
      subscription_tier: result.finalTier,
      subscription_level: result.finalLevel,
      subscription_status: result.finalStatus,
      stripe_customer_id: result.stripeCustomerId || userRow.stripe_customer_id,
    };

    if (!dryRun) {
      await base44.asServiceRole.entities.User.update(userRow.id, updates);
      console.log(`[repairUserEntitlementByEmail] Updated user ${userRow.id}: tier=${result.finalTier}, level=${result.finalLevel}`);
    } else {
      console.log(`[repairUserEntitlementByEmail] Dry run - no changes applied`);
    }

    return Response.json({
      ok: true,
      email,
      changed: true,
      applied: !dryRun,
      provider: result.providerUsed,
      before,
      after,
    });
  } catch (error) {
    console.error("[repairUserEntitlementByEmail] error:", error);
    return Response.json({
      ok: false,
      error: "FUNCTION_ERROR",
      message: String(error?.message || error)
    }, { status: 500 });
  }
});
