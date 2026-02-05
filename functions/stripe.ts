import Stripe from "npm:stripe@17.5.0";
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

function maskKey(key) {
  if (!key || key.length < 12) return "(missing)";
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

function isInvalidKey(key) {
  const k = (key || "").trim();
  if (!k) return true;
  if (k.startsWith("mk_")) return true;
  if (!k.startsWith("sk_")) return true;
  return false;
}

async function readRemoteConfigKey(base44, environment) {
  try {
    const recs = await base44.asServiceRole.entities.RemoteConfig.filter({
      key: "STRIPE_SECRET_KEY",
      environment,
    });
    return recs?.[0]?.value ? String(recs[0].value).trim() : "";
  } catch (e) {
    console.log(`[getStripeClient] RemoteConfig read failed for ${environment}:`, e?.message);
    return "";
  }
}

async function getRuntimeEnv(req) {
  const hinted = (Deno.env.get("BASE44_ENVIRONMENT") || Deno.env.get("ENVIRONMENT") || "").toLowerCase();
  if (hinted.includes("live")) return "live";
  if (hinted.includes("preview") || hinted.includes("dev")) return "preview";
  const host = new URL(req.url).host.toLowerCase();
  if (host.includes("app.base44.com")) return "preview";
  return "live";
}

async function getStripeSecretKeyLive(req) {
  const base44 = createClientFromRequest(req);
  
  console.log("[remoteConfig] ===== NEW REQUEST =====");
  console.log("[remoteConfig] Strategy: ENV-first (standard), RemoteConfig as backup");

  // 1) STANDARD PROCESS: Try env var first
  const envVal = (Deno.env.get("STRIPE_SECRET_KEY") || "").trim();
  if (envVal && envVal.startsWith("sk_live_")) {
    console.log("[remoteConfig] ✅ Using live key from ENV (standard):", envVal.slice(0, 8), "...", envVal.slice(-4));
    return { value: envVal, source: "env" };
  }
  
  if (envVal) {
    console.warn("[remoteConfig] ⚠️ ENV key found but not sk_live_:", envVal.slice(0, 8));
  } else {
    console.warn("[remoteConfig] ⚠️ No STRIPE_SECRET_KEY in ENV, trying RemoteConfig backup...");
  }

  // 2) BACKUP: Try RemoteConfig if env var failed
  try {
    if (!req) {
      console.warn("[remoteConfig] No request provided, skipping RemoteConfig");
      throw new Error("Request required for RemoteConfig fetch");
    }
    
    const environment = await getRuntimeEnv(req);
    
    console.log("[remoteConfig] Fetching from RemoteConfig via asServiceRole (backup)...");
    
    const recs = await base44.asServiceRole.entities.RemoteConfig.list();
    console.log("[remoteConfig] Total RemoteConfig records:", recs?.length || 0);

    const rec0 = recs?.find((r) => r.key === "STRIPE_SECRET_KEY" && r.environment === "live" && r.is_active);
    const remoteVal = rec0?.value ? String(rec0.value).trim() : "";

    // Validate it's a real Stripe key (not test/invalid)
    if (remoteVal && remoteVal.startsWith("sk_live_")) {
      console.log("[remoteConfig] ✅ Using live key from RemoteConfig (backup):", remoteVal.slice(0, 8), "...", remoteVal.slice(-4));
      return { value: remoteVal, source: "remote" };
    }
    
    if (remoteVal) {
      console.warn("[remoteConfig] ⚠️ Found RemoteConfig key but not sk_live_:", remoteVal.slice(0, 8));
    } else {
      console.warn("[remoteConfig] ⚠️ No valid RemoteConfig key found");
    }
  } catch (e) {
    console.error("[remoteConfig] ❌ RemoteConfig fetch failed:", e?.message || e);
  }

  console.log("[remoteConfig] ❌ No valid key found from ENV or RemoteConfig");
  return { value: "", source: "missing" };
}

/**
 * Creates Stripe client with standard process (env var first, RemoteConfig backup)
 */
export async function getStripeClient(req) {
  console.log("[stripe] ========== STRIPE CLIENT INIT START ==========");
  
  let key;
  let source;

  // STANDARD PROCESS: Try env var first
  const envKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
  if (envKey && envKey.startsWith("sk_")) {
    key = envKey;
    source = "env";
    console.log(`[stripe] ✅ Using key from ENV (standard): ${key.slice(0, 8)}...${key.slice(-4)}`);
  } else {
    // BACKUP: Fetch from RemoteConfig
    if (!req) {
      throw new Error("Request required for RemoteConfig fallback");
    }
    console.log("[stripe] ENV key not valid, fetching from RemoteConfig (backup)...");
    const result = await getStripeSecretKeyLive(req);
    key = result.value;
    source = result.source;
    console.log(`[stripe] ✅ Using key from RemoteConfig (backup): ${key ? key.slice(0, 8) : "(none)"}...${key ? key.slice(-4) : ""}`);
  }

  if (!key) {
    console.error("[stripe] ❌ No valid key found");
    throw new Error("Stripe secret key missing from env and RemoteConfig");
  }

  // Validate key format
  if (!key.startsWith("sk_live_") && !key.startsWith("sk_test_")) {
    console.error(`[stripe] ❌ Invalid key format: ${key.slice(0, 8)}`);
    throw new Error(`Invalid Stripe key format from ${source}: ${key.slice(0, 8)}...`);
  }

  // Create Stripe client
  try {
    const stripe = new Stripe(key, {
      apiVersion: "2024-06-20",
    });
    console.log(`[stripe] ✅ Stripe client created (source: ${source})`);
    console.log("[stripe] ========== STRIPE CLIENT INIT END ==========");
    return { stripe, source };
  } catch (e) {
    console.error("[stripe] ❌ Failed to create Stripe client:", e?.message);
    throw new Error(`Failed to initialize Stripe: ${e?.message || e}`);
  }
}

export function safeStripeError(e) {
  if (!e) return "Unknown Stripe error";
  if (typeof e === "string") return e;
  if (e.message) return e.message;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

export async function stripeSanityCheck(stripe) {
  // Optional: verify client works
}

export function stripeKeyErrorResponse(e) {
  return {
    ok: false,
    error: "STRIPE_KEY_ERROR",
    message: safeStripeError(e)
  };
}