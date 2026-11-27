/**
 * src/lib/sessionHistory/moduleFilter.js
 *
 * Resolves the session-history module filter from a ?module= link value.
 * Callers use both spellings (wine and winekeeper), so both are accepted. A
 * module the collector cannot access falls back to "all" instead of showing an
 * empty calendar.
 *
 * Pure functions only.
 */

export const SESSION_MODULE_PARAM_MAP = Object.freeze({
  pipe: 'pipe',
  pipekeeper: 'pipe',
  whiskey: 'whiskey',
  whiskeykeeper: 'whiskey',
  cigar: 'cigar',
  cigarkeeper: 'cigar',
  wine: 'wine',
  winekeeper: 'wine',
  pipe_club: 'pipe_club',
});

export function resolveSessionModuleFilter(param, available = []) {
  const value = param ? SESSION_MODULE_PARAM_MAP[String(param).toLowerCase()] : 'all';
  return value && available.includes(value) ? value : 'all';
}