// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import Stripe from "npm:stripe@17.5.0";
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

async function testStripeApi(key: string) {
  // Minimal "permission + connectivity" check
  const stripe = new Stripe(key, { apiVersion: "2024-06-20" as any });
  // balance.retrieve is safe and commonly allowed; if this fails with 401/403 it tells us a lot
  const balance = await stripe.balance.retrieve();
  return { ok: true, currencyCount: (balance?.available || []).length };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();

    if (me?.role !== "admin") {
      return json(403, { ok: false, error: "FORBIDDEN", message: "Admin access required" });
    }

    const environment = detectEnvironment(req);

    // IMPORTANT: RemoteConfig fallback
    const key = (await getStripeSecretKeyLive(base44))?.trim() || "";
    const present = !!key;

    let stripeInit = false;
    let apiConnect = false;
    let apiError: any = null;

    if (present) {
      try {
        stripeInit = true;
        await testStripeApi(key);
        apiConnect = true;
      } catch (e) {
        apiError = {
          message: String(e?.message || e),
          type: e?.type,
          code: e?.code,
          statusCode: e?.statusCode,
        };
      }
    }

    const unhealthyReasons: string[] = [];
    if (!present) unhealthyReasons.push("STRIPE_SECRET_KEY missing in RemoteConfig live");
    if (present && !apiConnect) unhealthyReasons.push("Stripe API call failed (likely bad/expired key or account restriction)");

    return json(200, {
      ok: true,
      environment,
      health: unhealthyReasons.length ? "UNHEALTHY" : "HEALTHY",
      checkResults: {
        secretPresent: present,
        stripeInit,
        apiConnect,
      },
      runtimeKey: {
        source: "RemoteConfig",
        prefix: keyPrefix(key),
        masked: maskKey(key),
        length: key.length,
      },
      apiError,
      timestamp: new Date().toISOString(),
      notes: [
        "This status uses RemoteConfig fallback, not Deno.env.",
        "If apiConnect is false with 401/403, the key/account is the issue, not Base44 secret propagation.",
      ],
    });
  } catch (e) {
    return json(500, { ok: false, error: "DEPLOYMENT_STATUS_FAILED", message: String(e?.message || e) });
  }
});