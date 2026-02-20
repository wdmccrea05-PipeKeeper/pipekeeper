import { useTranslation as useTranslationI18n } from "react-i18next";
import i18n, { humanizeKey } from "./index";

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

// ---------------------------------------------------------------------------
// tAuto(): translate hard-coded English strings by reverse-looking up the key
// in the EN resource bundle.
//
// If the exact English string exists as a VALUE in the EN bundle, we can find
// its KEY and return the translation for the active language.
// Otherwise we return the original string unchanged.
// ---------------------------------------------------------------------------

let __EN_VALUE_TO_KEY = null;

function buildEnReverseIndex() {
  try {
    const en = i18n?.getResourceBundle?.("en", "translation") || {};
    const map = new Map();

    const walk = (obj, prefix = "") => {
      if (!obj || typeof obj !== "object") return;
      for (const [k, v] of Object.entries(obj)) {
        const nextKey = prefix ? `${prefix}.${k}` : k;
        if (typeof v === "string") {
          const s = v.trim();
          if (!s) continue;
          if (!map.has(s)) map.set(s, nextKey);
        } else if (v && typeof v === "object") {
          walk(v, nextKey);
        }
      }
    };

    walk(en);
    return map;
  } catch {
    return new Map();
  }
}

/**
 * Translate a hard-coded English UI string.
 *
 * Usage:
 *   <p>{tAuto("Upload a photo to identify pipes and tobacco")}</p>
 */
export function tAuto(englishText, options = {}) {
  const raw = typeof englishText === "string" ? englishText : "";
  const text = raw.trim();
  if (!text) return raw;

  // If someone mistakenly passes a translation key, translate it.
  if (looksLikeKey(text)) return i18n.t(text, options);

  if (!__EN_VALUE_TO_KEY) __EN_VALUE_TO_KEY = buildEnReverseIndex();
  const key = __EN_VALUE_TO_KEY.get(text);
  if (!key) return raw;

  return i18n.t(key, { ...options, defaultValue: raw });
}