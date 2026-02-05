import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { translationsComplete } from "./translations-complete.jsx";

/**
 * Convert i18n keys to readable text:
 * tobacconist.noRecommendation -> "No Recommendation"
 * profile.manageSubscription -> "Manage Subscription"
 */
export function humanizeKey(key) {
  const last = String(key || "").split(".").pop() || "";
  if (!last) return "";
  return last
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (s) => s.toUpperCase());
}

// Build i18next resources from translationsComplete.
// translationsComplete is shaped as { en: {...}, es: {...}, ... }.
const resources = Object.entries(translationsComplete || {}).reduce(
  (acc, [lng, dict]) => {
    acc[lng] = { translation: dict || {} };
    return acc;
  },
  {}
);

// Ensure EN always exists.
if (!resources.en) resources.en = { translation: {} };

// Initialize only once
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: "en",
    fallbackLng: "en",

    // prevent leaking raw keys / nulls / objects
    returnNull: false,
    returnEmptyString: false,
    returnObjects: false,

    // CRITICAL: if a key is missing, return a readable fallback instead of "some.key"
    parseMissingKeyHandler: (key) => humanizeKey(key),

    interpolation: {
      escapeValue: false,
    },

    // Do not spam console with missing-key logs in production
    saveMissing: false,
  });
}

export default i18n;