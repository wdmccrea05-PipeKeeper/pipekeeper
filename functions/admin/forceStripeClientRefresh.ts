// Admin-only endpoint: Force refresh Stripe client singleton
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { clearStripeClientCache, verifyStripeConnection } from "../_shared/stripeClientSingleton.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    clearStripeClientCache();
    const verification = await verifyStripeConnection();

    return Response.json({
      ok: true,
      cache_cleared: true,
      connection_test: verification,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[forceStripeClientRefresh] Error:", error);
    return Response.json({ 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
});