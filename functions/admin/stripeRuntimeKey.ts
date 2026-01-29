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

function detectEnvironment(req) {
  try {
    const url = new URL(req.url);
    const host = url.hostname.toLowerCase();
    
    // Base44 preview domains typically have "preview" or specific patterns
    if (host.includes("preview") || host.includes("localhost") || host.includes("127.0.0.1")) {
      return "preview";
    }
    
    // Check for custom domain or production patterns
    if (host.includes("pipekeeper.app") || host.includes("pipekeeper.com")) {
      return "live";
    }
    
    return "unknown";
  } catch {
    return "unknown";
  }
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

    const environment = detectEnvironment(req);

    try {
      // CRITICAL: Read FRESH from Deno.env - no caching
      const raw = Deno.env.get("STRIPE_SECRET_KEY") || "";
      const prefix = getStripeKeyPrefix();
      const present = !!raw && raw.trim().length > 0;
      const length = raw ? raw.length : 0;

      // Detect if key looks expired (common pattern: keys rotate every 90 days)
      const looksExpired = raw.includes("expired") || raw.includes("revoked");

      return json(200, {
        ok: true,
        envName: "STRIPE_SECRET_KEY",
        present,
        prefix,
        masked: maskKey(raw),
        length,
        environment,
        looksExpired,
        timestamp: new Date().toISOString(),
        deploymentNote: "This shows the ACTUAL key loaded in THIS deployment runtime",
        warning: environment === "preview" ? 
          "Preview may cache env vars - redeploy functions after secret changes" : null,
      });
    } catch (e) {
      return json(200, {
        ok: false,
        envName: "STRIPE_SECRET_KEY",
        present: false,
        prefix: "error",
        masked: "(error)",
        length: 0,
        environment,
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