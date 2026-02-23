// src/components/i18n/missingKeyHandler.jsx
import { recordMissingKey } from "./missingKeyRegistry.jsx";

/**
 * Central missing-key handler.
 * Must export `missingKeyHandler` as a named export because safeTranslation imports it.
 *
 * Returns a visible placeholder string so missing keys are easy to spot.
 */
export function missingKeyHandler(key, locale, where) {
  try {
    // Store for reporting/debug UI
    recordMissingKey(locale || "en", key, where);
  } catch {
    // ignore
  }

  // Visible placeholder (what you see as [MISSING] ...)
  return `[MISSING] ${key}`;
}

/**
 * Backwards/compat exports in case other files import these names.
 */
export function logMissingKey(key, locale, where) {
  return missingKeyHandler(key, locale, where);
}

export default missingKeyHandler;
