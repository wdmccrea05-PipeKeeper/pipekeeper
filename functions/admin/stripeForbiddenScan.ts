import { getStripeClient } from "../_shared/getStripeClient.ts";

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  try {
    const { stripe, meta } = await getStripeClient(req);
    const balance = await stripe.balance.retrieve();
    return json(200, {
      ok: true,
      environment: meta.environment,
      source: meta.source,
      maskedKey: meta.masked,
      apiReachable: true,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return json(200, {
      ok: false,
      error: String(e?.message || e),
      timestamp: new Date().toISOString(),
    });
  }
});