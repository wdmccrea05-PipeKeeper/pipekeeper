import { createClient } from "@supabase/supabase-js";

function readEnv(key) {
  try {
    // Vite/Build-time env
    if (typeof import.meta !== "undefined" && import.meta.env && key in import.meta.env) {
      return (import.meta.env[key] ?? "").toString();
    }
  } catch (_) {}

  try {
    // Some platforms inject at runtime
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

// Accept both VITE_* and non-VITE names to match Base44 env behavior
const SUPABASE_URL =
  normalize(readEnv("VITE_SUPABASE_URL")) ||
  normalize(readEnv("SUPABASE_URL"));

const SUPABASE_ANON_KEY =
  normalize(readEnv("VITE_SUPABASE_ANON_KEY")) ||
  normalize(readEnv("SUPABASE_ANON_KEY"));

// Strict: never bootstrap with garbage values
export const SUPABASE_CONFIG_OK = !isBadValue(SUPABASE_URL) && !isBadValue(SUPABASE_ANON_KEY);

// Debug config (no secrets leaked)
export const SUPABASE_CONFIG = {
  source: "environment",
  host: SUPABASE_URL ? SUPABASE_URL.replace(/^https?:\/\//, "").split("/")[0] : "missing",
  ref: SUPABASE_URL ? SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || "invalid" : "missing",
  keyLength: SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.length : 0,
  urlPresent: !!SUPABASE_URL,
  keyPresent: !!SUPABASE_ANON_KEY,
  validated: SUPABASE_CONFIG_OK,
};

let _supabase = null;

export function getSupabase() {
  if (_supabase) return _supabase;

  if (!SUPABASE_CONFIG_OK) {
    // Log ONLY whether present/missing, never print secrets.
    console.warn(
      "[SUPABASE] Configuration incomplete:",
      `URL: ${SUPABASE_URL ? "✓ present" : "✗ missing"}`,
      `KEY: ${SUPABASE_ANON_KEY ? "✓ present" : "✗ missing"}`
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
      headers: {
        "X-Client-Info": "pipekeeper-web",
      },
    },
  });

  console.log("[SUPABASE_READY] true");
  return _supabase;
}

// Keep backward-compatible named export used across codebase
export const supabase = getSupabase();

// Helper: call this before any supabase.auth usage when you want a hard failure message
export function requireSupabase() {
  const client = getSupabase();
  if (!client) {
    throw new Error("Supabase is not configured. Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.");
  }
  return client;
}

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