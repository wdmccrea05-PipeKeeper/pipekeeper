import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import { translations } from "./translations";
import { translationsExtended } from "./translations-extended";
import { translationsComplete } from "./translations-complete";
import { helpContentFull } from "./helpContent-full";
import { homeTranslations } from "./homeContent";

// Normalize: some files export { common: {...} }, others export flat {...}
const normalizeLocale = (localeObj) => {
  if (!localeObj) return {};
  return localeObj.common ? localeObj.common : localeObj;
};

// Deep merge helper
function deepMerge(...objects) {
  const result = {};
  for (const obj of objects) {
    for (const key in obj) {
      if (obj[key] && typeof obj[key] === "object" && !Array.isArray(obj[key])) {
        result[key] = deepMerge(result[key] || {}, obj[key]);
      } else {
        result[key] = obj[key];
      }
    }
  }
  return result;
}

const supportedLngs = [
  "en",
  "es",
  "fr",
  "de",
  "it",
  "pt-BR",
  "nl",
  "pl",
  "ja",
  "zh-Hans",
];

const buildResources = () => {
  const resources = {};

  for (const lang of supportedLngs) {
    resources[lang] = {
      translation: deepMerge(
        normalizeLocale(translations?.[lang]),
        normalizeLocale(translationsExtended?.[lang]),
        translationsComplete?.[lang] || {},
        helpContentFull?.[lang] || {},
        homeTranslations?.[lang] || {}
      ),
    };
  }

  return resources;
};

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: buildResources(),
      lng: "en",
      fallbackLng: "en",
      supportedLngs,
      nonExplicitSupportedLngs: false,
      returnNull: false,
      returnEmptyString: false,
      interpolation: {
        escapeValue: false,
      },
      detection: {
        order: ["localStorage", "navigator"],
        caches: ["localStorage"],
        lookupLocalStorage: "pipekeeper_language",
      },
      react: {
        useSuspense: false,
      },
    });
}

export default i18n;