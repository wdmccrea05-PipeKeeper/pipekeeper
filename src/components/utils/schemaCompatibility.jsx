/**
 * Schema compatibility helpers for legacy field migrations
 * Ensures backward compatibility when reading bowls_used, usage_characteristics, etc.
 */
const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})/;
export const PIPE_EDITABLE_FIELDS = [
  "name",
  "maker",
  "country_of_origin",
  "shape",
  "bowlStyle",
  "shankShape",
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
  "photos",
  "stamping_photos",
  "is_favorite",
  "ai_excluded",
  "interchangeable_bowls",
];

const PIPE_TEXT_FIELDS = new Set([
  "name",
  "maker",
  "country_of_origin",
  "shape",
  "bowlStyle",
  "shankShape",
  "bend",
  "sizeClass",
  "chamber_volume",
  "stem_material",
  "bowl_material",
  "finish",
  "filter_type",
  "year_made",
  "purchase_date",
  "stamping",
  "condition",
  "notes",
  "usage_characteristics",
  "smoking_characteristics",
]);

const PIPE_NUMBER_FIELDS = new Set([
  "length_mm",
  "weight_grams",
  "bowl_height_mm",
  "bowl_width_mm",
  "bowl_diameter_mm",
  "bowl_depth_mm",
  "purchase_price",
  "estimated_value",
]);

function normalizePipePhotoArray(input) {
  if (Array.isArray(input)) {
    return input
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean);
  }
  if (typeof input === "string" && input.trim()) return [input.trim()];
  return [];
}

function getLegacyPipePhotoCandidates(pipe = {}) {
  return [pipe?.photo, pipe?.photo_url, pipe?.image, pipe?.image_url].filter(Boolean);
}

function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return Boolean(value);
}

function normalizePipeField(field, value) {
  if (value === undefined) return undefined;
  if (field === "photos" || field === "stamping_photos") return normalizePipePhotoArray(value);
  if (field === "interchangeable_bowls") return Array.isArray(value) ? value : [];
  if (field === "is_favorite" || field === "ai_excluded") return normalizeBoolean(value, false);
  if (PIPE_TEXT_FIELDS.has(field)) return value == null ? "" : String(value);
  if (PIPE_NUMBER_FIELDS.has(field)) {
    if (value === null || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return value;
}

export function normalizePipeFormData(pipe = null) {
  const defaults = {
    name: "",
    maker: "",
    country_of_origin: "",
    shape: "",
    bowlStyle: "",
    shankShape: "",
    bend: "",
    sizeClass: "",
    length_mm: "",
    weight_grams: "",
    bowl_height_mm: "",
    bowl_width_mm: "",
    bowl_diameter_mm: "",
    bowl_depth_mm: "",
    chamber_volume: "",
    stem_material: "",
    bowl_material: "",
    finish: "",
    filter_type: "",
    year_made: "",
    purchase_date: "",
    stamping: "",
    condition: "",
    purchase_price: "",
    estimated_value: "",
    notes: "",
    usage_characteristics: "",
    smoking_characteristics: "",
    photos: [],
    stamping_photos: [],
    is_favorite: false,
    ai_excluded: false,
    interchangeable_bowls: [],
  };

  if (!pipe) return defaults;

  const next = { ...defaults };
  for (const field of PIPE_EDITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(pipe, field)) {
      next[field] = normalizePipeField(field, pipe[field]);
    }
  }

  const fallbackPhotos = getLegacyPipePhotoCandidates(pipe);
  next.photos = normalizePipePhotoArray(pipe?.photos ?? fallbackPhotos);
  next.stamping_photos = normalizePipePhotoArray(pipe?.stamping_photos);

  if (!next.usage_characteristics && pipe?.smoking_characteristics) {
    next.usage_characteristics = String(pipe.smoking_characteristics);
  }
  next.smoking_characteristics = "";
  return next;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function dateToLocalYmd(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/**
 * Normalize any date-like input to local YYYY-MM-DD.
 * Important: avoids UTC shifts from toISOString() for user-facing calendar dates.
 */
export function toLocalDateYmd(dateLike = new Date()) {
  if (typeof dateLike === "string") {
    const match = dateLike.match(DATE_ONLY_RE);
    if (match) return match[0];
  }

  const parsed = dateLike instanceof Date ? dateLike : new Date(dateLike);
  return dateToLocalYmd(parsed) || dateToLocalYmd(new Date());
}

/**
 * Parse a stored date into a local Date object pinned to noon.
 * Noon avoids DST/midnight boundary edge cases for display/sorting.
 */
export function parseLocalCalendarDate(dateLike) {
  const ymd = toLocalDateYmd(dateLike);
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

/**
 * Get bowls used from a SmokingLog entry
 * Prefers new field, falls back to legacy
 */
export function getBowlsUsed(log) {
  if (!log) return 0;
  return Number(log.bowls_used || log.bowls_smoked) || 0;
}

/**
 * Get usage characteristics from a Pipe entry
 * Prefers new field, falls back to legacy
 */
export function getUsageCharacteristics(pipe) {
  if (!pipe) return "";
  return pipe.usage_characteristics || pipe.smoking_characteristics || "";
}

/**
 * Prepare SmokingLog data for create/update
 * Ensures both new and legacy fields are set.
 * Optional string ID fields are omitted entirely when empty/null to avoid
 * validation errors on create (passing null fails required-string checks).
 */
export function prepareLogData(data) {
  const bowls = Number(data.bowls_used || data.bowls_smoked) || 1;

  const result = {
    ...data,
    bowls_used: bowls,
    bowls_smoked: bowls, // Keep legacy field in sync
  };

  // Omit optional ID fields entirely instead of setting null so the backend
  // schema validator does not reject a missing-but-optional string field.
  const OPTIONAL_ID_FIELDS = ["pipe_id", "blend_id", "container_id", "bowl_variant_id"];
  for (const field of OPTIONAL_ID_FIELDS) {
    const val = result[field];
    if (val === undefined || val === null || val === "" || val === "__none__") {
      delete result[field];
    }
  }

  return result;
}

/**
 * Prepare Pipe data for create/update
 * Ensures both new and legacy fields are set
 * CRITICAL: Preserves photos and stamping_photos arrays
 */
export function preparePipeData(data) {
  const source = data || {};
  const characteristics = source.usage_characteristics || source.smoking_characteristics || "";
  const result = {};

  // Keep nulls/undefined out of the generic loop, then explicitly enforce always-on
  // collection fields below (photos/stamping_photos/interchangeable_bowls/booleans).
  for (const field of PIPE_EDITABLE_FIELDS) {
    const normalized = normalizePipeField(field, source[field]);
    if (normalized !== undefined && normalized !== null) {
      result[field] = normalized;
    }
  }

  if (characteristics) {
    result.usage_characteristics = String(characteristics);
    result.smoking_characteristics = "";
  }

  // Ensure photos arrays are included even if empty (prevents data loss on edit)
  result.photos = normalizePipePhotoArray(source.photos);
  result.stamping_photos = normalizePipePhotoArray(source.stamping_photos);
  result.interchangeable_bowls = Array.isArray(source.interchangeable_bowls) ? source.interchangeable_bowls : [];
  result.is_favorite = normalizeBoolean(source.is_favorite, false);
  result.ai_excluded = normalizeBoolean(source.ai_excluded, false);

  return result;
}

/**
 * Get total bowls from array of logs (schema-safe)
 */
export function getTotalBowlsFromLogs(logs) {
  return (logs || []).reduce((sum, log) => sum + getBowlsUsed(log), 0);
}

/**
 * Get break-in bowls from logs (schema-safe)
 */
export function getBreakInBowlsFromLogs(logs) {
  return (logs || [])
    .filter(l => l?.is_break_in)
    .reduce((sum, log) => sum + getBowlsUsed(log), 0);
}
