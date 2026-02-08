import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

console.log("[BUILD_MARKER] entitlement-hook-v2");
console.log("[ENTITLEMENT_HOOK_V2_LOADED]");

const ENTITLEMENT_URL = import.meta.env.VITE_ENTITLEMENT_URL;
const ENTITLEMENT_API_KEY = import.meta.env.VITE_ENTITLEMENT_API_KEY;

const normEmail = (email) => String(email || "").trim().toLowerCase();

async function fetchEntitlementTier(email) {
  if (!ENTITLEMENT_URL || !ENTITLEMENT_API_KEY) return "free";

  const res = await fetch(
    `${ENTITLEMENT_URL}?email=${encodeURIComponent(email)}`,
    { headers: { "x-entitlement-key": ENTITLEMENT_API_KEY } }
  );

  if (!res.ok) return "free";
  const json = await res.json();

  const tier = String(json?.entitlement_tier || "free").trim().toLowerCase();
  if (tier === "pro" || tier === "premium") return tier;
  return "free";
}

export function useCurrentUser() {
  const q = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      // ONLY auth.me(), NO User entity calls of any kind
      const me = await base44.auth.me();
      if (!me?.email) return null;

      const email = normEmail(me.email);
      const entitlement_tier = await fetchEntitlementTier(email);

      return { ...me, entitlement_tier };
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: false,
  });

  const user = q.data;

  const tier = String(user?.entitlement_tier || "free").trim().toLowerCase();
  const hasPro = tier === "pro";
  const hasPaidAccess = tier === "pro" || tier === "premium";

  // IMPORTANT: always booleans
  const safeHasPro = !!hasPro;
  const safeHasPaidAccess = !!hasPaidAccess;

  if (user?.email) {
    console.log("[ENTITLEMENT_CHECK]", {
      email: user.email,
      entitlement_tier: user.entitlement_tier,
      hasPro: safeHasPro,
      hasPaidAccess: safeHasPaidAccess,
    });
  }

  return {
    user,
    isLoading: q.isLoading,
    error: q.error,
    hasPro: safeHasPro,
    hasPaidAccess: safeHasPaidAccess,
    isAdmin: user?.role === "admin",
    refetch: q.refetch,
  };
}