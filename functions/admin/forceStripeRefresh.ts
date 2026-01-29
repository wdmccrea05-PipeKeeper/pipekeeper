// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeClient, stripeSanityCheck, safeStripeError } from "../_utils/stripe.js";

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Force Stripe client refresh and validate new key
 * This endpoint:
 * 1. Forces a fresh Stripe client initialization
 * 2. Tests the new key with balance.retrieve()
 * 3. Returns validation status
 * 
 * Use this after updating STRIPE_SECRET_KEY to verify Preview picked up the change
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();

    if (authUser?.role !== "admin") {
      return json(403, { ok: false, error: "FORBIDDEN", message: "Admin access required" });
    }

    const timestampBefore = new Date().toISOString();

    // Force fresh Stripe client - this will read env var and create new instance
    let stripe;
    let initError = null;
    
    try {
      stripe = getStripeClient();
    } catch (e) {
      initError = safeStripeError(e);
      return json(200, {
        ok: false,
        error: "STRIPE_INIT_FAILED",
        message: initError,
        timestampBefore,
        timestampAfter: new Date().toISOString(),
      });
    }

    // Test the key
    let validationError = null;
    let validationSuccess = false;
    
    try {
      await stripeSanityCheck(stripe);
      validationSuccess = true;
    } catch (e) {
      validationError = safeStripeError(e);
    }

    const timestampAfter = new Date().toISOString();

    if (!validationSuccess) {
      return json(200, {
        ok: false,
        error: "STRIPE_VALIDATION_FAILED",
        message: validationError,
        hint: "Key initialized but API call failed - likely expired or invalid key",
        timestampBefore,
        timestampAfter,
      });
    }

    return json(200, {
      ok: true,
      message: "Stripe client refreshed and validated successfully",
      validated: validationSuccess,
      timestampBefore,
      timestampAfter,
    });
  } catch (error) {
    return json(500, { 
      ok: false, 
      error: "REFRESH_FAILED",
      message: safeStripeError(error) 
    });
  }
});