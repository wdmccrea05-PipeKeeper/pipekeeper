import { useTranslation as useI18nextTranslation } from "react-i18next";
import { humanizeKey } from "./index.jsx";

/**
 * Safe translation hook:
 * - Always returns user-facing text
 * - Never returns raw keys
 * - Uses provided fallback if supplied, otherwise humanizes the key
 */
export function useTranslation() {
  const { t, i18n } = useI18nextTranslation();

  function safeT(key, fallback) {
    if (!key) return "";
    const value = t(key, { defaultValue: fallback ?? "" });

    // If i18n returns the key (missing), replace with fallback/humanized
    if (!value || value === key) {
      return (fallback && String(fallback).trim()) ? fallback : humanizeKey(key);
    }

    // Also guard against accidental key-shaped strings
    if (/^[a-z0-9]+(\.[a-z0-9]+)+$/i.test(value)) {
      return (fallback && String(fallback).trim()) ? fallback : humanizeKey(key);
    }

    return value;
  }

  return { t: safeT, i18n };
}