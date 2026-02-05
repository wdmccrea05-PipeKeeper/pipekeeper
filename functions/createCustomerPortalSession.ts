// DEPLOYMENT: 2026-02-02T03:50:00Z - v12 NO IMPORTS

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";


// Inline getStripeClient to avoid import issues
import Stripe from "npm:stripe@17.5.0";

let cachedStripe: Stripe | null = null;
let cachedKeyFingerprint: string | null = null;

function maskKey(key: string) {
  if (!key) return "(missing)";
  if (key.length < 10) return "****";
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

function fingerprint(key: string) {
  return `${key.slice(0, 7)}_${key.length}_${key.slice(-4)}`;
}

function isInvalidKey(key: string) {
  const k = (key || "").trim();
  if (!k) return true;
  if (k.startsWith("mk_")) return true;
  if (!k.startsWith("sk_")) return true;
  return false;
}

async function readRemoteConfigKey(base44: any, environment: "live" | "preview") {
  try {
    const recs = await base44.asServiceRole.entities.RemoteConfig.filter({
      key: "STRIPE_SECRET_KEY",
      environment,
    });
    const val = recs?.[0]?.value ? String(recs[0].value).trim() : "";
    return val;
  } catch (e) {
    console.log(`[getStripeClient] RemoteConfig read failed for ${environment}:`, e?.message);
    return "";
  }
}

async function getRuntimeEnv(req: Request): Promise<"live" | "preview"> {
  const hinted = (Deno.env.get("BASE44_ENVIRONMENT") || Deno.env.get("ENVIRONMENT") || "").toLowerCase();
  if (hinted.includes("live")) return "live";
  if (hinted.includes("preview") || hinted.includes("dev")) return "preview";
  
  const host = new URL(req.url).host.toLowerCase();
  if (host.includes("app.base44.com")) return "preview";
  return "live";
}

async function getStripeClient(req: Request, base44: any): Promise<{
  stripe: Stripe;
  meta: { source: "env" | "remoteConfig"; masked: string; environment: "live" | "preview" };
}> {
  const environment = await getRuntimeEnv(req);

  const envKey = (Deno.env.get("STRIPE_SECRET_KEY") || "").trim();
  if (!isInvalidKey(envKey)) {
    const fp = fingerprint(envKey);
    if (!cachedStripe || cachedKeyFingerprint !== fp) {
      cachedStripe = new Stripe(envKey, { apiVersion: "2024-06-20" });
      cachedKeyFingerprint = fp;
    }
    return { stripe: cachedStripe, meta: { source: "env", masked: maskKey(envKey), environment } };
  }
  

  const rcKey = (await readRemoteConfigKey(base44, environment)).trim();
  if (!isInvalidKey(rcKey)) {
    const fp = fingerprint(rcKey);
    if (!cachedStripe || cachedKeyFingerprint !== fp) {
      cachedStripe = new Stripe(rcKey, { apiVersion: "2024-06-20" });
      cachedKeyFingerprint = fp;
    }
    return { stripe: cachedStripe, meta: { source: "remoteConfig", masked: maskKey(rcKey), environment } };
  }

  throw new Error(`Stripe key missing/invalid. environment=${environment}`);
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Reads auth + ensures we can read necessary entities even if RLS blocks user-level reads.
// IMPORTANT: use asServiceRole for User/Subscription reads (server-side trusted).
Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return json(405, { ok: false, error: "Method not allowed" });
    }

    const base44 = createClientFromRequest(req);

    // Must be signed in
    const authUser = await base44.auth.me();
    if (!authUser?.id) {
      return json(401, { ok: false, error: "Not authenticated" });
    }

    // Parse body (optional)
    let body = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const returnUrl =
      (body?.returnUrl && String(body.returnUrl)) ||
      (req.headers.get("origin") || "https://pipekeeper.app");

    // ---- Service-role reads (avoid "Authentication required to view users") ----
    const srv = base44.asServiceRole;

    // 1) Get the user record
    const userRecord = await srv.entities.User.get(authUser.id).catch(() => null);
    if (!userRecord) {
      return json(404, { ok: false, error: "User record not found" });
    }

    // 2) Find Stripe customer ID from Subscription records
    let stripeCustomerId = "";

    // Try finding by user_id first, then by email
    let subs = await srv.entities.Subscription.filter({
      user_id: authUser.id,
      provider: "stripe",
    }).catch(() => []);

    if (!subs?.length) {
      subs = await srv.entities.Subscription.filter({
        user_email: authUser.email.toLowerCase(),
        provider: "stripe",
      }).catch(() => []);
    }

    // Find first active subscription with stripe_customer_id
    const activeSub = subs?.find(s => s.status === "active" && s.stripe_customer_id);
    const anySub = subs?.find(s => s.stripe_customer_id);
    
    stripeCustomerId = activeSub?.stripe_customer_id || anySub?.stripe_customer_id || "";

    if (!stripeCustomerId) {
      return json(400, {
        ok: false,
        error: "No Stripe subscription found",
        hint: "You need an active Stripe subscription to manage billing. Please subscribe first.",
      });
    }

    // Use inline Stripe client loader
    const { stripe, meta } = await getStripeClient(req, base44);
    console.log(`[createCustomerPortalSession] env=${meta.environment} source=${meta.source} key=${meta.masked}`);

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    return json(200, { ok: true, url: session.url });
  } catch (e) {
    const msg = e?.message || String(e);
    console.error("[createCustomerPortalSession] Error:", msg);

    return json(500, {
      ok: false,
      error: "Failed to create customer portal session",
      message: msg,
    });
  }
});