// platform/moduleAdapters/pipeAdapter.js
// PipeKeeper module adapter.
//
// Bridges PipeKeeper pipe/tobacco record fields to the shared platform item model.
// This adapter is the authoritative translation layer between PipeKeeper's
// existing schema and the platform item shape. All existing pipe/tobacco behavior
// is preserved — the adapter only provides translation, not modification.

import { MODULE_TYPES } from "../moduleTypes.js";
import { getBlendValue } from "@/lib/collection/tobaccoSelectors";

/**
 * PipeKeeper pipe adapter.
 * Translates a raw Pipe record to the shared platform item shape.
 */
export const pipeAdapter = {
  moduleType: MODULE_TYPES.PIPE,

  /**
   * Normalize a raw Pipe record to the shared platform item shape.
   * @param {object} rawPipe
   * @returns {object}
   */
  normalizeItem(rawPipe) {
    return {
      id: rawPipe.id,
      module_type: MODULE_TYPES.PIPE,
      name: rawPipe.name ?? rawPipe.brand ?? null,
      estimated_value: rawPipe.estimated_value ?? null,
      purchase_price: rawPipe.purchase_price ?? null,
      favorite: rawPipe.is_favorite ?? false,
      ai_excluded: rawPipe.ai_excluded ?? false,
      public_visibility: rawPipe.public_visibility ?? true,
      _raw: rawPipe,
    };
  },

  /**
   * Return the usage profile used by AI recommendation and analytics adapters.
   * Contains pipe-specific attributes that influence pairing and optimization.
   * @param {object} rawPipe
   * @returns {object}
   */
  getUsageProfile(rawPipe) {
    return {
      shape: rawPipe.shape ?? null,
      material: rawPipe.material ?? null,
      chamber_volume: rawPipe.chamber_volume ?? null,
      focus: Array.isArray(rawPipe.focus) ? rawPipe.focus : [],
    };
  },

  /**
   * Return the attribute profile used by analytics and matching engines.
   * @param {object} rawPipe
   * @returns {object}
   */
  getAttributeProfile(rawPipe) {
    return {
      brand: rawPipe.brand ?? null,
      maker: rawPipe.maker ?? null,
      finish: rawPipe.finish ?? null,
      stem_material: rawPipe.stem_material ?? null,
      condition: rawPipe.condition ?? null,
    };
  },

  /**
   * Check whether this pipe is eligible for AI recommendations.
   * @param {object} rawPipe
   * @returns {boolean}
   */
  isAiEligible(rawPipe) {
    return !rawPipe.ai_excluded;
  },
};

/**
 * PipeKeeper tobacco/blend adapter.
 * Translates a raw TobaccoBlend record to the shared platform item shape.
 */
export const tobaccoAdapter = {
  moduleType: MODULE_TYPES.TOBACCO,

  /**
   * Normalize a raw TobaccoBlend record to the shared platform item shape.
   * @param {object} rawBlend
   * @returns {object}
   */
  normalizeItem(rawBlend) {
    return {
      id: rawBlend.id,
      module_type: MODULE_TYPES.TOBACCO,
      name: rawBlend.name ?? rawBlend.blend_name ?? null,
      estimated_value: getBlendValue(rawBlend),
      purchase_price: rawBlend.purchase_price ?? null,
      favorite: rawBlend.is_favorite ?? false,
      ai_excluded: rawBlend.ai_excluded ?? false,
      public_visibility: rawBlend.public_visibility ?? true,
      _raw: rawBlend,
    };
  },

  /**
   * Return the usage profile for tobacco blends, used by AI recommendations.
   * @param {object} rawBlend
   * @returns {object}
   */
  getUsageProfile(rawBlend) {
    return {
      blend_type: rawBlend.blend_type ?? null,
      strength: rawBlend.strength ?? null,
      cut: rawBlend.cut ?? null,
      flavoring: rawBlend.flavoring ?? null,
    };
  },

  /**
   * Return the attribute profile for tobacco blends.
   * @param {object} rawBlend
   * @returns {object}
   */
  getAttributeProfile(rawBlend) {
    return {
      brand: rawBlend.brand ?? null,
      country_of_origin: rawBlend.country_of_origin ?? null,
      tin_year: rawBlend.tin_year ?? null,
      aging_potential: rawBlend.aging_potential ?? null,
    };
  },

  /**
   * Check whether this blend is eligible for AI recommendations.
   * @param {object} rawBlend
   * @returns {boolean}
   */
  isAiEligible(rawBlend) {
    return !rawBlend.ai_excluded;
  },
};
