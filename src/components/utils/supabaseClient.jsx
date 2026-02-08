import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Boolean flags for config validation
export const SUPABASE_URL_PRESENT = !!SUPABASE_URL;
export const SUPABASE_ANON_KEY_PRESENT = !!SUPABASE_ANON_KEY;
export const SUPABASE_CONFIG_OK = !!(
  SUPABASE_URL_PRESENT &&
  SUPABASE_ANON_KEY_PRESENT &&
  SUPABASE_URL.includes("supabase.co")
);

// Debug config (no secrets leaked)
export const SUPABASE_CONFIG = {
  source: "environment",
  host: SUPABASE_URL ? SUPABASE_URL.replace(/^https?:\/\//, "").split("/")[0] : "missing",
  ref: SUPABASE_URL ? SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || "invalid" : "missing",
  keyLength: SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.length : 0,
  urlPresent: SUPABASE_URL_PRESENT,
  keyPresent: SUPABASE_ANON_KEY_PRESENT,
  validated: SUPABASE_CONFIG_OK,
};

if (!SUPABASE_CONFIG_OK) {
  console.warn(
    "[SUPABASE] Configuration incomplete:",
    `URL: ${SUPABASE_URL_PRESENT ? "✓" : "✗ MISSING VITE_SUPABASE_URL"}`,
    `KEY: ${SUPABASE_ANON_KEY_PRESENT ? "✓" : "✗ MISSING VITE_SUPABASE_ANON_KEY"}`
  );
}

// CRITICAL: Always create a client, even with missing env vars
// If env vars are invalid, createClient will handle gracefully
// The app will check SUPABASE_CONFIG_OK before calling auth methods
export const supabase = createClient(
  SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_ANON_KEY || "placeholder-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "pipekeeper-auth",
    },
  }
);

// Health check helpers
export async function pingAuthSettings() {
  if (!SUPABASE_CONFIG_OK) return { status: 0, body: "Config missing" };
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    const text = await response.text();
    return { status: response.status, body: text.slice(0, 200) };
  } catch (e) {
    return { status: 0, body: e.message };
  }
}

export async function pingRest() {
  if (!SUPABASE_CONFIG_OK) return { status: 0, body: "Config missing" };
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    const text = await response.text();
    return { status: response.status, body: text.slice(0, 200) };
  } catch (e) {
    return { status: 0, body: e.message };
  }
}