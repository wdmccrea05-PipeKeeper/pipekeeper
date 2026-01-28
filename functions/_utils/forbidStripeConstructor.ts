export async function scanForForbiddenStripeConstructors() {
  const forbidden: string[] = [];
  try {
    // Attempt to read local filesystem (works in Base44 function runtime for project files).
    // If filesystem access is restricted, return "unknown" rather than failing silently.
    for await (const entry of Deno.readDir("./functions")) {
      await walkEntry(entry.name, forbidden);
    }
    return { ok: true, forbidden };
  } catch (e) {
    return { ok: false, error: String(e?.message || e), forbidden: [] as string[] };
  }
}

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
  if (path.endsWith("_utils/stripe.ts")) return;

  const text = await Deno.readTextFile(full);
  if (text.includes("new Stripe(")) {
    forbidden.push(path);
  }
}