/**
 * useEntitlements — canonical hook for entitlement state.
 * 
 * Delegates entirely to premiumAccess.jsx (single source of truth).
 * Returns the canonical entitlements object from buildCanonicalEntitlements().
 */

import { useMemo } from "react";
import { useCurrentUser } from "./useCurrentUser";
import { buildCanonicalEntitlements } from "@/components/utils/premiumAccess";

export function useEntitlements() {
  const { user, subscription, isLoading } = useCurrentUser();

  return useMemo(() => {
    // While loading, return a safe "unknown" state — never default to free
    // to prevent flicker of upgrade prompts for paid users.
    if (isLoading || !user) {
      return {
        tier: null, // null = unknown/loading, not "free"
        hasPro: false,
        isFree: false,
        paidModules: [],
        limits: { pipes: Infinity, tobaccos: Infinity, bottles: Infinity, photosPerItem: Infinity, smokingLogs: Infinity },
        canUse: () => false,
        isLegacyPremium: false,
        isFreeGrandfathered: false,
        isOnTrial: false,
      };
    }

    return buildCanonicalEntitlements(user, subscription);
  }, [user, subscription, isLoading]);
}