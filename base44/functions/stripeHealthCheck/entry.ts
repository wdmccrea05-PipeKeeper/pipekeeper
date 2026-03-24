// Stripe health check - verifies ENV key and API connectivity
// Updated: 2026-02-05
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeClient, StripeKeyError, safeStripeError } from "./_utils/stripeClient.ts";

Deno.serve(async (req: Request) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only
    if (user?.role !== "admin") {
      return Response.json({
        error: "FORBIDDEN",
        message: "Admin access required",
      }, { status: 403 });
    }

    // Try to get Stripe client
    let stripe, meta;
    try {
      const result = getStripeClient();
      stripe = result.stripe;
      meta = result.meta;
    } catch (err) {
      if (err instanceof StripeKeyError) {
        return Response.json({
          ok: false,
          error: err.code,
          message: err.message,
          envDetected: null,
          keyPrefix: null,
          keyLength: null,
          apiConnect: "FAIL",
        });
      }
      throw err;
    }

    // Test API connectivity
    let apiConnect = "FAIL";
    let apiError = null;
    try {
      await stripe.balance.retrieve();
      apiConnect = "PASS";
    } catch (err: any) {
      apiError = safeStripeError(err);
    }

    const key = Deno.env.get("STRIPE_SECRET_KEY") || "";
    
    return Response.json({
      ok: true,
      envDetected: meta.environment,
      keyPrefix: key.slice(0, 8),
      keyLength: key.length,
      keyMasked: meta.masked,
      apiConnect,
      apiError,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return Response.json({
      ok: false,
      error: "HEALTH_CHECK_FAILED",
      message: safeStripeError(error),
    }, { status: 500 });
  }
});