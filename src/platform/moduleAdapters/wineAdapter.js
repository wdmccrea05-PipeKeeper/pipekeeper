// platform/moduleAdapters/wineAdapter.js
// WineKeeper module adapter — GROUNDWORK ONLY.
//
// NOTE: This adapter is NOT yet registered in the adapter registry and is not
// active in the current build. It is scaffolded here so the WineKeeper module
// can be activated by registering it in the adapter registry and adding
// MODULE_TYPES.WINE to ACTIVE_MODULES when the time comes.
//
// Bridges WineKeeper bottle record fields to the shared platform item model.

import { MODULE_TYPES } from "../moduleTypes.js";

/**
 * Return the canonical value for a wine bottle record.
 * Priority: estimated_value → purchase_price.
 * @param {object} rawWine
 * @returns {number|null}
 */
function resolveWineValue(rawWine) {
  const v =
    Number(rawWine.estimated_value) ||
    Number(rawWine.purchase_price) ||
    null;
  return v && Number.isFinite(v) ? v : null;
}

/**
 * WineKeeper wine adapter.
 * Translates a raw Wine record to the shared platform item shape.
 */
export const wineAdapter = {
  moduleType: MODULE_TYPES.WINE,

  /**
   * Normalize a raw Wine record to the shared platform item shape.
   * @param {object} rawWine
   * @returns {object}
   */
  normalizeItem(rawWine) {
    return {
      id: rawWine.id,
      module_type: MODULE_TYPES.WINE,
      name: rawWine.name ?? null,
      estimated_value: resolveWineValue(rawWine),
      purchase_price: rawWine.purchase_price ?? null,
      favorite: rawWine.is_favorite ?? false,
      ai_excluded: rawWine.ai_excluded ?? false,
      public_visibility: rawWine.public_visibility ?? true,
      _raw: rawWine,
    };
  },

  /**
   * Display name for the wine.
   * Format: "<Producer> <Name> <Vintage>" when available, falling back gracefully.
   * @param {object} rawWine
   * @returns {string}
   */
  getDisplayName(rawWine) {
    const producer = rawWine.producer ?? null;
    const vintage = rawWine.vintage ? String(rawWine.vintage) : null;
    return [producer, rawWine.name, vintage]
      .filter(Boolean)
      .join(" ") || rawWine.name || "Unknown Wine";
  },

  /**
   * Primary photo URL or null.
   * Priority: photos[0] → photo → photo_url → image → image_url.
   * @param {object} rawWine
   * @returns {string|null}
   */
  getPrimaryImage(rawWine) {
    return (
      (Array.isArray(rawWine.photos) ? rawWine.photos[0] : null) ||
      rawWine.photo ||
      rawWine.photo_url ||
      rawWine.image ||
      rawWine.image_url ||
      null
    );
  },

  /**
   * Canonical value for the wine bottle.
   * @param {object} rawWine
   * @returns {number|null}
   */
  getValue(rawWine) {
    return resolveWineValue(rawWine);
  },

  /**
   * Most recent activity date (updated_date → created_date).
   * Wine does not expose a standalone purchase_date field; updated_date is
   * the best proxy for collection activity.
   * @param {object} rawWine
   * @returns {string|null}
   */
  getActivityDate(rawWine) {
    return rawWine.updated_date ?? rawWine.created_date ?? null;
  },

  /**
   * Most recent record write date (updated_date → created_date).
   * Satisfies the platform getUpdatedDate contract.
   * @param {object} rawWine
   * @returns {string|null}
   */
  getUpdatedDate(rawWine) {
    return rawWine.updated_date ?? rawWine.created_date ?? null;
  },

  /**
   * Collection type string used for grouping / display.
   * @returns {string}
   */
  getCollectionType() {
    return "wine";
  },

  /**
   * Return the usage profile used by AI recommendation and analytics adapters.
   * @param {object} rawWine
   * @returns {object}
   */
  getUsageProfile(rawWine) {
    return {
      style: rawWine.style ?? null,
      varietal: rawWine.varietal ?? null,
      blend_components: Array.isArray(rawWine.blend_components) ? rawWine.blend_components : [],
      vintage: rawWine.vintage ?? null,
      abv: rawWine.abv ?? null,
      drink_window_start: rawWine.drink_window_start ?? null,
      drink_window_end: rawWine.drink_window_end ?? null,
      peak_window_start: rawWine.peak_window_start ?? null,
      peak_window_end: rawWine.peak_window_end ?? null,
    };
  },

  /**
   * Return the attribute profile used by analytics and matching engines.
   * @param {object} rawWine
   * @returns {object}
   */
  getAttributeProfile(rawWine) {
    return {
      producer: rawWine.producer ?? null,
      region: rawWine.region ?? null,
      appellation: rawWine.appellation ?? null,
      country_of_origin: rawWine.country_of_origin ?? null,
      bottle_size: rawWine.bottle_size ?? null,
    };
  },

  /**
   * Check whether this wine is eligible for AI recommendations.
   * @param {object} rawWine
   * @returns {boolean}
   */
  isAiEligible(rawWine) {
    return !rawWine.ai_excluded;
  },
};
