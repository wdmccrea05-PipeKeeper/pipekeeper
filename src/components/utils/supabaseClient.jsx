import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://uulcpkiwqeoiwbjgidwp.supabase.co";
export const SUPABASE_ANON_KEY = "PASTE_ANON_KEY_HERE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "pipekeeper-auth",
  },
});