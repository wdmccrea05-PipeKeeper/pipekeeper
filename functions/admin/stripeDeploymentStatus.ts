// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeClient, stripeSanityCheck, safeStripeError, getStripeKeyPrefix } from "../_utils/stripe.js";

function maskKey(key) {
  if (!key) return "(missing)";
  const k = String(key).trim();
  if (k.length < 10) return "****";
  return `${k.slice(0, 7)}…${k.slice(-4)}`;
}

function detectEnvironment(req) {
  try {
    const url = new URL(req.url);
    const host = url.hostname.toLowerCase();
    
    if (host.includes("preview") || host.includes("localhost") || host.includes("127.0.0.1")) {
      return "preview";
    }
    
    if (host.includes("pipekeeper.app") || host.includes("pipekeeper.com")) {
      return "live";
    }
    
    return "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Comprehensive deployment status check
 * Returns:
 * - Runtime environment detection
 * - Stripe key status
 * - API connectivity test
 * - Deployment recommendations
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();

    if (authUser?.role !== "admin") {
      return Response.json({ 
        ok: false, 
        error: "FORBIDDEN" 
      }, { status: 403 });
    }

    const environment = detectEnvironment(req);
    const timestampStart = new Date().toISOString();

    // Check 1: Secret presence
    const rawKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const keyPresent = rawKey.trim().length > 0;
    const keyPrefix = getStripeKeyPrefix();
    const keyMasked = maskKey(rawKey);
    
    // Check 2: Key validity
    let stripeInitSuccess = false;
    let stripeInitError = null;
    let stripe = null;
    
    try {
      stripe = getStripeClient();
      stripeInitSuccess = true;
    } catch (e) {
      stripeInitError = safeStripeError(e);
    }

    // Check 3: API connectivity
    let apiConnectSuccess = false;
    let apiConnectError = null;
    
    if (stripeInitSuccess && stripe) {
      try {
        await stripeSanityCheck(stripe);
        apiConnectSuccess = true;
      } catch (e) {
        apiConnectError = safeStripeError(e);
      }
    }

    const timestampEnd = new Date().toISOString();

    // Determine deployment health
    const isHealthy = keyPresent && keyPrefix === "sk" && stripeInitSuccess && apiConnectSuccess;
    
    let recommendation = "";
    if (!keyPresent) {
      recommendation = "CRITICAL: Set STRIPE_SECRET_KEY in Dashboard → Secrets, then redeploy functions";
    } else if (keyPrefix !== "sk") {
      recommendation = "ERROR: STRIPE_SECRET_KEY must be a secret key (sk_), not a publishable/restricted key";
    } else if (!stripeInitSuccess) {
      recommendation = "ERROR: Stripe initialization failed - key may be malformed";
    } else if (!apiConnectSuccess) {
      recommendation = "ERROR: Stripe API call failed - key may be expired/revoked. Update secret and redeploy.";
    } else {
      recommendation = "OK: All checks passed";
    }

    return Response.json({
      ok: isHealthy,
      environment,
      deployment: {
        healthy: isHealthy,
        recommendation,
        timestampStart,
        timestampEnd,
      },
      checks: {
        secretPresent: {
          passed: keyPresent,
          keyPrefix,
          keyMasked,
        },
        stripeInit: {
          passed: stripeInitSuccess,
          error: stripeInitError,
        },
        apiConnect: {
          passed: apiConnectSuccess,
          error: apiConnectError,
        },
      },
      instructions: !isHealthy ? {
        step1: "Update STRIPE_SECRET_KEY in Dashboard → Settings → Secrets",
        step2: "Click 'Force Refresh' in Stripe Diagnostics",
        step3: "If still failing → Manually trigger 'Redeploy Functions' in Base44 Dashboard",
        step4: "Re-run this check to verify",
      } : null,
    });
  } catch (error) {
    return Response.json({ 
      ok: false, 
      error: "STATUS_CHECK_FAILED",
      message: safeStripeError(error)
    }, { status: 500 });
  }
});