// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeSecretKey, getStripeKeyPrefix, safeStripeError } from "../_utils/stripe.js";

function maskKey(key) {
  const k = String(key || "").trim();
  if (!k) return "(missing)";
  if (k.length < 10) return "****";
  return `${k.slice(0, 5)}…${k.slice(-5)}`;
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
      return json(403, { ok: false, error: "FORBIDDEN", message: "Admin access required" });
    }

    try {
      const raw = getStripeSecretKey();
      const prefix = getStripeKeyPrefix();
      const present = !!raw && raw.length > 0;
      const length = raw ? raw.length : 0;

      return json(200, {
        ok: true,
        envName: "STRIPE_SECRET_KEY",
        present,
        prefix,
        masked: maskKey(raw),
        length,
        timestamp: new Date().toISOString(),
        deploymentNote: "This shows the ACTUAL key loaded in THIS deployment runtime",
      });
    } catch (e) {
      return json(200, {
        ok: false,
        envName: "STRIPE_SECRET_KEY",
        present: false,
        prefix: "error",
        masked: "(error)",
        length: 0,
        timestamp: new Date().toISOString(),
        error: safeStripeError(e),
      });
    }
  } catch (e) {
    return json(500, { 
      ok: false, 
      error: "ADMIN_AUTH_FAILED",
      message: safeStripeError(e) 
    });
  }
});