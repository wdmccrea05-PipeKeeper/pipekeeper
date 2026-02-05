/**
 * Stripe Diagnostics - Validate configuration
 * Returns deployment health status for UI
 */


import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import Stripe from "npm:stripe@17.6.0";

function getRuntimeEnv(req: Request): "live" | "preview" {
  try {
    const host = new URL(req.url).host.toLowerCase();
    if (host.includes("app.base44.com") || host.includes("preview") || host.includes("sandbox")) return "preview";
    if (host.includes("pipekeeper.app")) return "live";
    return "live"; // Default to live
  } catch {
    return "live";
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const environment = getRuntimeEnv(req);
    const results = {
      timestamp: new Date().toISOString(),
      environment,
      health: "HEALTHY" as "HEALTHY" | "UNHEALTHY",
      checks: {
        secret_present: false,
        stripe_init: false,
        api_connect: false,
      },
      details: {} as any,
    };

    // Check 1: Secret present
    const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
    results.checks.secret_present = !!secretKey && secretKey.startsWith("sk_");
    results.details.secret_key = secretKey ? `${secretKey.slice(0, 8)}...` : "MISSING";

    if (!results.checks.secret_present) {
      results.health = "UNHEALTHY";
      results.details.error = "STRIPE_SECRET_KEY not found or invalid";
      return Response.json(results);
    }

    // Check 2: Stripe initialization
    try {
      const stripe = new Stripe(secretKey, {
        apiVersion: "2024-12-18.acacia",
      });
      results.checks.stripe_init = true;

      // Check 3: API connectivity
      try {
        const prices = await stripe.prices.list({ limit: 1 });
        results.checks.api_connect = true;
        results.details.stripe_mode = secretKey.startsWith("sk_live_") ? "live" : "test";
        results.details.price_count = prices.data.length;
      } catch (apiErr: any) {
        results.checks.api_connect = false;
        results.details.api_error = apiErr.message;
        results.health = "UNHEALTHY";
      }
    } catch (initErr: any) {
      results.checks.stripe_init = false;
      results.details.init_error = initErr.message;
      results.health = "UNHEALTHY";
    }

    // Additional config checks
    results.details.price_ids = {
      premium_monthly: Deno.env.get("STRIPE_PRICE_ID_PREMIUM_MONTHLY") || "MISSING",
      premium_annual: Deno.env.get("STRIPE_PRICE_ID_PREMIUM_ANNUAL") || "MISSING",
      pro_monthly: Deno.env.get("STRIPE_PRICE_ID_PRO_MONTHLY") || "MISSING",
      pro_annual: Deno.env.get("STRIPE_PRICE_ID_PRO_ANNUAL") || "MISSING",
    };

    results.details.webhook_secret = Deno.env.get("STRIPE_WEBHOOK_SECRET") 
      ? `${Deno.env.get("STRIPE_WEBHOOK_SECRET")!.slice(0, 8)}...` 
      : "MISSING";

    return Response.json(results);
  } catch (err: any) {
    console.error("[stripeDiagnostics]", err);
    return Response.json({
      timestamp: new Date().toISOString(),
      environment: "unknown",
      health: "UNHEALTHY",
      checks: {
        secret_present: false,
        stripe_init: false,
        api_connect: false,
      },
      details: {
        error: err.message || "Unknown error",
      },
    }, { status: 500 });
  }
});