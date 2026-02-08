
import { createClient } from '@supabase/supabase-js';

// Trim and check env vars
const envUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

// Log configuration status (no secrets)
console.log("[SUPABASE_CONFIG]", {
  hasUrl: !!envUrl,
  hasKey: !!envKey,
  urlHost: envUrl ? envUrl.replace(/^https?:\/\//, "").split("/")[0] : "missing"
});

// Only create client if BOTH env vars are present
let supabase = null;
let supabaseConfigError = null;

if (envUrl && envKey) {
  supabase = createClient(envUrl, envKey);
} else {
  supabaseConfigError = "Supabase env not configured in this environment. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (Legacy anon JWT starting with eyJ…).";
}

export { supabase, supabaseConfigError };
