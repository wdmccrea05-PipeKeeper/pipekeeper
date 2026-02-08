
import { createClient } from "@supabase/supabase-js";

const DEFAULT_URL = "https://qtrypzzcjebvfcihiynt.supabase.co";
const DEFAULT_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0cnlwenpjamVidmZjaWhpeW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1MjMxNjEsImV4cCI6MjA1MjA5OTE2MX0.gE-8W18qPFyqCLsVE7O8SfuVCzT-_zZmLR_kRUa8x9M";

const envUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

const supabaseUrl = envUrl || DEFAULT_URL;
const supabaseKey = envKey || DEFAULT_ANON_KEY;

const looksLikeJwt = supabaseKey.startsWith("eyJ");
const looksLikePublishable = supabaseKey.startsWith("sb_publishable_");
const isValidKey = looksLikeJwt || looksLikePublishable;

export const SUPABASE_READY = !!supabaseKey && isValidKey;

console.log("[SUPABASE_KEY_CHECK]", {
  keyPrefix: supabaseKey.slice(0, 20),
  keyLen: supabaseKey.length,
  looksLikeJwt,
  looksLikePublishable,
  host: new URL(supabaseUrl).host,
  ready: SUPABASE_READY
});

console.log("[SUPABASE_TOKEN_URL]", `${supabaseUrl}/auth/v1/token?grant_type=password`);

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "pipekeeper-auth",
  },
});
