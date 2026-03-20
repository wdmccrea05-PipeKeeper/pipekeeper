/**
 * useProfilePrivacy — canonical hook for privacy toggle state.
 *
 * Returns the four privacy flags from the canonical UserProfile.
 * All components that conditionally hide values/counts/inventory
 * must read from this hook.
 */

import { useMemo } from "react";
import { useCanonicalProfile } from "@/utils/getCanonicalUserProfile";

export function useProfilePrivacy() {
  const { data: profileBundle, isLoading } = useCanonicalProfile();

  return useMemo(() => {
    const profile = profileBundle?.profile || null;

    return {
      isLoading,
      /** Hide ALL monetary values, totals, and analytics value outputs */
      hideValues: profile?.privacy_hide_values === true,
      /** Hide item lists and counts tied to inventory */
      hideInventory: profile?.privacy_hide_inventory === true,
      /** Hide collection counts (pipes, bottles, tins) */
      hideCollectionCounts: profile?.privacy_hide_collection_counts === true,
      /** Hide homepage hero card value panels only */
      hideHomeValues: profile?.home_hide_collection_values === true,
    };
  }, [profileBundle, isLoading]);
}