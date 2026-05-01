/**
 * profileVisibility — pure helper functions for profile privacy flag resolution.
 *
 * Two independent dimensions:
 *
 *  PERSONAL flags — control what the owner sees in their own dashboards/home.
 *    shouldHideOwnDashboardTotals   personal_hide_totals
 *    shouldHideHomeCollectionValues home_hide_collection_values
 *
 *  PUBLIC flags — control what other users see on the public/community profile.
 *    shouldHidePublicValues         privacy_hide_values
 *    shouldHidePublicInventory      privacy_hide_inventory
 *    shouldHidePublicCounts         privacy_hide_collection_counts
 *
 * Rules:
 *  - personal_hide_totals=true         → hide all counts/values/totals on user's own module dashboards.
 *  - home_hide_collection_values=true  → hide only monetary values on the Hub/home dashboard.
 *  - privacy_hide_values=true          → hide monetary values on public/community profile only.
 *  - privacy_hide_inventory=true       → hide public inventory lists only.
 *  - privacy_hide_collection_counts=true → hide public counts only.
 */

/** Hide all totals, counts, and values on the owner's own module dashboards. */
export const shouldHideOwnDashboardTotals = (profile) => profile?.personal_hide_totals === true;

/** Hide monetary values on the Hub/home dashboard (owner's own home page). */
export const shouldHideHomeCollectionValues = (profile) => profile?.home_hide_collection_values === true;

/** Hide monetary values on the public/community profile (visible to other users). */
export const shouldHidePublicValues = (profile) => profile?.privacy_hide_values === true;

/** Hide item inventory lists on the public/community profile (visible to other users). */
export const shouldHidePublicInventory = (profile) => profile?.privacy_hide_inventory === true;

/** Hide collection counts on the public/community profile (visible to other users). */
export const shouldHidePublicCounts = (profile) => profile?.privacy_hide_collection_counts === true;
