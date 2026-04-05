// platform/moduleAdapters/cigarAdapter.js
// CigarKeeper module adapter.
//
// Bridges CigarKeeper cigar record fields to the shared platform item model.
// This adapter is the authoritative translation layer between CigarKeeper's
// schema and the platform item shape.

import { MODULE_TYPES } from "../moduleTypes.js";

/**
 * Return the canonical value for a cigar record.
 * Priority: estimated_value → purchase_price.
 * @param {object} rawCigar
 * @returns {number|null}
 */
function resolveCigarValue(rawCigar) {
  const v =
    Number(rawCigar.estimated_value) ||
    Number(rawCigar.purchase_price) ||
    null;
  return v && Number.isFinite(v) ? v : null;
}

/**
 * CigarKeeper cigar adapter.
 * Translates a raw Cigar record to the shared platform item shape.
 */
export const cigarAdapter = {
  moduleType: MODULE_TYPES.CIGAR,

  /**
   * Normalize a raw Cigar record to the shared platform item shape.
   * @param {object} rawCigar
   * @returns {object}
   */
  normalizeItem(rawCigar) {
    return {
      id: rawCigar.id,
      module_type: MODULE_TYPES.CIGAR,
      name: rawCigar.name ?? null,
      estimated_value: resolveCigarValue(rawCigar),
      purchase_price: rawCigar.purchase_price ?? null,
      favorite: rawCigar.is_favorite ?? false,
      ai_excluded: rawCigar.ai_excluded ?? false,
      public_visibility: rawCigar.public_visibility ?? true,
      _raw: rawCigar,
    };
  },

  /**
   * Display name for the cigar.
   * Format: "<Brand> <Line> — <Vitola>" when available, falling back gracefully.
   * @param {object} rawCigar
   * @returns {string}
   */
  getDisplayName(rawCigar) {
    const brand = rawCigar.brand ?? null;
    const line = rawCigar.line ?? null;
    const vitola = rawCigar.vitola ?? null;

    const primary = [brand, line].filter(Boolean).join(" ");
    return [primary || rawCigar.name, vitola]
      .filter(Boolean)
      .join(" — ") || rawCigar.name || "Unknown Cigar";
  },

  /**
   * Primary photo URL or null.
   * Priority: photos[0] → photo → photo_url → image → image_url.
   * @param {object} rawCigar
   * @returns {string|null}
   */
  getPrimaryImage(rawCigar) {
    return (
      (Array.isArray(rawCigar.photos) ? rawCigar.photos[0] : null) ||
      rawCigar.photo ||
      rawCigar.photo_url ||
      rawCigar.image ||
      rawCigar.image_url ||
      null
    );
  },

  /**
   * Canonical value for the cigar.
   * @param {object} rawCigar
   * @returns {number|null}
   */
  getValue(rawCigar) {
    return resolveCigarValue(rawCigar);
  },

  /**
   * Most recent activity date (purchase_date → updated_date → created_date).
   * @param {object} rawCigar
   * @returns {string|null}
   */
  getActivityDate(rawCigar) {
    return rawCigar.purchase_date ?? rawCigar.updated_date ?? rawCigar.created_date ?? null;
  },

  /**
   * Most recent record write date (updated_date → created_date).
   * Distinct from getActivityDate which includes purchase_date as a proxy for
   * collection activity. Satisfies the platform getUpdatedDate contract.
   * @param {object} rawCigar
   * @returns {string|null}
   */
  getUpdatedDate(rawCigar) {
    return rawCigar.updated_date ?? rawCigar.created_date ?? null;
  },

  /**
   * Collection type string used for grouping / display.
   * @returns {string}
   */
  getCollectionType() {
    return "cigar";
  },

  /**
   * Return the usage profile used by AI recommendation and analytics adapters.
   * Contains cigar-specific attributes that influence pairing and suggestion logic.
   * @param {object} rawCigar
   * @returns {object}
   */
  getUsageProfile(rawCigar) {
    return {
      vitola: rawCigar.vitola ?? null,
      body: rawCigar.body ?? null,
      strength: rawCigar.strength ?? null,
      flavor_notes: Array.isArray(rawCigar.flavor_notes) ? rawCigar.flavor_notes : [],
      length_inches: rawCigar.length_inches ?? null,
      ring_gauge: rawCigar.ring_gauge ?? null,
      aging_start_date: rawCigar.aging_start_date ?? null,
      ready_to_smoke_date: rawCigar.ready_to_smoke_date ?? null,
    };
  },

  /**
   * Return the attribute profile used by analytics and matching engines.
   * @param {object} rawCigar
   * @returns {object}
   */
  getAttributeProfile(rawCigar) {
    return {
      brand: rawCigar.brand ?? null,
      line: rawCigar.line ?? null,
      wrapper: rawCigar.wrapper ?? null,
      binder: rawCigar.binder ?? null,
      filler: rawCigar.filler ?? null,
      country_of_origin: rawCigar.country_of_origin ?? null,
      factory: rawCigar.factory ?? null,
      production_status: rawCigar.production_status ?? null,
      release_type: rawCigar.release_type ?? null,
    };
  },

  /**
   * Check whether this cigar is eligible for AI recommendations.
   * @param {object} rawCigar
   * @returns {boolean}
   */
  isAiEligible(rawCigar) {
    return !rawCigar.ai_excluded;
  },
};
