import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

// CACHE COMPLETELY DISABLED - Always fetch fresh
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
  
  console.log("[remoteConfig] ===== NEW REQUEST =====");
  console.log("[remoteConfig] Flags:", { forceRefresh, forceRemote });

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

    const rec0 = recs?.find((r) => r.key === "STRIPE_SECRET_KEY" && r.environment === "live" && r.is_active);
    console.log("[remoteConfig] Found live key record:", !!rec0);
    console.log("[remoteConfig] Record details:", rec0 ? { key: rec0.key, env: rec0.environment, active: rec0.is_active, valuePrefix: rec0.value?.slice(0, 4) } : "null");
    
    const remoteVal = rec0?.value ? String(rec0.value).trim() : "";

    // Validate it's a real Stripe key (not test/invalid)
    if (remoteVal && remoteVal.startsWith("sk_live_")) {
      console.log("[remoteConfig] ✅ Using live key from RemoteConfig:", remoteVal.slice(0, 8), "...", remoteVal.slice(-4));
      return { value: remoteVal, source: "remote" };
    }
    
    if (remoteVal) {
      console.warn("[remoteConfig] ⚠️ Found key but not sk_live_:", remoteVal.slice(0, 8));
    } else {
      console.warn("[remoteConfig] ⚠️ No RemoteConfig value found for STRIPE_SECRET_KEY + live");
    }
  } catch (e) {
    console.error("[remoteConfig] ❌ RemoteConfig fetch failed:", e?.message || e);
  }

  // 2) COMPLETELY SKIP ENV VAR - ONLY USE REMOTECONFIG
  const envVal = (Deno.env.get("STRIPE_SECRET_KEY") || "").trim();
  console.log("[remoteConfig] Env STRIPE_SECRET_KEY found but IGNORING:", envVal ? `${envVal.slice(0, 8)}...${envVal.slice(-4)}` : "(empty)");
  console.log("[remoteConfig] ⚠️ Environment variables are DISABLED - only RemoteConfig is used");

  console.log("[remoteConfig] ❌ No valid key found");
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