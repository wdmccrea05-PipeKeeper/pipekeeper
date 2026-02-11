// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { reconcileUserEntitlements } from "./_utils/reconcileEntitlements.js";

const normEmail = (email) => String(email || "").trim().toLowerCase();

Deno.serve(async (req) => {
  try {
    // Parse input
    let body;
    try {
      body = await req.json().catch(() => ({}));
    } catch {
      body = {};
    }

    const platform = body.platform || "web";

    // Auth - this function should be callable by any authenticated user
    const base44 = createClientFromRequest(req);
    let authUser;
    try {
      authUser = await base44.auth.me();
    } catch (error) {
      console.error('[reconcileEntitlementsOnLogin] Auth failed:', error);
      return Response.json({ 
        ok: false, 
        error: "UNAUTHENTICATED" 
      }, { status: 401 });
    }

    if (!authUser?.id || !authUser?.email) {
      console.error('[reconcileEntitlementsOnLogin] Missing user ID or email');
      return Response.json({ 
        ok: false, 
        error: "UNAUTHENTICATED" 
      }, { status: 401 });
    }

    const email = normEmail(authUser.email);

    // Load User entity (prefer by ID, fallback to email filter)
    let userEntity;
    try {
      userEntity = await base44.asServiceRole.entities.User.get(authUser.id);
    } catch {
      const users = await base44.asServiceRole.entities.User.filter({ email });
      userEntity = users?.[0];
    }

    if (!userEntity) {
      return Response.json({
        ok: false,
        error: "USER_NOT_FOUND",
        message: "User entity not found"
      }, { status: 404 });
    }

    const before = {
      platform: userEntity.platform,
      last_login_platform: userEntity.last_login_platform,
      subscription_tier: userEntity.subscription_tier,
      subscription_level: userEntity.subscription_level,
      subscription_status: userEntity.subscription_status,
      stripe_customer_id: userEntity.stripe_customer_id,
    };

    // Run reconciliation
    const result = await reconcileUserEntitlements(base44, userEntity, { req });

    const finalTier = result.finalTier;
    const finalLevel = result.finalLevel;
    const finalStatus = result.finalStatus;
    const stripeCustomerId = result.stripeCustomerId;
    const providerUsed = result.providerUsed;

    // === UPDATE USER ENTITY ===
    const updates = {
      last_login_platform: platform,
      subscription_tier: finalTier,
      subscription_level: finalLevel,
      subscription_status: finalStatus,
    };

    // Only set platform if it's currently empty (don't overwrite original platform)
    if (!userEntity.platform) {
      updates.platform = platform;
    }

    // GUARD: Never blank stripe_customer_id once set
    if (stripeCustomerId && !userEntity.stripe_customer_id) {
      updates.stripe_customer_id = stripeCustomerId;
    }

    await base44.asServiceRole.entities.User.update(userEntity.id, updates);

    const after = {
      platform: updates.platform || userEntity.platform,
      last_login_platform: platform,
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
      reconciled: true,
    });

  } catch (error) {
    console.error("[reconcileEntitlementsOnLogin] error:", error);
    return Response.json({
      ok: false,
      error: "RECONCILE_FAILED",
      message: String(error?.message || error),
    }, { status: 500 });
  }
});