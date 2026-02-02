import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

// In-memory cache (per function instance)
let cachedValue: string | null = null;
let cachedSource: "remote" | "env" | "missing" = "missing";
let lastFetchMs = 0;

// Default cache TTL (ms)
const TTL_MS = 60_000;

function now() {
  return Date.now();
}

function readFlags(req?: Request) {
  if (!req) return { forceRefresh: false, forceRemote: false };
  try {
    const u = new URL(req.url);
    const forceRefresh =
      u.searchParams.get("pk_force_refresh") === "1" ||
      u.searchParams.get("pk_force_refresh") === "true";
    const forceRemote =
      u.searchParams.get("pk_force_remote") === "1" ||
      u.searchParams.get("pk_force_remote") === "true";
    return { forceRefresh, forceRemote };
  } catch {
    return { forceRefresh: false, forceRemote: false };
  }
}

/**
 * Fetch a "live" Stripe secret key from RemoteConfig, with env-var fallback.
 * RemoteConfig record expected:
 *   key: "STRIPE_SECRET_KEY"
 *   value: "sk_live_..."
 *   environment: "live"
 */
export async function getStripeSecretKeyLive(req?: Request): Promise<{
  value: string;
  source: "remote" | "env" | "missing";
}> {
  const { forceRefresh, forceRemote } = readFlags(req);

  // Cache hit (unless forced refresh)
  if (!forceRefresh && cachedValue && now() - lastFetchMs < TTL_MS) {
    return { value: cachedValue, source: cachedSource };
  }

  // Force refresh: invalidate cache timestamp/value
  if (forceRefresh) {
    cachedValue = null;
    cachedSource = "missing";
    lastFetchMs = 0;
  }

  // 1) Try RemoteConfig (service role) - ALWAYS prioritize this
  try {
    if (!req) {
      console.warn("[remoteConfig] No request provided, skipping RemoteConfig");
      throw new Error("Request required for RemoteConfig fetch");
    }
    
    const base44 = createClientFromRequest(req);
    const srv = base44.asServiceRole;

    console.log("[remoteConfig] Fetching from RemoteConfig via asServiceRole...");
    
    const recs = await srv.entities.RemoteConfig.list();
    console.log("[remoteConfig] Total RemoteConfig records:", recs?.length || 0);
    
    if (recs && recs.length > 0) {
      console.log("[remoteConfig] RemoteConfig records found:", recs.map(r => ({ key: r.key, env: r.environment, active: r.is_active })));
    }

    const rec0 = recs?.find((r) => r.key === "STRIPE_SECRET_KEY" && r.environment === "live");
    console.log("[remoteConfig] Found live key record:", !!rec0);
    
    const remoteVal = rec0?.value ? String(rec0.value).trim() : "";
    
    // Validate it's a real Stripe key (not test/invalid)
    if (remoteVal && remoteVal.startsWith("sk_live_")) {
      console.log("[remoteConfig] ✅ Using live key from RemoteConfig");
      cachedValue = remoteVal;
      cachedSource = "remote";
      lastFetchMs = now();
      return { value: remoteVal, source: "remote" };
    }
    
    if (remoteVal) {
      console.warn("[remoteConfig] ⚠️ Found key but not sk_live_:", remoteVal.slice(0, 8));
    }
  } catch (e) {
    console.error("[remoteConfig] ❌ RemoteConfig fetch failed:", e?.message || e);
  }

  // 2) Env var fallback - but REJECT invalid keys
  if (!forceRemote) {
    const envVal = (Deno.env.get("STRIPE_SECRET_KEY") || "").trim();
    
    // Reject test/invalid keys - do NOT use them
    if (envVal && (envVal.startsWith("mk_") || envVal.startsWith("pk_"))) {
      console.warn("[remoteConfig] ⚠️ Env key is invalid (mk_/pk_), rejecting");
      cachedValue = "";
      cachedSource = "missing";
      lastFetchMs = now();
      return { value: "", source: "missing" };
    }
    
    if (envVal) {
      console.log("[remoteConfig] Using env key:", envVal.slice(0, 8));
      cachedValue = envVal;
      cachedSource = "env";
      lastFetchMs = now();
      return { value: envVal, source: "env" };
    }
  }

  cachedValue = "";
  cachedSource = "missing";
  lastFetchMs = now();
  return { value: "", source: "missing" };
}

/**
 * Fetch Stripe webhook secret from RemoteConfig, with env-var fallback.
 */
export async function getStripeWebhookSecretLive(req?: Request): Promise<{
  value: string;
  source: "remote" | "env" | "missing";
}> {
  try {
    if (!req) throw new Error("Request required for RemoteConfig fetch");
    const base44 = createClientFromRequest(req);
    const srv = base44.asServiceRole;

    const recs = await srv.entities.RemoteConfig.filter({
      key: "STRIPE_WEBHOOK_SECRET",
      environment: "live",
    });

    const rec0 = Array.isArray(recs) ? recs[0] : null;
    const remoteVal = rec0?.value ? String(rec0.value).trim() : "";

    if (remoteVal) {
      return { value: remoteVal, source: "remote" };
    }
  } catch (e) {
    console.warn("[remoteConfig] RemoteConfig fetch failed for webhook secret:", String(e?.message || e));
  }

  // Env fallback
  const envVal = (Deno.env.get("STRIPE_WEBHOOK_SECRET") || "").trim();
  if (envVal) {
    return { value: envVal, source: "env" };
  }

  return { value: "", source: "missing" };
}

function maskKey(k: string): string {
  if (!k) return "(empty)";
  if (k.length < 12) return "***";
  return k.slice(0, 8) + "***" + k.slice(-4);
}