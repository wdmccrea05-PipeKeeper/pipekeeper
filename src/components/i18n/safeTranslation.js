// src/components/i18n/safeTranslation.js
import { useTranslation as useTranslationBase } from "react-i18next";

// Small wrapper so we never crash the UI on missing keys.
// If i18n isn't ready, we still return something predictable.
export function useTranslation(ns) {
  try {
    const result = useTranslationBase(ns);
    const t = result?.t;

    return {
      ...result,
      t:
        typeof t === "function"
          ? t
          : (key) => (key ? `[MISSING] ${key}` : "[MISSING]"),
    };
  } catch {
    return {
      t: (key) => (key ? `[MISSING] ${key}` : "[MISSING]"),
      i18n: { language: "en", changeLanguage: async () => {} },
      ready: false,
    };
  }
}

// Convenience re-export (some files may import from here)
export const Trans = undefined;
