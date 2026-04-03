import { base44 } from "@/api/base44Client";

function ensureValidChangeSet(item) {
  if (
    item.type === "pairing_recommendation" ||
    item.type === "session_builder" ||
    item.type === "similar_item"
  ) {
    return;
  }

  if (item?.proposedChange?.type === "advice_only") {
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
    ["lengthMm", "length_mm"],
    ["weight", "weight_grams"],
    ["weightGrams", "weight_grams"],
    ["bowlHeight", "bowl_height_mm"],
    ["bowlHeightMm", "bowl_height_mm"],
    ["bowlWidth", "bowl_width_mm"],
    ["bowlWidthMm", "bowl_width_mm"],
    ["bowlDiameter", "bowl_diameter_mm"],
    ["bowlDiameterMm", "bowl_diameter_mm"],
    ["bowlDepth", "bowl_depth_mm"],
    ["bowlDepthMm", "bowl_depth_mm"],
    ["bowlStyle", "bowl_style"],
    ["shankShape", "shank_shape"],
    ["size_class", "sizeClass"],
    ["includedInAi", "included_in_ai"],
    ["usageCharacteristics", "usage_characteristics"],
    ["smokingCharacteristics", "smoking_characteristics"],
    ["purchasePrice", "purchase_price"],
    ["estimatedValue", "estimated_value"],
    ["bowlMaterial", "bowl_material"],
    ["stemMaterial", "stem_material"],
    ["filterType", "filter_type"],
    ["countryOfOrigin", "country_of_origin"],
    ["chamberVolume", "chamber_volume"],
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

  const allowedPipeFields = new Set([
    "name",
    "maker",
    "country_of_origin",
    "shape",
    "bowl_style",
    "shank_shape",
    "bend",
    "sizeClass",
    "length_mm",
    "weight_grams",
    "bowl_height_mm",
    "bowl_width_mm",
    "bowl_diameter_mm",
    "bowl_depth_mm",
    "chamber_volume",
    "stem_material",
    "bowl_material",
    "finish",
    "filter_type",
    "year_made",
    "purchase_date",
    "stamping",
    "condition",
    "purchase_price",
    "estimated_value",
    "notes",
    "usage_characteristics",
    "smoking_characteristics",
    "is_favorite",
    "included_in_ai",
    "collectible_only",
    "specialization",
  ]);

  const cleaned = {};
  for (const [key, value] of Object.entries(normalized)) {
    if (allowedPipeFields.has(key)) {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

function normalizeBlendChanges(changes = {}) {
  return { ...changes };
}

function normalizeBottleChanges(changes = {}) {
  return { ...changes };
}

async function updatePipe(recordId, changes, item = null) {
  const normalized = normalizePipeChanges(changes);

  if (Object.keys(normalized).length === 0) {
    if (
      item?.type === "measurement_update" ||
      item?.proposedChange?.type === "advice_only"
    ) {
      return { ok: true, skipped: true };
    }
    throw new Error("Recommendation has no applicable pipe fields to update.");
  }

  return base44.entities.Pipe.update(recordId, normalized);
}

async function updateBlend(recordId, changes) {
  return base44.entities.TobaccoBlend.update(recordId, normalizeBlendChanges(changes));
}

async function updateBottle(recordId, changes) {
  return base44.entities.Bottle.update(recordId, normalizeBottleChanges(changes));
}

export async function applyCuratorRecommendation(item) {
  ensureValidChangeSet(item);

  if (
    item.type === "pairing_recommendation" ||
    item.type === "session_builder" ||
    item.type === "similar_item"
  ) {
    return Promise.resolve({ ok: true });
  }

  if (item?.proposedChange?.type === "advice_only") {
    return Promise.resolve({ ok: true, skipped: true });
  }

  const recordId = item?.recordId || item?.itemId;
  const proposedChanges = item?.proposedChanges || item?.proposedChange?.payload || {};

  switch (item.type) {
    case "specialization":
    case "measurement_update":
    case "rotation_optimization":
      if (item.recordType !== "pipe") {
        throw new Error("Pipe recommendation is missing a valid pipe target.");
      }
      return updatePipe(recordId, proposedChanges, item);

    case "reclassification":
      if (item.recordType === "blend") {
        return updateBlend(recordId, proposedChanges);
      }
      if (item.recordType === "pipe") {
        return updatePipe(recordId, proposedChanges, item);
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
        return updatePipe(recordId, proposedChanges, item);
      }
      if (item.recordType === "blend") {
        return updateBlend(recordId, proposedChanges);
      }

      throw new Error(`Unsupported recommendation type: ${item.type}`);
  }
}

export default applyCuratorRecommendation;

/**
 * Higher-level handler that calls an onApply callback and returns a status result.
 */
export async function applyAcceptedCuratorAction({ item, onApply }) {
  try {
    await onApply(item);
    return { status: "accepted" };
  } catch (err) {
    return { status: "error", error: err?.message || String(err) };
  }
}

/**
 * Higher-level handler that calls an onReject callback and returns a status result.
 */
export async function applyRejectedCuratorAction({ item, onReject }) {
  try {
    await onReject(item);
    return { status: "rejected" };
  } catch (err) {
    return { status: "error", error: err?.message || String(err) };
  }
}