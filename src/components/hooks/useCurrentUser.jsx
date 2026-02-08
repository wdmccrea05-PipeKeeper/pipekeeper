import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const ENTITLEMENT_URL = import.meta.env.VITE_ENTITLEMENT_URL;
const ENTITLEMENT_API_KEY = import.meta.env.VITE_ENTITLEMENT_API_KEY;

console.log("[ENTITLEMENT_URL]", ENTITLEMENT_URL);

const normEmail = (email) => String(email || "").trim().toLowerCase();

async function fetchEntitlementTier(email) {
  if (!ENTITLEMENT_URL) return "free";

  const headers = {};
  if (ENTITLEMENT_API_KEY) headers["x-entitlement-key"] = ENTITLEMENT_API_KEY;

  const res = await fetch(
    `${ENTITLEMENT_URL}?email=${encodeURIComponent(email)}`,
    { headers }
  );

  if (!res.ok) return "free";

  // Some upstreams may return JSON-as-a-string. Unwrap safely.
  let data = await res.text();
  try {
    while (typeof data === "string") data = JSON.parse(data);
  } catch {
    return "free";
  }

  const tier = String(data?.entitlement_tier || "free").trim().toLowerCase();
  return tier === "pro" || tier === "premium" ? tier : "free";
}

export function useCurrentUser() {
  const q = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
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

  return {
    user,
    isLoading: q.isLoading,
    error: q.error,
    hasPro: !!hasPro,
    hasPaidAccess: !!hasPaidAccess,
    isAdmin: user?.role === "admin",
    refetch: q.refetch,
  };
}