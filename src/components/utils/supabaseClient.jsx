import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://uulcpkiwqeoiwbjgidwp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1bGNwa2l3cWVvaXdiamdpZHdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0ODU5OTMsImV4cCI6MjA4NjA2MTk5M30.jKzTYXA3IuJn39nlP4kBI6o9hg43Ebm8wnwWeGHXtSQ";

console.log("[SUPABASE_FORCED]", {
  url: SUPABASE_URL,
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
    console.log("[PING_AUTH_SETTINGS] requesting:", url);
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
    console.log("[PING_REST] requesting:", url);
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