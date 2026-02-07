import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { getEffectiveEntitlement } from "@/components/utils/getEffectiveEntitlement";

export function useCurrentUser() {
  const { data: user, isLoading, error, refetch } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      // IMPORTANT:
      // Do NOT call base44.entities.User.* from the browser.
      // Your screenshots show 403 on User resource, so any User.get/list/filter will fail.
      // Use auth.me() only.
      const me = await base44.auth.me();
      return me ?? null;
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 2,
  });

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

  return { user, isLoading, error, hasPro, hasPaidAccess, isAdmin, refetch };
}