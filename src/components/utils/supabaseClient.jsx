import { createClient } from "@supabase/supabase-js";

// PRODUCTION SUPABASE CONFIG - Deterministic fallback with validation
// Emergency fallback (DO NOT CHANGE - correct production project)
const EMERGENCY_FALLBACK_URL = "https://uulcpkiwqeoiwbjgidwp.supabase.co";
const EMERGENCY_FALLBACK_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1bGNwa2l3cWVvaXdiamdpZHdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0ODU5OTMsImV4cCI6MjA4NjA2MTk5M30.jKzTYXA3IuJn39nlP4kBI6o9hg43Ebm8wnwWeGHXtSQ";

function getSupabaseConfig() {
  let url = null;
  let key = null;
  let source = null;

  // Priority A: Vite env vars (import.meta.env)
  if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
    url = import.meta.env.VITE_SUPABASE_URL;
    key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    source = "vite-env";
  }
  
  // Priority B: Base44 runtime injection (window.__BASE44_DATA__)
  if (!url && typeof window !== "undefined" && window.__BASE44_DATA__) {
    if (window.__BASE44_DATA__.supabase_url && window.__BASE44_DATA__.supabase_anon_key) {
      url = window.__BASE44_DATA__.supabase_url;
      key = window.__BASE44_DATA__.supabase_anon_key;
      source = "base44-injected";
    }
  }
  
  // Priority C: localStorage admin override
  if (!url && typeof window !== "undefined" && window.localStorage) {
    try {
      const overrideUrl = localStorage.getItem("pk_supabase_url");
      const overrideKey = localStorage.getItem("pk_supabase_anon_key");
      if (overrideUrl && overrideKey) {
        url = overrideUrl;
        key = overrideKey;
        source = "localStorage-override";
      }
    } catch (e) {
      console.warn("[SUPABASE] localStorage access failed:", e);
    }
  }
  
  // Priority D: Emergency fallback (correct production project)
  if (!url) {
    url = EMERGENCY_FALLBACK_URL;
    key = EMERGENCY_FALLBACK_KEY;
    source = "emergency-fallback";
  }

  return { url, key, source };
}

const config = getSupabaseConfig();
const SUPABASE_URL = config.url;
const SUPABASE_ANON_KEY = config.key;
const CONFIG_SOURCE = config.source;

// Validation: Extract ref from URL and JWT
function validateConfig(url, key) {
  try {
    const urlRefMatch = url.match(/https:\/\/([^.]+)\.supabase\.co/);
    const urlRef = urlRefMatch ? urlRefMatch[1] : null;
    
    const parts = key.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid JWT format");
    }
    
    const jwtPayload = JSON.parse(atob(parts[1]));
    const keyRef = jwtPayload.ref;
    
    if (!urlRef || !keyRef || urlRef !== keyRef) {
      throw new Error(`URL ref (${urlRef}) does not match key ref (${keyRef})`);
    }
    
    return { urlRef, keyRef, valid: true };
  } catch (e) {
    console.error("[SUPABASE] Validation failed:", e.message);
    return { valid: false, error: e.message };
  }
}

const validation = validateConfig(SUPABASE_URL, SUPABASE_ANON_KEY);

if (!validation.valid) {
  const msg = `FATAL: Supabase config validation failed - ${validation.error}`;
  console.error(msg);
  if (typeof window !== "undefined") {
    window.alert(`PipeKeeper initialization failed: Invalid Supabase configuration. Please contact support.`);
  }
  throw new Error(msg);
}

console.log("[SUPABASE_INIT]", {
  source: CONFIG_SOURCE,
  host: SUPABASE_URL.replace(/^https?:\/\//, "").split("/")[0],
  ref: validation.urlRef,
  keyLength: SUPABASE_ANON_KEY.length,
  keyPrefix: SUPABASE_ANON_KEY.slice(0, 8) + "..."
});

// Export config metadata for debug page
export const SUPABASE_CONFIG = {
  source: CONFIG_SOURCE,
  url: SUPABASE_URL,
  host: SUPABASE_URL.replace(/^https?:\/\//, "").split("/")[0],
  ref: validation.urlRef,
  keyPrefix: SUPABASE_ANON_KEY.slice(0, 8),
  keyLength: SUPABASE_ANON_KEY.length,
  validated: true
};

export const SUPABASE_READY = true;
export { SUPABASE_URL };

export function buildSupabaseHeaders() {
  const h = new Headers();
  h.set("apikey", SUPABASE_ANON_KEY);
  h.set("Authorization", `Bearer ${SUPABASE_ANON_KEY}`);
  h.set("Content-Type", "application/json");
  return h;
}

export async function pingAuthSettings() {
  try {
    const url = `${SUPABASE_URL}/auth/v1/settings`;
    const headers = buildSupabaseHeaders();
    console.log("[PING_AUTH_SETTINGS]", url);
    const response = await fetch(url, { method: "GET", headers });
    const text = await response.text();
    console.log("[AUTH_SETTINGS_STATUS]", response.status);
    return { status: response.status, body: text.slice(0, 200) };
  } catch (e) {
    console.error("[AUTH_SETTINGS_ERROR]", e.message);
    return { status: 0, body: e.message };
  }
}

export async function pingRest() {
  try {
    const url = `${SUPABASE_URL}/rest/v1/`;
    const headers = buildSupabaseHeaders();
    console.log("[PING_REST]", url);
    const response = await fetch(url, { method: "GET", headers });
    const text = await response.text();
    console.log("[REST_PING_STATUS]", response.status);
    return { status: response.status, body: text.slice(0, 200) };
  } catch (e) {
    console.error("[REST_PING_ERROR]", e.message);
    return { status: 0, body: e.message };
  }
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "pipekeeper-auth",
  },
});