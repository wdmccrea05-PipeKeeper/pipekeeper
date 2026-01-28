import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { reconcileUserEntitlements } from "./_utils/reconcileEntitlements.ts";

const normEmail = (email: string) => String(email || "").trim().toLowerCase();

Deno.serve(async (req) => {
  try {
    // Parse input
    let body;
    try {
      body = await req.json();
    } catch {
      return Response.json({
        ok: false,
        error: "INVALID_INPUT",
        message: "Invalid JSON body"
      }, { status: 400 });
    }

    const targetEmail = normEmail(body.email);
    if (!targetEmail) {
      return Response.json({
        ok: false,
        error: "MISSING_EMAIL",
        message: "Email is required"
      }, { status: 400 });
    }

    // Auth - must be admin
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();

    if (!authUser?.role || authUser.role !== "admin") {
      return Response.json({ 
        ok: false, 
        error: "FORBIDDEN",
        message: "Admin access required"
      }, { status: 403 });
    }

    // Find user by email
    const users = await base44.asServiceRole.entities.User.filter({ email: targetEmail });
    const userEntity = users?.[0];

    if (!userEntity) {
      return Response.json({
        ok: false,
        error: "USER_NOT_FOUND",
        message: `No user found with email: ${targetEmail}`
      }, { status: 404 });
    }

    const before = {
      email: userEntity.email,
      subscription_tier: userEntity.subscription_tier,
      subscription_level: userEntity.subscription_level,
      subscription_status: userEntity.subscription_status,
      stripe_customer_id: userEntity.stripe_customer_id,
    };

    // Run reconciliation
    const result = await reconcileUserEntitlements(base44, userEntity, { 
      forceStripeCheck: true 
    });

    const finalTier = result.finalTier;
    const finalLevel = result.finalLevel;
    const finalStatus = result.finalStatus;
    const stripeCustomerId = result.stripeCustomerId;
    const providerUsed = result.providerUsed;

    // === UPDATE USER ENTITY ===
    const updates: any = {
      subscription_tier: finalTier,
      subscription_level: finalLevel,
      subscription_status: finalStatus,
    };

    if (stripeCustomerId && !userEntity.stripe_customer_id) {
      updates.stripe_customer_id = stripeCustomerId;
    }

    await base44.asServiceRole.entities.User.update(userEntity.id, updates);

    const after = {
      email: userEntity.email,
      subscription_tier: finalTier,
      subscription_level: finalLevel,
      subscription_status: finalStatus,
      stripe_customer_id: stripeCustomerId || userEntity.stripe_customer_id,
    };

    return Response.json({
      ok: true,
      before,
      after,
      providerUsed,
      changes: {
        tierChanged: before.subscription_tier !== after.subscription_tier,
        levelChanged: before.subscription_level !== after.subscription_level,
        statusChanged: before.subscription_status !== after.subscription_status,
        customerIdAdded: !before.stripe_customer_id && after.stripe_customer_id,
      }
    });

  } catch (error: any) {
    console.error("[adminReconcileEntitlementsByEmail] error:", error);
    return Response.json({
      ok: false,
      error: "RECONCILE_FAILED",
      message: String(error?.message || error),
    }, { status: 500 });
  }
});