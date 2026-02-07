import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { getEffectiveEntitlement } from "@/components/utils/getEffectiveEntitlement";

export function useCurrentUser() {
  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      try {
        const me = await base44.auth.me();
        if (!me) return null;

        // Extract ID with fallbacks: me.id, me.user_id, me.userId, me.user?.id
        const userId = me.id || me.user_id || me.userId || me.user?.id;
        if (!userId) {
          console.error("[useCurrentUser] No user ID found in auth response:", me);
          return null;
        }

        return await base44.entities.User.get(userId);
      } catch (error) {
        console.error("[useCurrentUser] Error:", error);
        throw error;
      }
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 2,
  });

  // Derived access flags (CANONICAL: read from entitlement_tier only)
  const effective = getEffectiveEntitlement(user);
  const hasPro = effective === "pro";
  const hasPaidAccess = effective === "pro" || effective === "premium";
  const isAdmin = user?.role === "admin";

  // Logging for verification
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