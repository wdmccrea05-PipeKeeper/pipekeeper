// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeKeyPrefix, getStripeSecretKey, safeStripeError } from "./_utils/stripe.js";

function maskKey(key) {
  const k = String(key || "").trim();
  if (!k) return "(missing)";
  if (k.length < 10) return "****";
  return `${k.slice(0, 6)}…${k.slice(-6)}`;
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();

    if (authUser?.role !== "admin") {
      return json(403, { ok: false, error: "FORBIDDEN" });
    }

    const raw = getStripeSecretKey();
    const prefix = getStripeKeyPrefix();

    return json(200, {
      ok: true,
      prefix,
      masked: maskKey(raw),
      ts: new Date().toISOString(),
      deno: typeof Deno !== "undefined" ? "present" : "missing",
    });
  } catch (e) {
    return json(500, { ok: false, error: safeStripeError(e) });
  }
});