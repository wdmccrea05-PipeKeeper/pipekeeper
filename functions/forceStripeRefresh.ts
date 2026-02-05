import { getStripeSecretKey } from "./_shared/getStripeClient.ts";

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  try {
    const meta = await getStripeSecretKey(req);
    return json(200, {
      ok: true,
      source: meta.source,
      masked: meta.masked,
      environment: meta.environment,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return json(200, {
      ok: false,
      error: String(e?.message || e),
      timestamp: new Date().toISOString(),
      where: "forceStripeRefresh",
      hint: "Check STRIPE_SECRET_KEY in ENV or RemoteConfig"
    });
  }
});