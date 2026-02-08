import { useEffect, useMemo, useState } from "react";
import { requireSupabase, SUPABASE_CONFIG_OK, getSupabaseAsync } from "@/components/utils/supabaseClient";
import { getEffectiveTier } from "@/components/utils/effectiveTierCanonical";

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
  const [entitlementData, setEntitlementData] = useState(null);
  const [effectiveTier, setEffectiveTier] = useState("free");

  useEffect(() => {
    let alive = true;

    async function run() {
        console.log("[ENTITLEMENT_HOOK] mounted - SUPABASE_CONFIG_OK:", SUPABASE_CONFIG_OK);
        setLoading(true);

      try {
        // Wait for async Supabase config to load if not ready yet
        let supabaseClient;
        try {
          supabaseClient = requireSupabase();
        } catch (e) {
          console.log("[ENTITLEMENT_HOOK] requireSupabase failed, waiting for async config...");
          supabaseClient = await getSupabaseAsync();
        }
        const { data: sessionData, error: sessionErr } = await supabaseClient.auth.getSession();
        if (!alive) return;

      if (sessionErr) {
        console.warn("[AUTH] getSession error", sessionErr);
      }

      const sessionUser = sessionData?.session?.user || null;
      setUser(sessionUser);

      const userEmail = (sessionUser?.email || "").trim().toLowerCase();
      setEmail(userEmail);

      if (!userEmail) {
        setEffectiveTier("free");
        setLoading(false);
        return;
      }

      try {
        // CRITICAL: Clear stale entitlement data before new fetch
        setEntitlementData(null);

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
          console.warn("[ENTITLEMENT] API returned", r.status, "- deriving tier from user data");
          const tier = getEffectiveTier(sessionUser, null);
          setEntitlementData(null);
          setEffectiveTier(tier);
        } else {
          const text = await r.text();
          const parsed = safeJsonParse(text) || {};
          setEntitlementData(parsed);
          const tier = getEffectiveTier(sessionUser, parsed);
          setEffectiveTier(tier);
          console.log("[ENTITLEMENT] tier", tier);
        }
      } catch (e) {
        console.warn("[ENTITLEMENT] fetch failed (non-fatal) - deriving from user:", e.message);
        const tier = getEffectiveTier(sessionUser, null);
        setEntitlementData(null);
        setEffectiveTier(tier);
      }

        setLoading(false);
      } catch (e) {
        console.error("[ENTITLEMENT_HOOK] run() error:", e?.message);
        // If Supabase fails, still complete loading but show no user
        setLoading(false);
      }
    }

    run();

    // Setup auth state listener (only if Supabase is configured)
    let unsubscribeFn = () => {};
    if (SUPABASE_CONFIG_OK) {
      try {
        const supabaseClient = requireSupabase();
        const { data: sub } = supabaseClient.auth.onAuthStateChange(() => {
          run();
        });
        unsubscribeFn = () => {
          sub?.subscription?.unsubscribe?.();
        };
      } catch (e) {
        console.warn("[ENTITLEMENT_HOOK] Failed to setup auth listener:", e?.message);
      }
    }

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const flags = useMemo(() => {
    const tier = (effectiveTier || "free").toLowerCase();
    const normalizedEmail = (email || "").trim().toLowerCase();

    // Admin: email domain OR user_metadata flag
    const isAdmin = 
      normalizedEmail.endsWith("@pipekeeperapp.com") || 
      user?.user_metadata?.admin === true ||
      ["wmccrea@indario.com", "warren@pipekeeper.app"].includes(normalizedEmail);

    return {
      tier: effectiveTier,
      effectiveTier,
      isPro: tier === "pro",
      isPremium: tier === "premium",
      isPaid: tier === "pro" || tier === "premium",
      hasPro: tier === "pro",
      hasPremium: tier === "premium",
      hasPaidAccess: tier === "pro" || tier === "premium",
      isAdmin,
    };
  }, [effectiveTier, user, email]);

  return { 
    loading, 
    isLoading: loading,
    user, 
    email, 
    effectiveTier,
    entitlementData,
    error: null,
    subscription: null,
    refetch: async () => {},
    provider: null,
    ...flags 
  };
}