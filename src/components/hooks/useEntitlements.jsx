import { useMemo } from "react";
import { useCurrentUser } from "./useCurrentUser";
import { buildEntitlements } from "@/components/utils/entitlements";
import { getEffectiveEntitlement } from "@/components/utils/getEffectiveEntitlement";

export function useEntitlements() {
  const { user, isLoading } = useCurrentUser();

  return useMemo(() => {
    if (isLoading || !user) {
      return buildEntitlements({
        isPaidSubscriber: false,
        isProSubscriber: false,
        subscriptionStartedAt: null,
        isOnTrial: false,
      });
    }

    const effective = getEffectiveEntitlement(user);
    const isPro = effective === "pro";
    const isPaidOrPro = effective === "pro" || effective === "premium";

    return buildEntitlements({
      isPaidSubscriber: isPaidOrPro,
      isProSubscriber: isPro,
      subscriptionStartedAt: user?.created_date || null,
      isFreeGrandfathered: false,
      isOnTrial: false,
    });
  }, [user, isLoading]);
}