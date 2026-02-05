import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

function readFlags(req) {
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
 * Fetch a "live" Stripe secret key - prioritizes env var (standard), with RemoteConfig as backup.
 */
export async function getStripeSecretKeyLive(req) {
  const { forceRefresh, forceRemote } = readFlags(req);
  
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
    
    const base44 = createClientFromRequest(req);
    const srv = base44.asServiceRole;

    console.log("[remoteConfig] Fetching from RemoteConfig via asServiceRole (backup)...");
    
    const recs = await srv.entities.RemoteConfig.list();
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
 * Fetch Stripe webhook secret - prioritizes env var (standard), with RemoteConfig as backup.
 */
export async function getStripeWebhookSecretLive(req) {
  // 1) Standard: Try env var first
  const envVal = (Deno.env.get("STRIPE_WEBHOOK_SECRET") || "").trim();
  if (envVal) {
    console.log("[remoteConfig] ✅ Using webhook secret from ENV (standard)");
    return { value: envVal, source: "env" };
  }

  // 2) Backup: Try RemoteConfig
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
      console.log("[remoteConfig] ✅ Using webhook secret from RemoteConfig (backup)");
      return { value: remoteVal, source: "remote" };
    }
  } catch (e) {
    console.warn("[remoteConfig] RemoteConfig fetch failed for webhook secret:", String(e?.message || e));
  }

  console.warn("[remoteConfig] ❌ No webhook secret found in ENV or RemoteConfig");
  return { value: "", source: "missing" };
}

function maskKey(k) {
  if (!k) return "(empty)";
  if (k.length < 12) return "***";
  return k.slice(0, 8) + "***" + k.slice(-4);
}