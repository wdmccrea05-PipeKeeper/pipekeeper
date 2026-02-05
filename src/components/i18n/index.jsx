import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { translationsComplete } from "./translations-complete.jsx";
import { translationsGenerated } from "./translations-generated.jsx";

// Turn "tobacconist.tobaccoBlendClassificationDesc" into "Tobacco Blend Classification Desc"
function humanizeKey(key) {
  const last = String(key || "").split(".").pop() || String(key || "");
  return last
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (s) => s.toUpperCase());
}

// Build i18n resources from the existing locale objects (whatever exists is used)
function buildResources() {
  const locales = new Set([
    ...Object.keys(translationsComplete || {}),
    ...Object.keys(translationsGenerated || {}),
  ]);

  const resources = {};
  for (const lng of locales) {
    const complete = translationsComplete?.[lng] || {};
    const generated = translationsGenerated?.[lng] || {};
    resources[lng] = { translation: { ...complete, ...generated } };
  }

  // Always ensure English exists as fallback
  if (!resources.en) resources.en = { translation: {} };

  return resources;
}

const resources = buildResources();

// IMPORTANT:
// - missingKeyHandler does NOT change what t() returns.
// - parseMissingKeyHandler DOES. That's what prevents key leaks.
i18n
  .use(initReactI18next)
  .init({
    resources,

    // Default language; user can change later, but fallback must be English
    lng: "en",
    fallbackLng: "en",

    // Prevent null/empty object surprises
    returnNull: false,
    returnEmptyString: false,
    returnObjects: false,

    interpolation: { escapeValue: false },

    // CRITICAL: never show raw keys
    parseMissingKeyHandler: (key) => humanizeKey(key),
  });

export default i18n;
export { humanizeKey };