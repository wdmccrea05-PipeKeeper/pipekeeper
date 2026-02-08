const __g = globalThis;

if (__g.__PK_SUPABASE_INIT__) {
  console.error("[FATAL] Multiple Supabase clients detected", {
    first: __g.__PK_SUPABASE_INIT__,
    second: SUPABASE_URL,
  });
  throw new Error("Multiple Supabase clients detected. Stop and remove duplicate init.");
}

__g.__PK_SUPABASE_INIT__ = SUPABASE_URL;
import { createClient } from "@supabase/supabase-js";

// Hardcoded Supabase config - single source of truth
const SUPABASE_URL = "https://uulcpkiwqeoiwbjgidwp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1bGNwa2l3cWVvaXdiamdpZHdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0ODU5OTMsImV4cCI6MjA4NjA2MTk5M30.jKzTYXA3IuJn39nlP4kBI6o9hg43Ebm8wnwWeGHXtSQ";

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
  const msg = `FATAL: Cannot decode SUPABASE_ANON_KEY JWT: ${e.message}`;
  console.error(msg);
  throw new Error(msg);
}

// Validate ref match
if (!urlRef || !keyRef || urlRef !== keyRef) {
  const msg = `FATAL: Supabase URL ref (${urlRef}) does not match anon key ref (${keyRef})`;
  console.error(msg, { urlRef, keyRef, url: SUPABASE_URL });
  throw new Error(msg);
}

console.log("[SUPABASE_VALIDATED]", { urlRef, keyRef, match: urlRef === keyRef, from: "utils/supabaseClient.js" });

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