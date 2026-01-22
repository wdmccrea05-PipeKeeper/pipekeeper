import { useMemo } from "react";
import { useCurrentUser } from "./useCurrentUser";
import { buildEntitlements } from "@/components/utils/entitlements";

export function useEntitlements() {
  const { user, subscription, hasPaid, isLoading } = useCurrentUser();

  return useMemo(() => {
    if (isLoading || !user) {
      return buildEntitlements({
        isPaidSubscriber: false,
        isProSubscriber: false,
        subscriptionStartedAt: null,
      });
    }

    // Check for Pro tier (future expansion)
    const isProSubscriber = false; // TODO: Add Pro tier detection when implemented

    return buildEntitlements({
      isPaidSubscriber: hasPaid,
      isProSubscriber,
      subscriptionStartedAt: subscription?.current_period_start || user?.created_date || null,
    });
  }, [user, subscription, hasPaid, isLoading]);
}