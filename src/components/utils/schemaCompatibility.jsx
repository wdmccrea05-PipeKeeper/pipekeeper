/**
 * Schema compatibility helpers for legacy field migrations
 * Ensures backward compatibility when reading bowls_used, usage_characteristics, etc.
 */
const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})/;

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
 * Ensures both new and legacy fields are set
 */
export function prepareLogData(data) {
  const bowls = Number(data.bowls_used || data.bowls_smoked) || 1;
  return {
    ...data,
    bowls_used: bowls,
    bowls_smoked: bowls, // Keep legacy field in sync
  };
}

/**
 * Prepare Pipe data for create/update
 * Ensures both new and legacy fields are set
 */
export function preparePipeData(data) {
  const characteristics = data.usage_characteristics || data.smoking_characteristics || "";
  const result = {
    ...data,
  };
  
  if (characteristics) {
    result.usage_characteristics = characteristics;
    result.smoking_characteristics = ""; // Clear legacy field when updating
  }
  
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
