import { useAuth } from "@/components/auth";
import { useEffect, useState } from "react";

// Point this to your Cloudflare Worker endpoint (recommended):
// VITE_ENTITLEMENT_URL=https://entitlement.pipekeeper.app/api/entitlement
const ENTITLEMENT_URL = import.meta.env.VITE_ENTITLEMENT_URL;

function unwrapPossibleDoubleJson(value) {
  // Sometimes upstream returns JSON-as-a-string.  Keep parsing until we get an object.
  let data = value;
  try {
    while (typeof data === "string") data = JSON.parse(data);
  } catch {
    // leave as-is
  }
  return data;
}

export default function useCurrentUser() {
  const { user, loading: authLoading } = useAuth();
  const [entitlement, setEntitlement] = useState("free");
  const [hasPro, setHasPro] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkEntitlement() {
      if (!user?.email || !ENTITLEMENT_URL) return;

      try {
        // Cache-bust to avoid any edge/browser caching weirdness.
        const url = new URL(ENTITLEMENT_URL);
        url.searchParams.set("email", String(user.email).trim().toLowerCase());
        url.searchParams.set("_ts", String(Date.now()));

        // IMPORTANT: no API key from the browser.
        // The Cloudflare Worker should add x-entitlement-key server-side.
        const res = await fetch(url.toString(), {
          method: "GET",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        const raw = await res.text();
        const parsed = unwrapPossibleDoubleJson(raw);

        const tier =
          (parsed && typeof parsed === "object" && parsed.entitlement_tier) ||
          "free";

        const isPro = tier === "pro" || tier === "premium";

        if (!cancelled) {
          setEntitlement(tier);
          setHasPro(isPro);
        }
      } catch (e) {
        if (!cancelled) {
          setEntitlement("free");
          setHasPro(false);
        }
      }
    }

    checkEntitlement();
    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  return {
    user,
    entitlement,
    hasPro,
    loading: authLoading,
  };
}