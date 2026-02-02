function json(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

Deno.serve(async (_req: Request) => {
  return json(200, {
    ok: true,
    message: "admin endpoints reachable",
    timestamp: new Date().toISOString(),
  });
});