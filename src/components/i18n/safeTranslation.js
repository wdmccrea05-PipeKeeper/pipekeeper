import { useTranslation as useI18n } from "react-i18next";

export function useTranslation() {
  const { t, i18n } = useI18n();

  function safeT(key, fallback, options = {}) {
    const value = t(key, { defaultValue: fallback, ...options });

    // Prevent [MISSING] bleed in production UI
    if (!value || String(value).includes("[MISSING]")) {
      return fallback;
    }

    return value;
  }

  return { t: safeT, i18n };
}
