import { createClient } from "@supabase/supabase-js";

// Read from environment variables ONLY - no fallbacks
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fatal error if missing
if (!SUPABASE_URL) {
  const msg = "FATAL: VITE_SUPABASE_URL is missing. Set it in Base44 secrets.";
  console.error(msg);
  throw new Error(msg);
}

if (!SUPABASE_ANON_KEY) {
  const msg = "FATAL: VITE_SUPABASE_ANON_KEY is missing. Set it in Base44 secrets.";
  console.error(msg);
  throw new Error(msg);
}

// Extract URL ref (subdomain before .supabase.co)
const urlRefMatch = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
const urlRef = urlRefMatch ? urlRefMatch[1] : null;

// Decode JWT to get ref from payload
let keyRef = null;
let jwtPayload = null;
try {
  const parts = SUPABASE_ANON_KEY.split(".");
  if (parts.length === 3) {
    jwtPayload = JSON.parse(atob(parts[1]));
    keyRef = jwtPayload.ref;
  }
} catch (e) {
  const msg = `FATAL: Cannot decode VITE_SUPABASE_ANON_KEY JWT: ${e.message}`;
  console.error(msg);
  throw new Error(msg);
}

// Validate ref match
if (!urlRef || !keyRef || urlRef !== keyRef) {
  const msg = `FATAL: Supabase URL ref (${urlRef}) does not match anon key ref (${keyRef})`;
  console.error(msg, { urlRef, keyRef, url: SUPABASE_URL });
  throw new Error(msg);
}

console.log("[SUPABASE_VALIDATED]", {
  urlRef,
  keyRef,
  match: urlRef === keyRef,
  keyLength: SUPABASE_ANON_KEY.length,
});

export const SUPABASE_READY = true;
export const SUPABASE_KEY_LEN = SUPABASE_ANON_KEY.length;
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
    console.log("[AUTH_SETTINGS_BODY]", text.slice(0, 200));
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
    console.log("[REST_PING_BODY]", text.slice(0, 200));
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