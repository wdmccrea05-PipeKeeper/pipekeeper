import { useTranslation } from "react-i18next";
import i18n, { humanizeKey } from "./index";

// Placeholder values that must NEVER be shown as final UI copy
const PLACEHOLDER_EXACT = new Set([
  "Title",
  "Subtitle",
  "Optional",
  "Description",
  "Desc",
  "Placeholder",
  "Label",
  "Page Title",
  "Page Subtitle",
]);

function looksLikePlaceholder(value) {
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (!v) return true;
  if (PLACEHOLDER_EXACT.has(v)) return true;
  // common placeholder patterns seen in the UI
  if (/^(.*\s)?(Title|Subtitle|Desc|Description|Placeholder)$/i.test(v)) return true;
  if (/^([A-Z][a-z]+)\s(Title|Subtitle)$/i.test(v)) return true;
  return false;
}

export function useTranslation() {
  const { t, i18n: hookI18n } = useTranslation();

  const safeT = (key, options = {}) => {
    const raw = t(key, options);

    // If missing key => humanize (never leak key)
    if (raw === key) return humanizeKey(key);

    // If locale contains placeholder => fallback to English
    if (looksLikePlaceholder(raw)) {
      const enValue = i18n.t(key, { ...options, lng: "en" });
      if (enValue && enValue !== key && !looksLikePlaceholder(enValue)) return enValue;
      return humanizeKey(key);
    }

    return raw;
  };

  // ensure callers can access current language too
  safeT.language = hookI18n?.language || i18n.language || "en";

  return { t: safeT, i18n: hookI18n };
}