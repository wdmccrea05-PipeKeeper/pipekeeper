import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import { translationsGenerated } from "./translations-generated.jsx";
import { translationsComplete } from "./translations-complete.jsx";

// Humanize a key for fallback display
function humanizeKey(key) {
  const last = String(key || "").split(".").pop() || String(key || "");
  return last
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (s) => s.toUpperCase());
}

const i18nConfig = {
  debug: false,
  defaultNS: "translation",
  ns: ["translation"],
  resources: {
    en: { translation: translationsComplete?.en || translationsGenerated?.en || {} },
    es: { translation: translationsComplete?.es || translationsGenerated?.es || {} },
    fr: { translation: translationsComplete?.fr || translationsGenerated?.fr || {} },
    de: { translation: translationsComplete?.de || translationsGenerated?.de || {} },
    it: { translation: translationsComplete?.it || translationsGenerated?.it || {} },
    "pt-BR": { translation: translationsComplete?.["pt-BR"] || translationsGenerated?.["pt-BR"] || {} },
    nl: { translation: translationsComplete?.nl || translationsGenerated?.nl || {} },
    pl: { translation: translationsComplete?.pl || translationsGenerated?.pl || {} },
    ja: { translation: translationsComplete?.ja || translationsGenerated?.ja || {} },
    "zh-Hans": { translation: translationsComplete?.["zh-Hans"] || translationsGenerated?.["zh-Hans"] || {} },
  },
  lng: "en",
  fallbackLng: "en",
  supportedLngs: ["en", "es", "fr", "de", "it", "pt-BR", "nl", "pl", "ja", "zh-Hans"],
  interpolation: { escapeValue: false },
  returnNull: false,
  returnEmptyString: false,
  returnObjects: false,
  // CRITICAL: Never return raw keys
  parseMissingKeyHandler: (key) => humanizeKey(key),
  detection: {
    order: ["localStorage", "navigator"],
    caches: ["localStorage"],
    lookupLocalStorage: "pipekeeper_language",
  },
  react: {
    useSuspense: false,
  },
};

i18n.use(LanguageDetector).use(initReactI18next).init(i18nConfig);

export default i18n;