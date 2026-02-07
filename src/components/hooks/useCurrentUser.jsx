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
      const me = await base44.auth.me();
      if (!me?.id) return null;

      const email = normEmail(me?.email);
      const entitlement_tier = await fetchEntitlementTier(email);

      // Build a single user object that includes entitlement_tier
      return {
        ...me,
        entitlement_tier,
      };
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 1,
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