import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const ENTITLEMENT_URL =
  import.meta.env.VITE_ENTITLEMENT_URL ||
  "https://entitlement.pipekeeper.app/api/entitlement";

export function useCurrentUser() {
  console.log("[ENTITLEMENT_HOOK] mounted");
  
  const userQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const me = await base44.auth.me();
      if (!me?.email) return null;

      const url = `${ENTITLEMENT_URL}?email=${encodeURIComponent(me.email)}&ts=${Date.now()}`;
      
      const res = await fetch(url, {
        method: "GET",
        headers: { "Accept": "application/json" },
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
        data = { entitlement_tier: "free" };
      }

      const entitlement_tier = data?.entitlement_tier || "free";
      
      console.log("[ENTITLEMENT_CHECK]", {
        email: me.email,
        tier: entitlement_tier,
      });

      return { ...me, entitlement_tier };
    },
    staleTime: 60_000,
    retry: false,
  });

  const user = userQuery.data;
  const tier = user?.entitlement_tier || "free";

  return {
    user,
    isLoading: userQuery.isLoading,
    error: userQuery.error,
    hasPro: tier === "pro",
    hasPremium: tier === "premium",
    hasPaidAccess: tier === "pro" || tier === "premium",
    isAdmin: user?.role === "admin",
    subscription: null,
    refetch: userQuery.refetch,
  };
}