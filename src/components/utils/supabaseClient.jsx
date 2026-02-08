
import { createClient } from "@supabase/supabase-js";

const DEFAULT_URL = "https://qtrypzzcjebvfcihiynt.supabase.co";

// IMPORTANT: Use the NEW Publishable key (sb_publishable_...), NOT legacy eyJ..., NOT sb_secret_...
const DEFAULT_PUBLISHABLE_KEY = "sb_publishable_8uG7VI6Yp1KJWJ9R_DJA9w_euvvq2I_";

const envUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

// If env vars are missing (Base44 env injection issues), use hard fallback.
const supabaseUrl = envUrl || DEFAULT_URL;
const supabaseKey = envKey || DEFAULT_PUBLISHABLE_KEY;

// Basic sanity checks to prevent bad deploys
const keyPrefix = (supabaseKey || "").slice(0, 15);
const isPublishable = supabaseKey.startsWith("sb_publishable_");

console.log("[SUPABASE_INIT]", {
  supabaseHost: supabaseUrl.replace("https://", ""),
  usingEnvUrl: !!envUrl,
  usingEnvKey: !!envKey,
  keyPrefix,
  keyLen: supabaseKey.length,
  isPublishable,
});

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase missing URL or API key.");
}

if (!isPublishable) {
  console.error(
    "[SUPABASE_INIT] Wrong key type. Must use sb_publishable_ key in browser builds."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
