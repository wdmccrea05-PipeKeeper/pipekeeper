// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeSecretKeyLive } from "../_shared/remoteConfig.ts";

function maskKey(key: string) {
  const k = String(key || "").trim();
  if (!k) return "(missing)";
  if (k.length < 10) return "****";
  return `${k.slice(0, 5)}…${k.slice(-5)}`;
}

function keyPrefix(key: string) {
  const k = String(key || "").trim();
  if (!k) return "N/A";
  const m = k.match(/^(sk_(live|test)|rk_(live|test)|pk_(live|test)|mk)_/);
  return m ? m[0] : "unknown";
}

function detectEnvironment(req: Request) {
  try {
    // Prefer forwarded host/header, since Base44 often sits behind a proxy
    const xfHost = req.headers.get("x-forwarded-host");
    const hostHeader = req.headers.get("host");
    const host = String(xfHost || hostHeader || new URL(req.url).hostname).toLowerCase();

    if (host.includes("localhost") || host.includes("127.0.0.1") || host.includes("preview")) return "preview";
    if (host.includes("pipekeeper.app") || host.includes("pipekeeper.com")) return "live";
    return "unknown";
  } catch {
    return "unknown";
  }
}

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();

    if (me?.role !== "admin") {
      return json(403, { ok: false, error: "FORBIDDEN", message: "Admin access required" });
    }

    const environment = detectEnvironment(req);

    // IMPORTANT: Read from RemoteConfig fallback, not Deno.env
    const key = (await getStripeSecretKeyLive(base44))?.trim() || "";

    return json(200, {
      ok: true,
      source: "RemoteConfig",
      envName: "STRIPE_SECRET_KEY",
      present: !!key,
      prefix: keyPrefix(key),
      masked: maskKey(key),
      length: key.length,
      environment,
      timestamp: new Date().toISOString(),
      note: "This reflects the key currently loaded via RemoteConfig fallback (not Deno.env).",
    });
  } catch (e) {
    return json(500, { ok: false, error: "RUNTIME_KEY_CHECK_FAILED", message: String(e?.message || e) });
  }
});