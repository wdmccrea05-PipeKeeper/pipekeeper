/**
 * Curator Apply Handlers
 * 
 * Handles committing recommendations to the database
 * - Pipe specializations
 * - Tobacco reclassifications
 * - Bottle field updates
 * - Pipe measurement updates
 */

import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * Apply pipe specialization recommendations
 */
export async function applyPipeSpecializations(items, user) {
  const results = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (const item of items) {
    try {
      if (item.type !== "pipe" || !item.itemId) {
        throw new Error("Invalid pipe item");
      }

      const payload = item.proposedChange?.payload || {};
      const focus = Array.isArray(payload.focus) ? payload.focus : [];

      await base44.entities.Pipe.update(item.itemId, {
        focus,
      });

      // Log apply result
      try {
        await base44.entities.CuratorActionApplyResult.create({
          recommendation_id: item.id,
          action_run_id: item.actionRunId || "unknown",
          user_email: user?.email,
          item_type: "pipe",
          item_id: item.itemId,
          success: true,
          before_state: { focus: item.beforeFocus || [] },
          after_state: { focus },
          applied_at: new Date().toISOString(),
        });
      } catch (logErr) {
        console.warn("Failed to log apply result:", logErr);
      }

      results.success++;
    } catch (err) {
      console.error(`Failed to apply pipe specialization for ${item.itemName}:`, err);
      results.failed++;
      results.errors.push({
        itemName: item.itemName,
        error: err?.message || String(err),
      });
    }
  }

  return results;
}

/**
 * Apply tobacco reclassification recommendations
 */
export async function applyTobaccoReclassifications(items, user) {
  const results = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (const item of items) {
    try {
      if (item.type !== "tobacco" || !item.itemId) {
        throw new Error("Invalid tobacco item");
      }

      const payload = item.proposedChange?.payload || {};
      const blendType = String(payload.blend_type || "").trim();

      if (!blendType) {
        throw new Error("No blend type specified");
      }

      const beforeType = item.beforeBlendType || "Unknown";

      await base44.entities.TobaccoBlend.update(item.itemId, {
        blend_type: blendType,
      });

      // Log apply result
      try {
        await base44.entities.CuratorActionApplyResult.create({
          recommendation_id: item.id,
          action_run_id: item.actionRunId || "unknown",
          user_email: user?.email,
          item_type: "tobacco",
          item_id: item.itemId,
          success: true,
          before_state: { blend_type: beforeType },
          after_state: { blend_type: blendType },
          applied_at: new Date().toISOString(),
        });
      } catch (logErr) {
        console.warn("Failed to log apply result:", logErr);
      }

      results.success++;
    } catch (err) {
      console.error(`Failed to apply tobacco reclassification for ${item.itemName}:`, err);
      results.failed++;
      results.errors.push({
        itemName: item.itemName,
        error: err?.message || String(err),
      });
    }
  }

  return results;
}

/**
 * Apply bottle field updates (metadata, valuation, etc)
 */
export async function applyBottleFieldUpdates(items, user) {
  const results = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (const item of items) {
    try {
      if (item.type !== "bottle" || !item.itemId) {
        throw new Error("Invalid bottle item");
      }

      const payload = item.proposedChange?.payload || {};
      const updates = {};

      // Only apply provided fields
      ["proof", "age_years", "bottling_date", "notes"].forEach((field) => {
        if (field in payload) {
          updates[field] = payload[field];
        }
      });

      if (Object.keys(updates).length === 0) {
        throw new Error("No fields to update");
      }

      await base44.entities.Bottle.update(item.itemId, updates);

      // Log apply result
      try {
        await base44.entities.CuratorActionApplyResult.create({
          recommendation_id: item.id,
          action_run_id: item.actionRunId || "unknown",
          user_email: user?.email,
          item_type: "bottle",
          item_id: item.itemId,
          success: true,
          after_state: updates,
          applied_at: new Date().toISOString(),
        });
      } catch (logErr) {
        console.warn("Failed to log apply result:", logErr);
      }

      results.success++;
    } catch (err) {
      console.error(`Failed to apply bottle update for ${item.itemName}:`, err);
      results.failed++;
      results.errors.push({
        itemName: item.itemName,
        error: err?.message || String(err),
      });
    }
  }

  return results;
}

/**
 * Apply pipe measurement updates
 */
export async function applyPipeMeasurementUpdates(items, user) {
  const results = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (const item of items) {
    try {
      if (item.type !== "pipe" || !item.itemId) {
        throw new Error("Invalid pipe item");
      }

      const payload = item.proposedChange?.payload || {};
      const updates = {};

      // Only apply provided measurement fields
      ["length_mm", "weight_grams", "bowl_height_mm", "bowl_width_mm"].forEach((field) => {
        if (field in payload) {
          updates[field] = payload[field];
        }
      });

      if (Object.keys(updates).length === 0) {
        throw new Error("No measurements to update");
      }

      await base44.entities.Pipe.update(item.itemId, updates);

      // Log apply result
      try {
        await base44.entities.CuratorActionApplyResult.create({
          recommendation_id: item.id,
          action_run_id: item.actionRunId || "unknown",
          user_email: user?.email,
          item_type: "pipe",
          item_id: item.itemId,
          success: true,
          after_state: updates,
          applied_at: new Date().toISOString(),
        });
      } catch (logErr) {
        console.warn("Failed to log apply result:", logErr);
      }

      results.success++;
    } catch (err) {
      console.error(`Failed to apply pipe measurements for ${item.itemName}:`, err);
      results.failed++;
      results.errors.push({
        itemName: item.itemName,
        error: err?.message || String(err),
      });
    }
  }

  return results;
}

/**
 * Main dispatcher — routes items to appropriate handlers
 */
export async function applyAllRecommendations(groups, user) {
  const allResults = {
    pipes: { success: 0, failed: 0 },
    tobacco: { success: 0, failed: 0 },
    bottles: { success: 0, failed: 0 },
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

  // Apply by type
  if (itemsByType.pipe.length > 0) {
    const result = await applyPipeSpecializations(itemsByType.pipe, user);
    allResults.pipes = result;
    allResults.total.success += result.success;
    allResults.total.failed += result.failed;
    allResults.total.errors.push(...result.errors);
  }

  if (itemsByType.tobacco.length > 0) {
    const result = await applyTobaccoReclassifications(itemsByType.tobacco, user);
    allResults.tobacco = result;
    allResults.total.success += result.success;
    allResults.total.failed += result.failed;
    allResults.total.errors.push(...result.errors);
  }

  if (itemsByType.bottle.length > 0) {
    const result = await applyBottleFieldUpdates(itemsByType.bottle, user);
    allResults.bottles = result;
    allResults.total.success += result.success;
    allResults.total.failed += result.failed;
    allResults.total.errors.push(...result.errors);
  }

  return allResults;
}

/**
 * Build clarification prompt from item context
 */
export function buildClarificationPrompt(item) {
  return `I'd like to understand more about this recommendation:

Item: ${item.itemName}
Issue: ${item.issue}
Recommendation: ${item.recommendation}

Can you explain the reasoning in more detail?`;
}