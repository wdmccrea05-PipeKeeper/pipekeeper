import { useEffect, useMemo, useState } from "react";
import { getSupabaseAsync } from "@/components/utils/supabaseClient";
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

const DEV = import.meta.env.DEV;

export function useCurrentUser() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [entitlementData, setEntitlementData] = useState(null);
  const [effectiveTier, setEffectiveTier] = useState("free");

  useEffect(() => {
    let alive = true;
    let unsubscribeFn = () => {};

    async function run() {
      setLoading(true);

      try {
        const supabaseClient = await getSupabaseAsync();
        const { data: sessionData, error: sessionErr } = await supabaseClient.auth.getSession();
        if (!alive) return;

        if (sessionErr && DEV) {
          console.debug("[AUTH] getSession error:", sessionErr?.message || sessionErr);
        }

        const sessionUser = sessionData?.session?.user || null;
        setUser(sessionUser);

        const userEmail = (sessionUser?.email || "").trim().toLowerCase();
        setEmail(userEmail);

        if (!userEmail) {
          setEntitlementData(null);
          setEffectiveTier("free");
          setLoading(false);
          return;
        }

        try {
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
            if (DEV) {
              console.debug("[ENTITLEMENT] API returned non-OK status:", r.status);
            }
            const tier = getEffectiveTier(sessionUser, null);
            setEntitlementData(null);
            setEffectiveTier(tier);
          } else {
            const text = await r.text();
            const parsed = safeJsonParse(text) || {};
            setEntitlementData(parsed);
            const tier = getEffectiveTier(sessionUser, parsed);
            setEffectiveTier(tier);
          }
        } catch (e) {
          if (DEV) {
            console.debug("[ENTITLEMENT] fetch failed, using local tier:", e?.message || e);
          }
          const tier = getEffectiveTier(sessionUser, null);
          setEntitlementData(null);
          setEffectiveTier(tier);
        }

        setLoading(false);
      } catch (e) {
        if (DEV) {
          console.debug("[ENTITLEMENT_HOOK] initialization failed:", e?.message || e);
        }
        if (!alive) return;
        setLoading(false);
        setUser(null);
        setEmail("");
        setEntitlementData(null);
        setEffectiveTier("free");
      }
    }

    (async () => {
      await run();
      try {
        const supabaseClient = await getSupabaseAsync();
        if (!alive) return;
        const { data: sub } = supabaseClient.auth.onAuthStateChange(() => {
          run();
        });
        unsubscribeFn = () => sub?.subscription?.unsubscribe?.();
      } catch (e) {
        if (DEV) {
          console.debug("[ENTITLEMENT_HOOK] auth listener setup skipped:", e?.message || e);
        }
      }
    })();

    return () => {
      alive = false;
      unsubscribeFn();
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
      hasProAccess: tier === "pro" || tier === "premium",
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
