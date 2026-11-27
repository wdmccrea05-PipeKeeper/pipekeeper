/**
 * src/lib/reports/reportModuleScope.js
 *
 * Turns a ?module= link value into the report filter scope. Module navigation
 * links arrive as ?module=pipekeeper|whiskeykeeper|cigarkeeper|winekeeper; the
 * Reporting Center is the single reporting surface, so every module link must
 * open it scoped to that module rather than to every enabled collection.
 *
 * Pure functions only.
 */

export const REPORT_MODULE_PARAM_MAP = Object.freeze({
  pipekeeper: 'pipe',
  whiskeykeeper: 'whiskey',
  cigarkeeper: 'cigar',
  winekeeper: 'wine',
});

/** The module key a link value points at, or null when it names no module. */
export function moduleKeyFromParam(param) {
  if (!param) return null;
  return REPORT_MODULE_PARAM_MAP[String(param).toLowerCase()] || null;
}

/**
 * Filters for a report link. With no module in the link the base filters are
 * returned untouched, so a plain visit still reports across every collection.
 */
export function filtersForModuleParam(param, base) {
  const moduleKey = moduleKeyFromParam(param);
  if (!moduleKey) return base;
  return {
    ...base,
    modules: {
      pipe: moduleKey === 'pipe',
      whiskey: moduleKey === 'whiskey',
      cigar: moduleKey === 'cigar',
      wine: moduleKey === 'wine',
    },
  };
}