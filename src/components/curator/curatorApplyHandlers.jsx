import { base44 } from "@/api/base44Client";

export async function applyCuratorRecommendation(item) {
  switch (item.type) {
    case "specialization":
    case "measurement_update":
    case "rotation_optimization":
      if (item.recordType !== "pipe") {
        throw new Error("Pipe recommendation is missing a valid pipe target.");
      }
      return base44.entities.Pipe.update(item.recordId, item.proposedChanges);

    case "reclassification":
      if (item.recordType === "blend") {
        return base44.entities.TobaccoBlend.update(item.recordId, item.proposedChanges);
      }
      if (item.recordType === "pipe") {
        return base44.entities.Pipe.update(item.recordId, item.proposedChanges);
      }
      throw new Error("Unsupported reclassification record type.");

    case "redundancy_flag":
      if (item.recordType !== "blend") {
        throw new Error("Blend recommendation is missing a valid blend target.");
      }
      return base44.entities.TobaccoBlend.update(item.recordId, item.proposedChanges);

    default:
      throw new Error(`Unsupported recommendation type: ${item.type}`);
  }
}

export async function applyCuratorRecommendations(items) {
  const results = {
    success: [],
    failed: [],
    errors: [],
  };

  for (const item of items) {
    try {
      await applyCuratorRecommendation(item);
      results.success.push(item.id);
    } catch (error) {
      results.failed.push(item.id);
      results.errors.push({
        id: item.id,
        error: error?.message || "Failed to apply recommendation.",
      });
    }
  }

  return results;
}