import { Pipe } from "@/entities/Pipe";
import { Blend } from "@/entities/Blend";

export async function applyCuratorRecommendation(item) {
  switch (item.type) {
    case "specialization":
    case "measurement_update":
    case "rotation_optimization":
      if (item.recordType !== "pipe") {
        throw new Error("Pipe recommendation is missing a valid pipe target.");
      }
      return Pipe.update(item.recordId, item.proposedChanges);

    case "reclassification":
      if (item.recordType === "blend") {
        return Blend.update(item.recordId, item.proposedChanges);
      }
      if (item.recordType === "pipe") {
        return Pipe.update(item.recordId, item.proposedChanges);
      }
      throw new Error("Unsupported reclassification record type.");

    case "redundancy_flag":
      if (item.recordType !== "blend") {
        throw new Error("Blend recommendation is missing a valid blend target.");
      }
      return Blend.update(item.recordId, item.proposedChanges);

    default:
      throw new Error(`Unsupported recommendation type: ${item.type}`);
  }
}
