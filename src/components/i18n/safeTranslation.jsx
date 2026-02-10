import { useTranslation as useTranslationI18n } from "react-i18next";
import { humanizeKey } from "./index";

/**
 * Values that should NEVER be shown to users.
 * These have been showing up due to "placeholder translations"
 * being written into translation files during Base44 iterations.
 */
const PLACEHOLDER_VALUES = new Set([
  "Title",
  "Subtitle",
  "Page Title",
  "Page Subtitle",
  "Optional",
]);

function looksLikeKey(value) {
  if (typeof value !== "string") return false;
  // e.g. tobacconist.noRecommendation, profile.manageSubscription, nav.home
  return /^[a-z0-9_]+(\.[a-z0-9_]+)+$/i.test(value.trim());
}

function isPlaceholder(value) {
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (!v) return true;
  if (PLACEHOLDER_VALUES.has(v)) return true;
  // Also treat generic placeholders like "Title (Optional)" etc as invalid user-facing copy
  if (/^title\b/i.test(v)) return true;
  if (/^subtitle\b/i.test(v)) return true;
  return false;
}

/**
 * Safe translation hook:
 * - If t(key) returns the key => use defaultValue (if provided) else humanizeKey(key)
 * - If t(key) returns placeholder text => same fallback behavior
 */
export function useTranslation() {
  const { t: rawT, i18n } = useTranslationI18n();

  const t = (key, options = {}) => {
    const value = rawT(key, {
      ...options,
      defaultValue: options?.defaultValue ?? key, // keep deterministic behavior
    });

    // Key leak (missing translation OR i18n not loaded somewhere)
    if (value === key || looksLikeKey(value) || isPlaceholder(value)) {
      const fallback =
        (typeof options?.defaultValue === "string" && options.defaultValue.trim())
          ? options.defaultValue.trim()
          : humanizeKey(key);

      if (import.meta?.env?.DEV) {
        // Helpful but not spammy
        console.warn("[i18n] fallback used:", { key, value, fallback });
      }
      return fallback;
    }

    return value;
  };

  return { t, i18n };
}