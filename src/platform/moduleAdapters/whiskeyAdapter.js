// platform/moduleAdapters/whiskeyAdapter.js
// WhiskeyKeeper module adapter.
//
// Bridges WhiskeyKeeper bottle/tasting record fields to the shared platform item model.
// Mirrors the shape of pipeAdapter so the platform layer can resolve adapters uniformly.

import { MODULE_TYPES } from "../moduleTypes.js";

/**
 * Return the canonical value for a bottle record.
 * Priority: collector value → aftermarket price → retail price → purchase price.
 * @param {object} rawBottle
 * @returns {number|null}
 */
function resolveBottleValue(rawBottle) {
  const v =
    Number(rawBottle.collector_value) ||
    Number(rawBottle.aftermarket_price) ||
    Number(rawBottle.retail_price) ||
    Number(rawBottle.purchase_price) ||
    null;
  return v && Number.isFinite(v) ? v : null;
}

/**
 * WhiskeyKeeper bottle adapter.
 * Translates a raw Bottle record to the shared platform item shape.
 */
export const whiskeyAdapter = {
  moduleType: MODULE_TYPES.WHISKEY,

  /** Normalize a raw Bottle record to the shared platform item shape. */
  normalizeItem(rawBottle) {
    return {
      id: rawBottle.id,
      module_type: MODULE_TYPES.WHISKEY,
      name: rawBottle.name ?? rawBottle.expression ?? null,
      estimated_value: resolveBottleValue(rawBottle),
      purchase_price: rawBottle.purchase_price ?? null,
      favorite: rawBottle.favorite ?? rawBottle.is_favorite ?? false,
      ai_excluded: rawBottle.ai_excluded ?? false,
      public_visibility: rawBottle.public_visibility ?? true,
      _raw: rawBottle,
    };
  },

  /** Display name for the bottle. */
  getDisplayName(rawBottle) {
    return [rawBottle.distillery, rawBottle.expression || rawBottle.name]
      .filter(Boolean)
      .join(" — ") || rawBottle.name || "Unknown Bottle";
  },

  /** Primary photo URL or null. Priority: photo → photos[0] → photo_url → image → image_url */
  getPrimaryImage(rawBottle) {
    return (
      rawBottle.photo ||
      (Array.isArray(rawBottle.photos) ? rawBottle.photos[0] : null) ||
      rawBottle.photo_url ||
      rawBottle.image ||
      rawBottle.image_url ||
      null
    );
  },

  /** Canonical value for the bottle. */
  getValue(rawBottle) {
    return resolveBottleValue(rawBottle);
  },

  /** Most recent activity date (tasting_date, updated_date, or created_date). */
  getActivityDate(rawBottle) {
    return rawBottle.last_tasting_date ?? rawBottle.updated_date ?? rawBottle.created_date ?? null;
  },

  /** Alias for getActivityDate — satisfies platform getUpdatedDate contract. */
  getUpdatedDate(rawBottle) {
    return rawBottle.updated_date ?? rawBottle.created_date ?? null;
  },

  /** Collection type string used for grouping / display. */
  getCollectionType() {
    return "whiskey";
  },

  /** Return the usage profile used by AI recommendation and analytics adapters. */
  getUsageProfile(rawBottle) {
    return {
      whiskey_type: rawBottle.whiskey_type ?? rawBottle.type ?? null,
      region: rawBottle.region ?? null,
      age_statement: rawBottle.age_statement ?? rawBottle.age ?? null,
      abv: rawBottle.abv ?? null,
    };
  },

  /** Return the attribute profile for analytics and matching engines. */
  getAttributeProfile(rawBottle) {
    return {
      distillery: rawBottle.distillery ?? null,
      expression: rawBottle.expression ?? null,
      country: rawBottle.country ?? null,
      finish: rawBottle.finish ?? null,
    };
  },

  /** Check whether this bottle is eligible for AI recommendations. */
  isAiEligible(rawBottle) {
    return !rawBottle.ai_excluded;
  },
};