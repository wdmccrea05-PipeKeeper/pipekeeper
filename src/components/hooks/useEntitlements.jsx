import { useMemo } from "react";
import { useCurrentUser } from "./useCurrentUser";
import { buildEntitlements } from "@/components/utils/entitlements";
import { getEntitlementTier, hasPaidAccess, hasProAccess, isTrialingAccess, getPlanLabel } from "@/components/utils/premiumAccess";

export function useEntitlements() {
  const { user, subscription, isLoading } = useCurrentUser();

  return useMemo(() => {
    if (isLoading || !user) {
      return buildEntitlements({
        isPaidSubscriber: false,
        isProSubscriber: false,
        subscriptionStartedAt: null,
        isOnTrial: false,
      });
    }

    // Use canonical resolver functions
    const tier = getEntitlementTier(user, subscription);
    const isPaidSubscriber = hasPaidAccess(user, subscription);
    const isProSubscriber = hasProAccess(user, subscription);
    const isOnTrial = isTrialingAccess(user, subscription);

    return buildEntitlements({
      isPaidSubscriber,
      isProSubscriber,
      subscriptionStartedAt:
        subscription?.subscriptionStartedAt ||
        subscription?.started_at ||
        subscription?.current_period_start ||
        user?.created_date ||
        null,
      isFreeGrandfathered: user?.isFreeGrandfathered || false,
      isOnTrial,
    });
  }, [user, subscription, isLoading]);
}