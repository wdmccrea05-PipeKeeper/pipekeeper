// Get Stripe client - callable function (no imports)
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import Stripe from "npm:stripe@17.5.0";

Deno.serve(async (req) => {
  try {
    console.log("[getStripeClient] ===== START =====");
    
    const base44 = createClientFromRequest(req);
    const srv = base44.asServiceRole;

    // Fetch from RemoteConfig
    console.log("[getStripeClient] Fetching from RemoteConfig...");
    const recs = await srv.entities.RemoteConfig.list();
    console.log("[getStripeClient] Total RemoteConfig records:", recs?.length || 0);
    
    const rec0 = recs?.find((r) => r.key === "STRIPE_SECRET_KEY" && r.environment === "live" && r.is_active);
    console.log("[getStripeClient] Found live key:", !!rec0);
    
    const key = rec0?.value ? String(rec0.value).trim() : "";

    if (!key) {
      console.error("[getStripeClient] No key found");
      return Response.json({ error: "No Stripe key found" }, { status: 500 });
    }

    if (key.startsWith("mk_")) {
      console.error("[getStripeClient] FATAL: mk_ key detected");
      return Response.json({ error: "Invalid test key (mk_)" }, { status: 500 });
    }

    if (!key.startsWith("sk_live_") && !key.startsWith("sk_test_")) {
      console.error("[getStripeClient] Invalid key prefix:", key.slice(0, 8));
      return Response.json({ error: "Invalid key format" }, { status: 500 });
    }

    console.log("[getStripeClient] Key prefix:", key.slice(0, 8), "...", key.slice(-4));
    
    return Response.json({ 
      key,
      prefix: key.slice(0, 8),
      suffix: key.slice(-4)
    }, { status: 200 });
  } catch (e) {
    console.error("[getStripeClient] Error:", e?.message || e);
    return Response.json({ error: String(e?.message || e) }, { status: 500 });
  }
});