import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { getEffectiveEntitlement } from "@/components/utils/getEffectiveEntitlement";

const ENTITLEMENT_URL = import.meta.env.VITE_ENTITLEMENT_URL;
const ENTITLEMENT_API_KEY = import.meta.env.VITE_ENTITLEMENT_API_KEY;

const normEmail = (email) => String(email || "").trim().toLowerCase();

async function fetchEntitlementTier(email) {
  if (!ENTITLEMENT_URL || !ENTITLEMENT_API_KEY) return "free";

  const url = `${ENTITLEMENT_URL}?email=${encodeURIComponent(email)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "x-entitlement-key": ENTITLEMENT_API_KEY,
    },
  });

  // Fail closed: any error => free
  if (!res.ok) return "free";

  const json = await res.json();
  const tier = String(json?.entitlement_tier || "free").trim().toLowerCase();
  if (tier === "pro" || tier === "premium") return tier;
  return "free";
}

export function useCurrentUser() {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      try {
        const me = await base44.auth.me();

        // Not logged in yet => return null (NOT an error)
        if (!me?.id || !me?.email) return null;

        const email = normEmail(me.email);
        const entitlement_tier = await fetchEntitlementTier(email);

        return {
          ...me,
          entitlement_tier,
        };
      } catch (err) {
        // Any "not authenticated" / "session missing" case must NOT throw,
        // otherwise login UI misreports as invalid credentials.
        const msg = String(err?.message || err || "").toLowerCase();
        if (
          msg.includes("not authenticated") ||
          msg.includes("unauthorized") ||
          msg.includes("401") ||
          msg.includes("no session") ||
          msg.includes("missing session")
        ) {
          return null;
        }

        // Real errors should still surface
        console.error("[useCurrentUser] Error:", err);
        throw err;
      }
    },
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const user = data;

  const effective = getEffectiveEntitlement(user);
  const hasPro = effective === "pro";
  const hasPaidAccess = effective === "pro" || effective === "premium";
  const isAdmin = user?.role === "admin";

  if (user) {
    console.log("[ENTITLEMENT_CHECK]", {
      email: user?.email,
      entitlement_tier: user?.entitlement_tier,
      effective,
      hasPro,
    });
  }

  return {
    user,
    isLoading,
    error,
    hasPro,
    hasPaidAccess,
    isAdmin,
    refetch,
  };
}