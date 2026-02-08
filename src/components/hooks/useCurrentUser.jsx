import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/components/utils/supabaseClient";

const ENTITLEMENT_URL =
  import.meta.env.VITE_ENTITLEMENT_URL ||
  "https://entitlement.pipekeeper.app/api/entitlement";

function safeJsonParse(maybeString) {
  try {
    let v = maybeString;
    while (typeof v === "string") v = JSON.parse(v);
    return v;
  } catch {
    return null;
  }
}

export function useCurrentUser() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [entitlementTier, setEntitlementTier] = useState("free");

  useEffect(() => {
    let alive = true;

    async function run() {
      console.log("[ENTITLEMENT_HOOK] mounted");
      setLoading(true);

      // 1) Get user from Supabase session (no providers)
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (!alive) return;

      if (sessionErr) {
        console.warn("[AUTH] getSession error", sessionErr);
      }

      const sessionUser = sessionData?.session?.user || null;
      setUser(sessionUser);

      const userEmail = (sessionUser?.email || "").trim().toLowerCase();
      setEmail(userEmail);

      // 2) If no email, entitlement is free
      if (!userEmail) {
        setEntitlementTier("free");
        setLoading(false);
        return;
      }

      // 3) Fetch entitlement from Cloudflare
      try {
        const url = new URL(ENTITLEMENT_URL);
        url.searchParams.set("email", userEmail);
        url.searchParams.set("ts", String(Date.now())); // bust caches

        const r = await fetch(url.toString(), {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        const text = await r.text();
        const parsed = safeJsonParse(text) || {};
        const tier = (parsed.entitlement_tier || "free").toLowerCase();

        setEntitlementTier(tier);
        console.log("[ENTITLEMENT] tier", tier, "x-pk-worker:", r.headers.get("x-pk-worker"));
      } catch (e) {
        console.warn("[ENTITLEMENT] fetch failed", e);
        setEntitlementTier("free");
      }

      setLoading(false);
    }

    run();

    // Keep user updated if session changes
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      run();
    });

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const flags = useMemo(() => {
    const tier = (entitlementTier || "free").toLowerCase();

    return {
      tier,
      isPro: tier === "pro",
      isPremium: tier === "premium",
      isPaid: tier === "pro" || tier === "premium",
      hasPro: tier === "pro",
      hasPremium: tier === "premium",
      hasPaidAccess: tier === "pro" || tier === "premium",
      isAdmin: user?.user_metadata?.role === "admin" || user?.role === "admin",
    };
  }, [entitlementTier, user]);

  return { 
    loading, 
    isLoading: loading,
    user, 
    email, 
    entitlementTier,
    error: null,
    subscription: null,
    refetch: async () => {},
    ...flags 
  };
}