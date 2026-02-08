import { createClient } from "@supabase/supabase-js";

function readEnv(key) {
  try {
    if (typeof import.meta !== "undefined" && import.meta.env && key in import.meta.env) {
      return (import.meta.env[key] ?? "").toString();
    }
  } catch (_) {}
  try {
    if (typeof process !== "undefined" && process.env && key in process.env) {
      return (process.env[key] ?? "").toString();
    }
  } catch (_) {}
  try {
    if (typeof window !== "undefined" && window.__ENV__ && key in window.__ENV__) {
      return (window.__ENV__[key] ?? "").toString();
    }
  } catch (_) {}
  return "";
}

function normalize(v) {
  return (v ?? "").toString().trim();
}

function isBadValue(v) {
  const s = normalize(v);
  if (!s) return true;
  const lower = s.toLowerCase();
  if (lower.includes("placeholder.supabase.co")) return true;
  if (lower.includes("paste_")) return true;
  if (lower.includes("your_anon_key")) return true;
  if (lower.includes("your_service_role")) return true;
  return false;
}

// Try static env vars first (from Vite)
let staticURL = normalize(readEnv("VITE_SUPABASE_URL")) || normalize(readEnv("SUPABASE_URL"));
let staticKey = normalize(readEnv("VITE_SUPABASE_ANON_KEY")) || normalize(readEnv("SUPABASE_ANON_KEY"));

// Dynamic storage for config loaded from backend
let dynamicURL = "";
let dynamicKey = "";

// Check if we have valid static config
const hasStaticConfig = !isBadValue(staticURL) && !isBadValue(staticKey);

// Getters that return current values (either static or dynamic)
export function getSUPABASE_URL() {
  return dynamicURL || staticURL;
}

export function getSUPABASE_ANON_KEY() {
  return dynamicKey || staticKey;
}

// Legacy exports for backward compatibility
export let SUPABASE_URL = staticURL;
export let SUPABASE_ANON_KEY = staticKey;

// ✅ This export is REQUIRED because parts of the app import SUPABASE_CONFIG
export let SUPABASE_CONFIG = {
  get url() { return getSUPABASE_URL(); },
  get anonKey() { return getSUPABASE_ANON_KEY(); },
};

export let SUPABASE_CONFIG_OK = hasStaticConfig;

// If static vars not available, try to fetch from backend
if (!hasStaticConfig && typeof window !== 'undefined') {
  console.log('[SUPABASE] Static config not available, attempting backend fetch...');
  (async () => {
    try {
      const { base44 } = await import('@/api/base44Client');
      console.log('[SUPABASE] Invoking getSupabaseConfig...');
      const res = await base44.functions.invoke('getSupabaseConfig');
      console.log('[SUPABASE] getSupabaseConfig response:', res?.data ? 'success' : 'empty');
      if (res?.data?.url && res?.data?.anonKey) {
        dynamicURL = res.data.url;
        dynamicKey = res.data.anonKey;
        SUPABASE_URL = dynamicURL;
        SUPABASE_ANON_KEY = dynamicKey;
        SUPABASE_CONFIG_OK = true;
        console.log('[SUPABASE] ✓ Loaded from backend successfully');
      } else {
        console.warn('[SUPABASE] Backend response missing url/anonKey');
      }
    } catch (e) {
      console.warn('[SUPABASE] Backend fetch failed:', e?.message);
    }
  })();
} else if (hasStaticConfig) {
  SUPABASE_CONFIG_OK = true;
  console.log('[SUPABASE] ✓ Using static config');
}

let _supabase = null;
let _loadingPromise = null;

export async function getSupabaseAsync() {
  // If already initialized, return immediately
  if (_supabase) return _supabase;

  // If currently loading, wait for that promise
  if (_loadingPromise) return _loadingPromise;

  // Try to get current config
  let url = getSUPABASE_URL();
  let key = getSUPABASE_ANON_KEY();

  // If config is ready NOW, initialize immediately
  if (url && key && !isBadValue(url) && !isBadValue(key)) {
    _supabase = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "pipekeeper-auth",
      },
      global: {
        headers: { "X-Client-Info": "pipekeeper-web" },
      },
    });
    SUPABASE_CONFIG_OK = true;
    console.log("[SUPABASE_READY] true (immediate)");
    return _supabase;
  }

  // Otherwise wait for async loading from backend
  _loadingPromise = (async () => {
    // Wait up to 5 seconds for config to load from backend
    for (let i = 0; i < 25; i++) {
      const currentUrl = getSUPABASE_URL();
      const currentKey = getSUPABASE_ANON_KEY();
      if (currentUrl && currentKey && !isBadValue(currentUrl) && !isBadValue(currentKey)) {
        break;
      }
      await new Promise(r => setTimeout(r, 200));
    }

    const finalUrl = getSUPABASE_URL();
    const finalKey = getSUPABASE_ANON_KEY();
    
    if (!finalUrl || !finalKey || isBadValue(finalUrl) || isBadValue(finalKey)) {
      console.error("[SUPABASE] Failed to load config - using fallback");
      throw new Error("Supabase configuration not available (missing URL or key)");
    }

    _supabase = createClient(finalUrl, finalKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "pipekeeper-auth",
      },
      global: {
        headers: { "X-Client-Info": "pipekeeper-web" },
      },
    });

    SUPABASE_CONFIG_OK = true;
    console.log("[SUPABASE_READY] true (async)");
    return _supabase;
  })();

  return _loadingPromise;
}

export function getSupabase() {
  if (_supabase) return _supabase;

  if (!SUPABASE_CONFIG_OK) {
    console.warn(
      "[SUPABASE] Configuration incomplete:",
      `URL: ${SUPABASE_URL ? "✓ present" : "✗ missing VITE_SUPABASE_URL"}`,
      `KEY: ${SUPABASE_ANON_KEY ? "✓ present" : "✗ missing VITE_SUPABASE_ANON_KEY"}`
    );
    return null;
  }

  _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "pipekeeper-auth",
    },
    global: {
      headers: { "X-Client-Info": "pipekeeper-web" },
    },
  });

  console.log("[SUPABASE_READY] true");
  return _supabase;
}

// Back-compat named export
export const supabase = getSupabase();

export function requireSupabase() {
  const client = getSupabase();
  if (!client) throw new Error("Supabase not configured (missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).");
  return client;
}

export function buildSupabaseHeaders() {
  const h = new Headers();
  const key = getSUPABASE_ANON_KEY();
  h.set("apikey", key);
  h.set("Authorization", `Bearer ${key}`);
  h.set("Content-Type", "application/json");
  return h;
}

export async function pingAuthSettings() {
  try {
    if (!SUPABASE_CONFIG_OK) return { status: 0, body: "Supabase not configured" };
    const baseUrl = getSUPABASE_URL();
    const url = `${baseUrl}/auth/v1/settings`;
    const response = await fetch(url, { method: "GET", headers: buildSupabaseHeaders() });
    const text = await response.text();
    return { status: response.status, body: text.slice(0, 200) };
  } catch (e) {
    return { status: 0, body: e?.message || String(e) };
  }
}

export async function pingRest() {
  try {
    if (!SUPABASE_CONFIG_OK) return { status: 0, body: "Supabase not configured" };
    const baseUrl = getSUPABASE_URL();
    const url = `${baseUrl}/rest/v1/`;
    const response = await fetch(url, { method: "GET", headers: buildSupabaseHeaders() });
    const text = await response.text();
    return { status: response.status, body: text.slice(0, 200) };
  } catch (e) {
    return { status: 0, body: e?.message || String(e) };
  }
}