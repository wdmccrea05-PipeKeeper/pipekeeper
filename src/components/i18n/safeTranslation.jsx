import { useTranslation as useI18nextTranslation } from "react-i18next";
import { enforceTranslation } from "./enforceTranslation";
import { recordMissingKey } from "./missingKeyRegistry";

/**
 * Safe translation wrapper that:
 * 1) Forwards i18next options (interpolation, returnObjects, etc.)
 * 2) Calls enforcement with the correct argument order
 * 3) Provides stable fallback behavior
 */
export function useTranslation(componentInfo = "unknown") {
  const { t: rawT, i18n, ...rest } = useI18nextTranslation();

  const safeT = (key, optionsOrFallback, maybeFallback) => {
    if (!key || typeof key !== "string") return "";

    let options = {};
    let fallback = key;

    // safeT("x.y.z")
    // safeT("x.y.z", "Fallback")
    // safeT("x.y.z", { returnObjects: true, count: 2 })
    // safeT("x.y.z", { ...options }, "Fallback")
    if (optionsOrFallback && typeof optionsOrFallback === "object") {
      options = optionsOrFallback;
      if (typeof maybeFallback === "string") fallback = maybeFallback;
    } else if (typeof optionsOrFallback === "string") {
      fallback = optionsOrFallback;
    }

    let translated;
    try {
      translated = rawT(key, { ...options, defaultValue: fallback });
    } catch (e) {
      translated = fallback;
    }

    // Enforcement MUST be called as: (key, resolvedValue, language, componentInfo)
    const enforced = enforceTranslation(key, translated, i18n?.language, componentInfo);

    // Track missing keys for runtime debugging
    const looksMissing =
      translated === key ||
      translated === "" ||
      (typeof translated === "string" && translated.includes("{{"));

    if (looksMissing && i18n?.language) {
      recordMissingKey(i18n.language, key, componentInfo);
    }

    // If returnObjects:true, enforced might be an object/array. Return as-is.
    if (options?.returnObjects) return enforced;

    // Ensure we only return strings for normal usage.
    if (typeof enforced === "string") return enforced;
    if (enforced == null) return fallback;

    // If someone forgot returnObjects:true but the resource is an object, prevent crashes.
    try {
      return String(enforced);
    } catch {
      return fallback;
    }
  };

  return { t: safeT, i18n, ...rest };
}

/**
 * Validates that a value is safe to use as a translation key
 */
export function isSafeTranslationKey(value) {
  if (typeof value !== "string") return false;
  if (value.includes(".")) return value.length < 100;
  return false;
}

/**
 * Safely translates a value that might be a key or might already be translated
 */
export function translateIfKey(t, value, prefix = "") {
  if (!value) return "";

  if (prefix && value.startsWith(prefix)) {
    return t(value);
  }

  if (isSafeTranslationKey(value)) {
    const translated = t(value);
    return translated === value ? value : translated;
  }

  return value;
}