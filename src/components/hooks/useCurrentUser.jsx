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
  const [fullEntitlementData, setFullEntitlementData] = useState(null);

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
        console.log("[ENTITLEMENT] No email found - defaulting to free");
        setEntitlementTier("free");
        setFullEntitlementData(null);
        setLoading(false);
        return;
      }

      try {
        const url = new URL(ENTITLEMENT_URL);
        url.searchParams.set("email", userEmail);
        url.searchParams.set("ts", String(Date.now()));

        console.log("[ENTITLEMENT] Fetching from:", url.toString());

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
          setFullEntitlementData(null);
        } else {
          const text = await r.text();
          const parsed = safeJsonParse(text) || {};
          
          // Support both legacy (entitlement_tier) and new (tier) keys
          const tier = (parsed.tier || parsed.entitlement_tier || "free").toLowerCase();
          
          console.log("[ENTITLEMENT] Full response:", JSON.stringify(parsed));
          console.log("[ENTITLEMENT] Resolved tier:", tier);
          
          setEntitlementTier(tier);
          setFullEntitlementData(parsed);
        }
      } catch (e) {
        console.warn("[ENTITLEMENT] fetch failed (non-fatal) - defaulting to free:", e.message);
        setEntitlementTier("free");
        setFullEntitlementData(null);
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
    fullEntitlementData,
    error: null,
    subscription: null,
    refetch: async () => {},
    ...flags 
  };
}