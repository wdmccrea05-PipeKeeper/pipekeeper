import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://uulcpkiwqeoiwbjgidwp.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_PUBLIC_ANON_KEY_HERE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "pipekeeper-auth",
  },
});