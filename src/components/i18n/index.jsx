import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enCommon from "./locales/en/common.json";
import esCommon from "./locales/es/common.json";

// Add more languages by importing new JSON and adding below.
const resources = {
  en: { common: enCommon },
  es: { common: esCommon },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    defaultNS: "common",
    ns: ["common"],
    interpolation: {
      escapeValue: false, // React already escapes by default
    },
    detection: {
      // Detect from localStorage first, then browser
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "pk_lang",
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;