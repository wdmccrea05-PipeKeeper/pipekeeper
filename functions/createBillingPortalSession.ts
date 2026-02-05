// Force redeploy: 2026-02-01
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import Stripe from "npm:stripe@17.5.0";

const APP_URL = Deno.env.get("APP_URL") || "https://pipekeeper.app";


// Inlined Stripe utilities
async function getStripeClient(req: Request): Promise<Stripe> {
  console.log("[stripe] ========== STRIPE CLIENT INIT START ==========");
  
  let key = "";
  let source = "env";
  
  const envKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
  if (envKey && envKey.startsWith("sk_")) {
    key = envKey;
    source = "env";
    console.log(`[stripe] ✅ Using key from ENV: ${key.slice(0, 8)}...${key.slice(-4)}`);
  } else {
    const base44 = createClientFromRequest(req);
    const environment = await getRuntimeEnv(req);
    const rcKey = await readRemoteConfigKey(base44, environment);
    if (rcKey && rcKey.startsWith("sk_")) {
      key = rcKey;
      source = "remoteConfig";
      console.log(`[stripe] ✅ Using key from RemoteConfig: ${key.slice(0, 8)}...${key.slice(-4)}`);
    }
  }

  if (!key) {
    throw new Error("Stripe secret key missing from env and RemoteConfig");
  }

  if (!key.startsWith("sk_live_") && !key.startsWith("sk_test_")) {
    throw new Error(`Invalid Stripe key format from ${source}: ${key.slice(0, 8)}...`);
  }

  const stripe = new Stripe(key, { apiVersion: "2024-06-20" });
  console.log(`[stripe] ✅ Stripe client created (source: ${source})`);
  console.log("[stripe] ========== STRIPE CLIENT INIT END ==========");
  return stripe;
}

async function getRuntimeEnv(req: Request): Promise<"live" | "preview"> {
  const hinted = (Deno.env.get("BASE44_ENVIRONMENT") || Deno.env.get("ENVIRONMENT") || "").toLowerCase();
  if (hinted.includes("live")) return "live";
  if (hinted.includes("preview") || hinted.includes("dev")) return "preview";
  const host = new URL(req.url).host.toLowerCase();
  if (host.includes("app.base44.com")) return "preview";
  return "live";
}

async function readRemoteConfigKey(base44: any, environment: "live" | "preview"): Promise<string> {
  try {
    const recs = await base44.asServiceRole.entities.RemoteConfig.filter({
      key: "STRIPE_SECRET_KEY",
      environment,
    });
    return recs?.[0]?.value ? String(recs[0].value).trim() : "";
  } catch (e: any) {
    console.log(`[getStripeClient] RemoteConfig read failed for ${environment}:`, e?.message);
    return "";
  }
}

function safeStripeError(e: any): string {
  if (!e) return "Unknown Stripe error";
  if (typeof e === "string") return e;
  if (e.message) return e.message;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

async function stripeSanityCheck(stripe: Stripe) {
  // Optional: verify client works
}

function stripeKeyErrorResponse(e: any) {
  return {
    ok: false,
    error: "STRIPE_KEY_ERROR",
    message: safeStripeError(e)
  };
}

function getPlatform(req) {
  try {
    const url = new URL(req.url);
    const platform = (url.searchParams.get("platform") || "").toLowerCase();
    return platform === "ios" ? "ios_companion" : "web_android";
  } catch {
    return "web_android";
  }
}

function safeOrigin(req) {
  const origin = req.headers.get("origin");
  if (origin && origin.startsWith("http")) return origin;
  return APP_URL;
}

async function safePersistCustomerId(base44, email, customerId) {
  try {
    const authApi = base44?.asServiceRole?.auth;
    if (authApi && typeof authApi.updateUser === "function") {
      await authApi.updateUser(email, { stripe_customer_id: customerId });
    }
  } catch (e) {
    console.warn("[createBillingPortalSession] persist skipped/failed:", e?.message || e);
  }
}

Deno.serve(async (req) => {
  try {
    const platform = getPlatform(req);

    if (platform === "ios_companion") {
      return Response.json({ error: "Not available in iOS companion app." }, { status: 403 });
    }

    let stripe;
    try {
      stripe = await getStripeClient(req);
      await stripeSanityCheck(stripe);
    } catch (e) {
      return Response.json(stripeKeyErrorResponse(e), { status: 500 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let customerId = user.stripe_customer_id || null;

    if (!customerId) {
      try {
        const existing = await stripe.customers.list({ email: user.email, limit: 1 });
        customerId = existing.data?.[0]?.id || null;
      } catch (e) {
        return Response.json({
          ok: false,
          error: "STRIPE_CALL_FAILED",
          message: safeStripeError(e)
        }, { status: 500 });
      }
    }

    if (!customerId) {
      return Response.json({
        error: "No Stripe customer found for this account yet. Please subscribe first."
      }, { status: 400 });
    }

    if (!user.stripe_customer_id) {
      await safePersistCustomerId(base44, user.email, customerId);
    }

    const origin = safeOrigin(req);

    let portalSession;
    try {
      portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${origin}/Profile`,
      });
    } catch (e) {
      return Response.json({
        ok: false,
        error: "PORTAL_CREATION_FAILED",
        message: safeStripeError(e)
      }, { status: 500 });
    }

    return Response.json({ url: portalSession.url });
  } catch (error) {
    console.error("[createBillingPortalSession] error:", error);
    return Response.json({
      ok: false,
      error: "FUNCTION_ERROR",
      message: safeStripeError(error)
    }, { status: 500 });
  }
});