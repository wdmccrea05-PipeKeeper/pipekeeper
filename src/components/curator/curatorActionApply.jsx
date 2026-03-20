/**
 * CURATOR ACTION APPLY HANDLERS
 * 
 * Commit curator recommendations to the database
 * - Pipe specializations
 * - Tobacco classifications
 * - Bottle field updates
 * - Pipe measurements
 * - Bottle additions
 */

import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * Apply pipe specialization (update focus field)
 */
export async function applyPipeSpecialization(item, user) {
  if (!item.itemId || item.type !== "pipe") {
    throw new Error("Invalid pipe specialization item");
  }

  const payload = item.proposedChange.payload || {};
  const specialization = payload.specialization || payload.focus || "General";

  try {
    await base44.entities.Pipe.update(item.itemId, {
      focus: Array.isArray(specialization) ? specialization : [specialization],
    });

    return { success: true, message: `Updated ${item.itemName} specialization` };
  } catch (err) {
    console.error("Failed to apply pipe specialization:", err);
    throw err;
  }
}

/**
 * Apply tobacco reclassification (update blend_type)
 */
export async function applyTobaccoReclassification(item, user) {
  if (!item.itemId || item.type !== "tobacco") {
    throw new Error("Invalid tobacco reclassification item");
  }

  const payload = item.proposedChange.payload || {};
  const blendType = payload.blendType || payload.classification || "Unknown";

  try {
    await base44.entities.TobaccoBlend.update(item.itemId, {
      blend_type: blendType,
    });

    return { success: true, message: `Updated ${item.itemName} classification` };
  } catch (err) {
    console.error("Failed to apply tobacco reclassification:", err);
    throw err;
  }
}

/**
 * Apply bottle field update
 */
export async function applyBottleFieldUpdate(item, user) {
  if (!item.itemId || item.type !== "bottle") {
    throw new Error("Invalid bottle update item");
  }

  const payload = item.proposedChange.payload || {};
  const updateData = payload.update || payload;

  try {
    await base44.entities.Bottle.update(item.itemId, updateData);

    return { success: true, message: `Updated ${item.itemName}` };
  } catch (err) {
    console.error("Failed to apply bottle update:", err);
    throw err;
  }
}

/**
 * Apply pipe measurement update
 */
export async function applyPipeMeasurementUpdate(item, user) {
  if (!item.itemId || item.type !== "pipe") {
    throw new Error("Invalid pipe measurement item");
  }

  const payload = item.proposedChange.payload || {};
  const measurements = payload.measurements || {};

  try {
    await base44.entities.Pipe.update(item.itemId, measurements);

    return { success: true, message: `Updated ${item.itemName} measurements` };
  } catch (err) {
    console.error("Failed to apply pipe measurement update:", err);
    throw err;
  }
}

/**
 * Create bottle addition suggestion (informational only)
 */
export async function applyBottleAddition(item, user) {
  // Bottle additions are suggestions, not direct creates
  // User can use BottleForm to create
  return {
    success: true,
    message: `Suggestion: Add ${item.itemName}`,
    isSuggestion: true,
  };
}

/**
 * Apply all recommendations by type
 */
export async function applyAllRecommendations(groups, user) {
  const results = {
    total: { success: 0, failed: 0 },
    byType: {},
  };

  for (const group of groups) {
    for (const item of group.items || []) {
      const changeType = item.proposedChange?.type;
      if (!changeType) {
        results.total.failed++;
        continue;
      }

      try {
        let result;

        switch (changeType) {
          case "pipe_specialization":
            result = await applyPipeSpecialization(item, user);
            break;
          case "tobacco_classification":
            result = await applyTobaccoReclassification(item, user);
            break;
          case "bottle_update":
          case "bottle_field_update":
            result = await applyBottleFieldUpdate(item, user);
            break;
          case "pipe_measurement":
          case "pipe_measurement_update":
            result = await applyPipeMeasurementUpdate(item, user);
            break;
          case "bottle_addition":
          case "bottle_addition_suggestion":
            result = await applyBottleAddition(item, user);
            break;
          default:
            console.warn(`Unknown change type: ${changeType}`);
            results.total.failed++;
            continue;
        }

        if (result.success) {
          results.total.success++;
          if (!results.byType[changeType]) {
            results.byType[changeType] = [];
          }
          results.byType[changeType].push(result);
        } else {
          results.total.failed++;
        }
      } catch (err) {
        console.error(`Failed to apply ${changeType}:`, err);
        results.total.failed++;
      }
    }
  }

  return results;
}

/**
 * Build clarification prompt from context
 */
export function buildClarificationPrompt(clarificationContext) {
  if (!clarificationContext) {
    return "Can you explain this recommendation in more detail?";
  }

  const { itemName, issue, recommendation } = clarificationContext;

  if (itemName && issue) {
    return `Why should "${itemName}" be updated? The issue is "${issue}". Can you explain the reasoning?`;
  }

  if (recommendation) {
    return `Can you explain this recommendation in more detail: "${recommendation}"?`;
  }

  return "Can you explain this recommendation in more detail?";
}