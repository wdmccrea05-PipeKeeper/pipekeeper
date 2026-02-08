import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase env vars: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
}

export const SUPABASE_READY = true;

// Debug config (no secrets leaked)
export const SUPABASE_CONFIG = {
  source: "environment",
  host: SUPABASE_URL.replace(/^https?:\/\//, "").split("/")[0],
  ref: SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || "unknown",
  keyPrefix: SUPABASE_ANON_KEY.slice(0, 8),
  keyLength: SUPABASE_ANON_KEY.length,
  validated: true
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "pipekeeper-auth",
  },
});

// Health check helpers
export async function pingAuthSettings() {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    const text = await response.text();
    return { status: response.status, body: text.slice(0, 200) };
  } catch (e) {
    return { status: 0, body: e.message };
  }
}

export async function pingRest() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    const text = await response.text();
    return { status: response.status, body: text.slice(0, 200) };
  } catch (e) {
    return { status: 0, body: e.message };
  }
}