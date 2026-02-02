// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  try {
    console.log("[getStripeSecretKey] ===== START =====");
    console.log("[getStripeSecretKey] Timestamp:", new Date().toISOString());

    const base44 = createClientFromRequest(req);
    const srv = base44.asServiceRole;

    console.log("[getStripeSecretKey] Fetching from RemoteConfig...");
    
    const recs = await srv.entities.RemoteConfig.list();
    console.log("[getStripeSecretKey] Total RemoteConfig records:", recs?.length || 0);
    
    const rec0 = recs?.find((r) => r.key === "STRIPE_SECRET_KEY" && r.environment === "live" && r.is_active);
    console.log("[getStripeSecretKey] Found live key record:", !!rec0);
    
    const remoteVal = rec0?.value ? String(rec0.value).trim() : "";

    if (remoteVal && remoteVal.startsWith("sk_live_")) {
      console.log("[getStripeSecretKey] ✅ Returning live key:", remoteVal.slice(0, 8), "...");
      return new Response(JSON.stringify({
        ok: true,
        key: remoteVal,
        source: "remote"
      }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
    
    console.log("[getStripeSecretKey] ❌ No valid key found");
    return new Response(JSON.stringify({
      ok: false,
      error: "No valid Stripe secret key found in RemoteConfig"
    }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  } catch (e) {
    console.error("[getStripeSecretKey] Error:", e?.message || e);
    return new Response(JSON.stringify({
      ok: false,
      error: String(e?.message || e)
    }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
});