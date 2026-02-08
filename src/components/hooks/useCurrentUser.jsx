import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth";

const ENTITLEMENT_URL =
  import.meta.env.VITE_ENTITLEMENT_URL ||
  "https://entitlement.pipekeeper.app/api/entitlement";

export function useCurrentUser() {
  const { user } = useAuth();

  const entitlementQuery = useQuery({
    queryKey: ["entitlement", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const url =
        `${ENTITLEMENT_URL}?email=${encodeURIComponent(user.email)}&ts=${Date.now()}`;

      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
      });

      const text = await res.text();

      let data;
      try {
        data = JSON.parse(text);
        while (typeof data === "string") {
          data = JSON.parse(data);
        }
      } catch (err) {
        console.error("[ENTITLEMENT_PARSE_ERROR]", text);
        return { entitlement_tier: "free" };
      }

      console.log("[ENTITLEMENT_CHECK]", {
        email: user.email,
        tier: data?.entitlement_tier,
      });

      return data;
    },
    staleTime: 60_000,
  });

  return {
    user,
    entitlement: entitlementQuery.data || { entitlement_tier: "free" },
    entitlementTier: entitlementQuery.data?.entitlement_tier || "free",
    hasPro: entitlementQuery.data?.entitlement_tier === "pro",
    isLoading: entitlementQuery.isLoading,
  };
}