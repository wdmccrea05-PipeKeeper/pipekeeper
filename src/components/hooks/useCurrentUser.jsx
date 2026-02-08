import { useEffect, useMemo, useState } from "react";
import { supabase, SUPABASE_READY } from "@/components/utils/supabaseClient";

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
      console.log("[ENTITLEMENT_HOOK] mounted - SUPABASE_READY:", SUPABASE_READY);
      setLoading(true);

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (!alive) return;

      if (sessionErr) {
        console.warn("[AUTH] getSession error", sessionErr);
      }

      const sessionUser = sessionData?.session?.user || null;
      setUser(sessionUser);

      const userEmail = (sessionUser?.email || "").trim().toLowerCase();
      setEmail(userEmail);

      if (!userEmail) {
        setEntitlementTier("free");
        setLoading(false);
        return;
      }

      try {
        const url = new URL(ENTITLEMENT_URL);
        url.searchParams.set("email", userEmail);
        url.searchParams.set("ts", String(Date.now()));

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const r = await fetch(url.toString(), {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!r.ok) {
          console.warn("[ENTITLEMENT] API returned", r.status, "- defaulting to free");
          setEntitlementTier("free");
        } else {
          const text = await r.text();
          const parsed = safeJsonParse(text) || {};
          const tier = (parsed.entitlement_tier || parsed.tier || "free").toLowerCase();
          setEntitlementTier(tier);
          console.log("[ENTITLEMENT] tier", tier);
        }
      } catch (e) {
        console.warn("[ENTITLEMENT] fetch failed (non-fatal) - defaulting to free:", e.message);
        setEntitlementTier("free");
      }

      setLoading(false);
    }

    run();

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

    // Base44 stores role as "Admin" (capital) or "User"
    const roleStr = (user?.user_metadata?.role || user?.role || "").toLowerCase();
    const isAdmin = roleStr === "admin";

    return {
      tier,
      isPro: tier === "pro",
      isPremium: tier === "premium",
      isPaid: tier === "pro" || tier === "premium",
      hasPro: tier === "pro",
      hasPremium: tier === "premium",
      hasPaidAccess: tier === "pro" || tier === "premium",
      isAdmin,
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