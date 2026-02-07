import { useMemo } from "react";
import { useCurrentUser } from "./useCurrentUser";
import { buildEntitlements } from "@/components/utils/entitlements";
import { hasProAccess } from "@/components/utils/entitlementCanonical";

export function useEntitlements() {
  const { user, hasPro, isLoading } = useCurrentUser();

  return useMemo(() => {
    if (isLoading || !user) {
      return buildEntitlements({
        isPaidSubscriber: false,
        isProSubscriber: false,
        subscriptionStartedAt: null,
        isOnTrial: false,
      });
    }

    return buildEntitlements({
      isPaidSubscriber: hasPro,
      isProSubscriber: hasPro,
      subscriptionStartedAt: user?.created_date || null,
      isFreeGrandfathered: false,
      isOnTrial: false,
    });
  }, [user, hasPro, isLoading]);
}