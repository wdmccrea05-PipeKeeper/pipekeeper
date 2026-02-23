/**
 * Central missing-key handler.
 * Must export `missingKeyHandler` as a named export because safeTranslation imports it.
 *
 * Returns a visible placeholder string so missing keys are easy to spot.
 */
export function missingKeyHandler(key, locale, where) {
  // Visible placeholder (what you see as [MISSING] ...)
  if (import.meta?.env?.DEV) {
    console.warn(`[i18n] Missing key: ${key} (locale: ${locale}, where: ${where})`);
  }
  return `[MISSING] ${key}`;
}

/**
 * Backwards/compat exports in case other files import these names.
 */
export function logMissingKey(key, locale, where) {
  return missingKeyHandler(key, locale, where);
}

export default missingKeyHandler;