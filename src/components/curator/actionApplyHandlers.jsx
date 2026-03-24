/**
 * ACTION APPLY HANDLERS
 * 
 * Maps recommendation types to update operations on pipes, blends, bottles.
 * Each handler validates, applies, and returns result status.
 */

import { base44 } from "@/api/base44Client";

const handlers = {
  /**
   * Specialization recommendations
   * Apply: { specializations: [...] } to pipe.focus field
   */
  specialization: async (item, user) => {
    if (!item?.recordId || item.recordType !== "pipe") {
      throw new Error("Invalid specialization recommendation");
    }

    const changes = item.proposedChanges || {};
    const specializations = changes.specializations || [];

    if (!specializations.length) {
      throw new Error("No specializations provided");
    }

    await base44.entities.Pipe.update(item.recordId, {
      focus: specializations,
    });

    return { success: true, applied: "specializations" };
  },

  /**
   * Reclassification recommendations for blends
   * Apply: { blend_type, strength, etc. } to blend fields
   */
  reclassification: async (item, user) => {
    if (!item?.recordId) {
      throw new Error("Invalid reclassification recommendation");
    }

    const changes = item.proposedChanges || {};
    
    if (Object.keys(changes).length === 0) {
      throw new Error("No fields to update");
    }

    const entity = item.recordType === "blend" ? "TobaccoBlend" : item.recordType === "pipe" ? "Pipe" : null;
    if (!entity) {
      throw new Error(`Unknown record type: ${item.recordType}`);
    }

    await base44.entities[entity].update(item.recordId, changes);

    return { success: true, applied: Object.keys(changes) };
  },

  /**
   * Measurement update recommendations for pipes
   * Apply: { length_mm, weight_grams, bowl_width_mm, etc. } to pipe
   */
  measurements: async (item, user) => {
    if (!item?.recordId || item.recordType !== "pipe") {
      throw new Error("Invalid measurement recommendation");
    }

    const changes = item.proposedChanges || {};
    
    // Only allow measurement fields
    const MEASUREMENT_FIELDS = [
      "length_mm",
      "weight_grams",
      "bowl_height_mm",
      "bowl_width_mm",
      "bowl_diameter_mm",
      "bowl_depth_mm",
    ];

    const validChanges = {};
    for (const [key, value] of Object.entries(changes)) {
      if (MEASUREMENT_FIELDS.includes(key) && value !== null && value !== undefined) {
        validChanges[key] = value;
      }
    }

    if (Object.keys(validChanges).length === 0) {
      throw new Error("No valid measurement fields provided");
    }

    await base44.entities.Pipe.update(item.recordId, validChanges);

    return { success: true, applied: Object.keys(validChanges) };
  },

  /**
   * Generic optimization changes (reclassify, add focus, etc.)
   */
  "reclassification|redundancy|rotation_fit|value_gap": async (item, user) => {
    if (!item?.recordId) {
      throw new Error("Invalid optimization recommendation");
    }

    const changes = item.proposedChanges || {};
    
    if (Object.keys(changes).length === 0) {
      throw new Error("No fields to update");
    }

    // Determine entity type from recordType
    const entity = item.recordType === "pipe" ? "Pipe" : item.recordType === "blend" ? "TobaccoBlend" : item.recordType === "bottle" ? "Bottle" : null;
    if (!entity) {
      throw new Error(`Unknown record type: ${item.recordType}`);
    }

    await base44.entities[entity].update(item.recordId, changes);

    return { success: true, applied: Object.keys(changes) };
  },
};

/**
 * Apply a single recommendation
 */
export async function applyRecommendation(item, user) {
  if (!item) {
    throw new Error("No recommendation to apply");
  }

  // Find handler by type
  const handler = handlers[item.type] || handlers["reclassification|redundancy|rotation_fit|value_gap"];
  
  if (!handler) {
    throw new Error(`No handler for recommendation type: ${item.type}`);
  }

  return handler(item, user);
}

/**
 * Apply multiple recommendations
 */
export async function applyRecommendations(items, user) {
  const results = {
    applied: [],
    failed: [],
  };

  for (const item of items) {
    try {
      const result = await applyRecommendation(item, user);
      results.applied.push({
        itemId: item.id,
        recordId: item.recordId,
        recordType: item.recordType,
        ...result,
      });
    } catch (err) {
      results.failed.push({
        itemId: item.id,
        recordId: item.recordId,
        error: err?.message || "Unknown error",
      });
    }
  }

  return results;
}