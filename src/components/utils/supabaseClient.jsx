import { createClient } from "@supabase/supabase-js";

// ✅ Production defaults (known-good)
const DEFAULT_URL = "https://qtrypzzcjebvfcihiynt.supabase.co";
// IMPORTANT: Use the Legacy anon JWT (starts with "eyJ..."), NOT sb_secret_.
// If a publishable key exists, DO NOT use it for supabase-js auth flows unless explicitly verified.
const DEFAULT_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1bGNwa2l3cWVvaXdiamdpZHdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0ODU5OTMsImV4cCI6MjA4NjA2MTk5M30.jKzTYXA3IuJn39nlP4kBI6o9hg43Ebm8wnwWeGHXtSQ";

function clean(s) {
  return (s || "").toString().trim();
}

const envUrl = clean(import.meta.env.VITE_SUPABASE_URL);
const envKey = clean(import.meta.env.VITE_SUPABASE_ANON_KEY);

// Base44 sometimes injects placeholder values. Treat them as missing.
const isPlaceholderUrl =
  !envUrl ||
  envUrl.includes("placeholder.supabase.co") ||
  envUrl.includes("example.supabase.co") ||
  envUrl.includes("your-project.supabase.co");

const looksLikeLegacyAnonJwt = envKey.startsWith("eyJ"); // legacy anon/service JWTs start with eyJ
const hasUsableEnv = !isPlaceholderUrl && looksLikeLegacyAnonJwt;

const supabaseUrl = hasUsableEnv ? envUrl : DEFAULT_URL;
const supabaseAnonKey = hasUsableEnv ? envKey : DEFAULT_ANON_KEY;

const supabaseHost = (() => {
  try { return new URL(supabaseUrl).host; } catch { return ""; }
})();

const usingDefaults = !hasUsableEnv;

console.log("[SUPABASE_CONFIG]", {
  supabaseHost,
  hasEnvUrl: !!envUrl && !isPlaceholderUrl,
  hasEnvKey: !!envKey,
  usingDefaults,
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[SUPABASE_CONFIG] Missing credentials after resolution", {
    supabaseUrlPresent: !!supabaseUrl,
    supabaseKeyPresent: !!supabaseAnonKey,
  });
}

// Singleton (module scope). Never create another client elsewhere.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "pipekeeper-auth",
  },
});