import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "@/components/i18n/locales/en.json";
import es from "@/components/i18n/locales/es.json";
import fr from "@/components/i18n/locales/fr.json";
import de from "@/components/i18n/locales/de.json";
import it from "@/components/i18n/locales/it.json";
import pt from "@/components/i18n/locales/pt.json";
import nl from "@/components/i18n/locales/nl.json";
import sv from "@/components/i18n/locales/sv.json";
import ja from "@/components/i18n/locales/ja.json";
import zh from "@/components/i18n/locales/zh.json";

const STORAGE_KEY = "pk_lang";

const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  it: { translation: it },
  pt: { translation: pt },
  nl: { translation: nl },
  sv: { translation: sv },
  ja: { translation: ja },
  zh: { translation: zh },
};

const SUPPORTED_LANGUAGES = Object.keys(resources);

/**
 * Humanize a translation key into readable text
 * Example: "tobacconist.noRecommendation" -> "No Recommendation"
 */
function humanizeKey(key: string): string {
  const lastSegment = String(key).split(".").pop() || String(key);
  return lastSegment
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2") // camelCase -> space
    .replace(/[_-]+/g, " ") // underscores/hyphens -> space
    .replace(/\s+/g, " ") // collapse multiple spaces
    .trim()
    .replace(/^./, (s) => s.toUpperCase()); // capitalize first letter
}

// Read stored language preference
const storedLang =
  typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;

// Normalize language codes
function normalizeLang(code: string | null): string {
  if (!code) return "en";
  // Handle common variants
  if (code === "pt-BR" || code === "pt_BR") return "pt";
  if (code === "zh-Hans" || code === "zh_CN" || code === "zh-Hans-CN") return "zh";
  return code;
}

const initialLng = storedLang
  ? normalizeLang(storedLang)
  : SUPPORTED_LANGUAGES.includes(navigator.language.split("-")[0])
  ? navigator.language.split("-")[0]
  : "en";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLng,
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGUAGES,

    // Never leak keys to UI
    returnNull: false,
    returnEmptyString: false,
    returnObjects: false,
    parseMissingKeyHandler: (key) => humanizeKey(key),

    interpolation: {
      escapeValue: false, // React already escapes
    },

    react: {
      useSuspense: false, // Avoid loading flicker
    },

    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: STORAGE_KEY,
    },
  });

// Persist language changes to localStorage
i18n.on("languageChanged", (lng) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, lng);
  }
});

export default i18n;
export { SUPPORTED_LANGUAGES, humanizeKey };