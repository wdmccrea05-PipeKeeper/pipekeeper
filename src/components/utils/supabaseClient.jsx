
import { createClient } from '@supabase/supabase-js';

// Known working defaults for this project
const DEFAULT_URL = "https://qtrypzzcjebvfcihiynt.supabase.co";
const DEFAULT_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0cnlwenpjamVidmZjaWhpeW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1MjMxNjEsImV4cCI6MjA1MjA5OTE2MX0.gE-8W18qPFyqCLsVE7O8SfuVCzT-_yZmLR_kRUa8x9M";

// Trim and check env vars
const envUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

// Use env only if BOTH are present; otherwise use defaults
const supabaseUrl = envUrl && envKey ? envUrl : DEFAULT_URL;
const supabaseAnonKey = envUrl && envKey ? envKey : DEFAULT_ANON_KEY;

if (!(envUrl && envKey)) {
  console.warn("[SUPABASE_CONFIG] Using DEFAULT Supabase project because env is missing", {
    hasUrl: !!envUrl, hasKey: !!envKey, host: supabaseUrl.replace(/^https?:\/\//,"").split("/")[0]
  });
}

console.log("[SUPABASE_INIT]", {
  host: supabaseUrl.replace(/^https?:\/\//,"").split("/")[0],
  hasEnvUrl: !!envUrl,
  hasEnvKey: !!envKey,
  usingDefaults: !(envUrl && envKey)
});

// Create singleton client instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
