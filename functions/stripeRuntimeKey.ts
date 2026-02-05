import { getStripeClient } from "./_shared/getStripeClient.ts";

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  try {
    const { stripe, meta } = await getStripeClient(req);
    
    // Extract prefix from masked key
    const masked = meta.masked || "";
    const prefix = masked.split("_")[0] || "unknown";
    
    return json(200, {
      ok: true,
      present: true,
      prefix,
      masked: meta.masked,
      environment: meta.environment,
      source: meta.source,
      length: meta.keyLength || 0,
      timestamp: new Date().toISOString(),
      looksExpired: masked.toLowerCase().includes("expired") || masked.toLowerCase().includes("revoked"),
    });
  } catch (e: any) {
    return json(200, {
      ok: false,
      present: false,
      prefix: "missing",
      error: String(e?.message || e),
      timestamp: new Date().toISOString(),
      where: "stripeRuntimeKey",
      hint: "Check STRIPE_SECRET_KEY in ENV or RemoteConfig",
    });
  }
});