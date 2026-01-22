import { useMemo } from "react";
import { useCurrentUser } from "./useCurrentUser";
import { buildEntitlements } from "@/components/utils/entitlements";

export function useEntitlements() {
  const { user, subscription, hasPaid, isLoading, isInTrial } = useCurrentUser();

  return useMemo(() => {
    if (isLoading || !user) {
      return buildEntitlements({
        isPaidSubscriber: false,
        isProSubscriber: false,
        subscriptionStartedAt: null,
        isOnTrial: false,
      });
    }

    // Check for Pro tier
    const isProSubscriber = !!(hasPaid && subscription?.tier === 'pro');

    return buildEntitlements({
      isPaidSubscriber: hasPaid,
      isProSubscriber,
      subscriptionStartedAt: subscription?.started_at || subscription?.current_period_start || user?.created_date || null,
      isFreeGrandfathered: user?.isFreeGrandfathered || false,
      isOnTrial: isInTrial,
    });
  }, [user, subscription, hasPaid, isLoading, isInTrial]);
}