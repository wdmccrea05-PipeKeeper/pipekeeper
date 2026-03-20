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
 * Compatible with both old CuratorActionResultCard and new structured results
 */
export async function applyAllRecommendations(groups, user) {
  const allResults = {
    pipes: { success: 0, failed: 0, errors: [] },
    tobacco: { success: 0, failed: 0, errors: [] },
    bottles: { success: 0, failed: 0, errors: [] },
    total: { success: 0, failed: 0, errors: [] },
  };

  // Collect items by type
  const itemsByType = {
    pipe: [],
    tobacco: [],
    bottle: [],
  };

  (groups || []).forEach((group) => {
    (group.items || []).forEach((item) => {
      if (itemsByType[item.type]) {
        itemsByType[item.type].push(item);
      }
    });
  });

  // Apply pipe specializations
  for (const item of itemsByType.pipe) {
    try {
      const result = await applyPipeSpecialization(item, user);
      if (result.success) {
        allResults.pipes.success++;
        allResults.total.success++;
      } else {
        allResults.pipes.failed++;
        allResults.total.failed++;
      }
    } catch (err) {
      console.error(`Failed to apply pipe specialization:`, err);
      allResults.pipes.failed++;
      allResults.total.failed++;
      allResults.total.errors.push({ itemName: item.itemName, error: err?.message });
    }
  }

  // Apply tobacco reclassifications
  for (const item of itemsByType.tobacco) {
    try {
      const result = await applyTobaccoReclassification(item, user);
      if (result.success) {
        allResults.tobacco.success++;
        allResults.total.success++;
      } else {
        allResults.tobacco.failed++;
        allResults.total.failed++;
      }
    } catch (err) {
      console.error(`Failed to apply tobacco reclassification:`, err);
      allResults.tobacco.failed++;
      allResults.total.failed++;
      allResults.total.errors.push({ itemName: item.itemName, error: err?.message });
    }
  }

  // Apply bottle updates
  for (const item of itemsByType.bottle) {
    try {
      const result = await applyBottleFieldUpdate(item, user);
      if (result.success) {
        allResults.bottles.success++;
        allResults.total.success++;
      } else {
        allResults.bottles.failed++;
        allResults.total.failed++;
      }
    } catch (err) {
      console.error(`Failed to apply bottle update:`, err);
      allResults.bottles.failed++;
      allResults.total.failed++;
      allResults.total.errors.push({ itemName: item.itemName, error: err?.message });
    }
  }

  return allResults;
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