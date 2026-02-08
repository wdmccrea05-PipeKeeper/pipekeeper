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

// Fallback: these will be set dynamically if static injection fails
export let SUPABASE_URL = staticURL;
export let SUPABASE_ANON_KEY = staticKey;

// ✅ This export is REQUIRED because parts of the app import SUPABASE_CONFIG
export let SUPABASE_CONFIG = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
};

export let SUPABASE_CONFIG_OK = !isBadValue(SUPABASE_URL) && !isBadValue(SUPABASE_ANON_KEY);

// If static vars not available, try to fetch from backend
if (!SUPABASE_CONFIG_OK && typeof window !== 'undefined') {
  (async () => {
    try {
      const { base44 } = await import('@/api/base44Client');
      const res = await base44.functions.invoke('getSupabaseConfig');
      if (res.data?.url && res.data?.anonKey) {
        SUPABASE_URL = res.data.url;
        SUPABASE_ANON_KEY = res.data.anonKey;
        SUPABASE_CONFIG = { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };
        SUPABASE_CONFIG_OK = true;
        console.log('[SUPABASE] Loaded from backend');
      }
    } catch (e) {
      console.warn('[SUPABASE] Backend fetch failed:', e?.message);
    }
  })();
}

let _supabase = null;

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
  h.set("apikey", SUPABASE_ANON_KEY);
  h.set("Authorization", `Bearer ${SUPABASE_ANON_KEY}`);
  h.set("Content-Type", "application/json");
  return h;
}

export async function pingAuthSettings() {
  try {
    if (!SUPABASE_CONFIG_OK) return { status: 0, body: "Supabase not configured" };
    const url = `${SUPABASE_URL}/auth/v1/settings`;
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
    const url = `${SUPABASE_URL}/rest/v1/`;
    const response = await fetch(url, { method: "GET", headers: buildSupabaseHeaders() });
    const text = await response.text();
    return { status: response.status, body: text.slice(0, 200) };
  } catch (e) {
    return { status: 0, body: e?.message || String(e) };
  }
}