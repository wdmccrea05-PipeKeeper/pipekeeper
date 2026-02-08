import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

// Hard fail if not configured (prevents “looks fine but auth is dead”)
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[SUPABASE_CONFIG_MISSING]", {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    host: typeof window !== "undefined" ? window.location.host : "",
  });
  throw new Error(
    "Supabase env not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (Legacy anon JWT starting with eyJ...)."
  );
}

// Quick sanity check: legacy anon keys start with eyJ
if (!supabaseAnonKey.startsWith("eyJ")) {
  console.error("[SUPABASE_KEY_WRONG_TYPE]", {
    keyPrefix: supabaseAnonKey.slice(0, 16),
    note: "Use the Legacy anon JWT (starts with eyJ...), not sb_publishable_...",
  });
}

console.log("[SUPABASE_INIT]", {
  host: typeof window !== "undefined" ? window.location.host : "",
  urlHost: supabaseUrl.replace(/^https?:\/\//, ""),
  keyPrefix: supabaseAnonKey.slice(0, 12),
  keyLen: supabaseAnonKey.length,
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey);