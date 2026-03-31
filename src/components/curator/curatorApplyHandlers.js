import { base44 } from "@/api/base44Client";

function ensureValidChangeSet(item) {
  if (item.type === "pairing_recommendation" || item.type === "session_builder") {
    return;
  }

  const targetId = item?.recordId || item?.itemId;
  if (!targetId) {
    throw new Error("Recommendation is missing a target record.");
  }

  const proposed = item?.proposedChanges || item?.proposedChange?.payload;
  if (!proposed || typeof proposed !== "object") {
    throw new Error("Recommendation is missing proposed changes.");
  }

  if (Object.keys(proposed).length === 0) {
    throw new Error("Recommendation has no fields to apply.");
  }
}

function normalizePipeChanges(changes = {}) {
  const normalized = { ...changes };

  const aliases = [
    ["length", "length_mm"],
    ["weight", "weight_grams"],
    ["bowlHeight", "bowl_height_mm"],
    ["bowlWidth", "bowl_width_mm"],
    ["bowlDiameter", "bowl_diameter_mm"],
    ["bowlDepth", "bowl_depth_mm"],
    ["bowlStyle", "bowl_style"],
    ["shankShape", "shank_shape"],
    ["size_class", "sizeClass"],
    ["includedInAi", "included_in_ai"],
    ["usageCharacteristics", "usage_characteristics"],
    ["smokingCharacteristics", "smoking_characteristics"],
  ];

  for (const [from, to] of aliases) {
    if (
      normalized[from] !== undefined &&
      normalized[from] !== null &&
      normalized[from] !== "" &&
      (normalized[to] === undefined || normalized[to] === null || normalized[to] === "")
    ) {
      normalized[to] = normalized[from];
    }
  }

  delete normalized.length;
  delete normalized.weight;
  delete normalized.bowlHeight;
  delete normalized.bowlWidth;
  delete normalized.bowlDiameter;
  delete normalized.bowlDepth;
  delete normalized.bowlStyle;
  delete normalized.shankShape;
  delete normalized.size_class;
  delete normalized.includedInAi;
  delete normalized.usageCharacteristics;
  delete normalized.smokingCharacteristics;

  return normalized;
}

function normalizeBlendChanges(changes = {}) {
  return { ...changes };
}

function normalizeBottleChanges(changes = {}) {
  return { ...changes };
}

async function updatePipe(recordId, changes) {
  return base44.entities.Pipe.update(recordId, normalizePipeChanges(changes));
}

async function updateBlend(recordId, changes) {
  return base44.entities.TobaccoBlend.update(recordId, normalizeBlendChanges(changes));
}

async function updateBottle(recordId, changes) {
  return base44.entities.Bottle.update(recordId, normalizeBottleChanges(changes));
}

export async function applyCuratorRecommendation(item) {
  ensureValidChangeSet(item);

  const recordId = item?.recordId || item?.itemId;
  const proposedChanges = item?.proposedChanges || item?.proposedChange?.payload || {};

  switch (item.type) {
    case "pairing_recommendation":
    case "session_builder":
    case "similar_item":
      return Promise.resolve({ ok: true });

    case "specialization":
    case "measurement_update":
    case "rotation_optimization":
      if (item.recordType !== "pipe") {
        throw new Error("Pipe recommendation is missing a valid pipe target.");
      }
      return updatePipe(recordId, proposedChanges);

    case "reclassification":
      if (item.recordType === "blend") {
        return updateBlend(recordId, proposedChanges);
      }
      if (item.recordType === "pipe") {
        return updatePipe(recordId, proposedChanges);
      }
      if (item.recordType === "bottle") {
        return updateBottle(recordId, proposedChanges);
      }
      throw new Error("Unsupported reclassification record type.");

    case "redundancy_flag":
      if (item.recordType !== "blend") {
        throw new Error("Blend recommendation is missing a valid blend target.");
      }
      return updateBlend(recordId, proposedChanges);

    case "metadata_update":
    case "bottle_data_update":
    case "valuation_update":
      if (item.recordType !== "bottle") {
        throw new Error("Bottle recommendation is missing a valid bottle target.");
      }
      return updateBottle(recordId, proposedChanges);

    default:
      if (item.recordType === "bottle") {
        return updateBottle(recordId, proposedChanges);
      }
      if (item.recordType === "pipe") {
        return updatePipe(recordId, proposedChanges);
      }
      if (item.recordType === "blend") {
        return updateBlend(recordId, proposedChanges);
      }

      throw new Error(`Unsupported recommendation type: ${item.type}`);
  }
}

export default applyCuratorRecommendation;