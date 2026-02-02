import { getStripeClient } from "../_shared/getStripeClient.ts";

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  try {
    const { meta } = await getStripeClient(req);
    return json(200, {
      ok: true,
      present: true,
      environment: meta.environment,
      source: meta.source,
      maskedKey: meta.masked,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return json(200, {
      ok: false,
      present: false,
      error: String(e?.message || e),
      timestamp: new Date().toISOString(),
    });
  }
});