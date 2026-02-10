import { useMemo } from "react";
import { useCurrentUser } from "./useCurrentUser";
import { buildEntitlements } from "@/components/utils/entitlements";
import { hasProAccess } from "@/components/utils/premiumAccess";

export function useEntitlements() {
  const { user, subscription, hasPaid, isTrial, isLoading } = useCurrentUser();

  return useMemo(() => {
    if (isLoading || !user) {
      return buildEntitlements({
        isPaidSubscriber: false,
        isProSubscriber: false,
        subscriptionStartedAt: null,
        isOnTrial: false,
      });
    }

    const isProSubscriber = hasProAccess(user, subscription);

    return buildEntitlements({
      isPaidSubscriber: hasPaid,
      isProSubscriber,
      subscriptionStartedAt:
        subscription?.subscriptionStartedAt ||
        subscription?.started_at ||
        subscription?.current_period_start ||
        user?.created_date ||
        null,
      isFreeGrandfathered: user?.isFreeGrandfathered || false,
      isOnTrial: isTrial,
    });
  }, [user, subscription, hasPaid, isTrial, isLoading]);
}