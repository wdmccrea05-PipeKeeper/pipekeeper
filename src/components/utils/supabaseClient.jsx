import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://qtrypzzcjebvfcihiynt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0cnlwenpjamVidmZjaWhpeW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1MjMxNjEsImV4cCI6MjA1MjA5OTE2MX0.gE-8W18qPFyqCLsVE7O8SfuVCzT-_yZmLR_kRUa8x9M";

// Runtime validation
if (!SUPABASE_ANON_KEY.startsWith("eyJ")) {
  throw new Error("[SUPABASE_CLIENT] Invalid key format: must start with eyJ");
}
if (SUPABASE_ANON_KEY.length <= 100) {
  throw new Error("[SUPABASE_CLIENT] Invalid key length: too short");
}
const dotCount = (SUPABASE_ANON_KEY.match(/\./g) || []).length;
if (dotCount < 2) {
  throw new Error("[SUPABASE_CLIENT] Invalid key format: insufficient segments");
}

// Log safe fingerprint
console.log("[SUPABASE_KEY_FINGERPRINT]", {
  startsWith: SUPABASE_ANON_KEY.slice(0, 12),
  endsWith: SUPABASE_ANON_KEY.slice(-12),
  len: SUPABASE_ANON_KEY.length,
  dots: dotCount,
  host: new URL(SUPABASE_URL).host
});

// Debug fetch wrapper
const debugFetch = async (input, init) => {
  const url = typeof input === "string" ? input : input?.url;
  if (url && url.includes("/auth/v1/token")) {
    console.log("[SUPABASE_TOKEN_URL]", url);
  }
  return fetch(input, init);
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { headers: { apikey: SUPABASE_ANON_KEY } },
  auth: { 
    persistSession: true, 
    autoRefreshToken: true, 
    detectSessionInUrl: true,
    storageKey: "pipekeeper-auth",
  },
  fetch: debugFetch
});

console.log("[SUPABASE_FORCE_INIT]", SUPABASE_URL);