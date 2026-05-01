/**
 * useProfilePrivacy — canonical hook for privacy toggle state.
 *
 * Two independent dimensions:
 *
 *  PUBLIC flags  — control what other users see on your public/community profile.
 *    hideValues            privacy_hide_values
 *    hideInventory         privacy_hide_inventory
 *    hideCollectionCounts  privacy_hide_collection_counts
 *    hideHomeValues        home_hide_collection_values  (legacy; hides from owner's own home card)
 *
 *  PERSONAL flag — controls what YOU see in your own module dashboards.
 *    personalHideTotals    personal_hide_totals
 *
 * Components that display data to the OWNER should gate on personalHideTotals.
 * Components that display data to OTHER USERS should gate on the public flags.
 */

import { useMemo } from "react";
import { useCanonicalProfile } from "@/utils/getCanonicalUserProfile";

export function useProfilePrivacy() {
  const { data: profileBundle, isLoading } = useCanonicalProfile();

  return useMemo(() => {
    const profile = profileBundle?.profile || null;

    return {
      isLoading,

      // ── Public-facing flags (hide from other users) ──────────────────────
      /** Hide ALL monetary values on the public/community profile */
      hideValues: profile?.privacy_hide_values === true,
      /** Hide item lists and counts on the public/community profile */
      hideInventory: profile?.privacy_hide_inventory === true,
      /** Hide collection counts on the public/community profile */
      hideCollectionCounts: profile?.privacy_hide_collection_counts === true,
      /** Hide homepage hero card value panels from the owner's own home page (legacy) */
      hideHomeValues: profile?.home_hide_collection_values === true,

      // ── Personal flag (hide from yourself) ───────────────────────────────
      /** Hide all totals and values in your own module dashboards */
      personalHideTotals: profile?.personal_hide_totals === true,
    };
  }, [profileBundle, isLoading]);
}