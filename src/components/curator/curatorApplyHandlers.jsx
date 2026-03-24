import { base44 } from "@/api/base44Client";

function ensureValidChangeSet(item) {
  if (item.type === "pairing_recommendation" || item.type === "session_builder") {
    return;
  }

  if (!item?.recordId) {
    throw new Error("Recommendation is missing a target record.");
  }

  if (!item?.proposedChanges || typeof item.proposedChanges !== "object") {
    throw new Error("Recommendation is missing proposed changes.");
  }

  if (Object.keys(item.proposedChanges).length === 0) {
    throw new Error("Recommendation has no fields to apply.");
  }
}

async function updatePipe(recordId, changes) {
  return base44.entities.Pipe.update(recordId, changes);
}

async function updateBlend(recordId, changes) {
  return base44.entities.TobaccoBlend.update(recordId, changes);
}

async function updateBottle(recordId, changes) {
  return base44.entities.Bottle.update(recordId, changes);
}

export async function applyCuratorRecommendation(item) {
  ensureValidChangeSet(item);

  switch (item.type) {
    case "pairing_recommendation":
    case "session_builder":
      return Promise.resolve({ ok: true });

    case "specialization":
    case "measurement_update":
    case "rotation_optimization":
      if (item.recordType !== "pipe") {
        throw new Error("Pipe recommendation is missing a valid pipe target.");
      }
      return updatePipe(item.recordId, item.proposedChanges);

    case "reclassification":
      if (item.recordType === "blend") {
        return updateBlend(item.recordId, item.proposedChanges);
      }
      if (item.recordType === "pipe") {
        return updatePipe(item.recordId, item.proposedChanges);
      }
      if (item.recordType === "bottle") {
        return updateBottle(item.recordId, item.proposedChanges);
      }
      throw new Error("Unsupported reclassification record type.");

    case "redundancy_flag":
      if (item.recordType !== "blend") {
        throw new Error("Blend recommendation is missing a valid blend target.");
      }
      return updateBlend(item.recordId, item.proposedChanges);

    case "metadata_update":
    case "bottle_data_update":
    case "valuation_update":
      if (item.recordType !== "bottle") {
        throw new Error("Bottle recommendation is missing a valid bottle target.");
      }
      return updateBottle(item.recordId, item.proposedChanges);

    default:
      if (item.recordType === "bottle") {
        return updateBottle(item.recordId, item.proposedChanges);
      }
      if (item.recordType === "pipe") {
        return updatePipe(item.recordId, item.proposedChanges);
      }
      if (item.recordType === "blend") {
        return updateBlend(item.recordId, item.proposedChanges);
      }

      throw new Error(`Unsupported recommendation type: ${item.type}`);
  }
}