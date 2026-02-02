// Scan for forbidden Stripe constructors - callable function
Deno.serve(async (_req) => {
  const forbidden: string[] = [];
  try {
    for await (const entry of Deno.readDir("./functions")) {
      await walkEntry(entry.name, forbidden);
    }
    return Response.json({ ok: true, forbidden });
  } catch (e) {
    return Response.json({ 
      ok: false, 
      error: String(e?.message || e), 
      forbidden: [] 
    }, { status: 500 });
  }
});

async function walkEntry(path: string, forbidden: string[]) {
  const full = `./functions/${path}`;
  const stat = await Deno.stat(full);

  if (stat.isDirectory) {
    for await (const entry of Deno.readDir(full)) {
      await walkEntry(`${path}/${entry.name}`, forbidden);
    }
    return;
  }

  if (!path.endsWith(".ts")) return;
  if (path.includes("getStripeClient.ts")) return;

  const text = await Deno.readTextFile(full);
  if (text.includes("new Stripe(")) {
    forbidden.push(path);
  }
}