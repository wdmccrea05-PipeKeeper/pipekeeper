import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Locale files
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import it from "./locales/it.json";
import ptBR from "./locales/pt-BR.json";
import nl from "./locales/nl.json";
import pl from "./locales/pl.json";
import ja from "./locales/ja.json";
import zhHans from "./locales/zh-Hans.json";
import sv from "./locales/sv.json.jsx";

const STORAGE_KEY = "pk_lang";

// Normalize language codes to canonical forms
export function normalizeLang(raw) {
  const v = (raw || "").toString().trim();
  if (!v) return "en";
  // Aliases to canonical codes
  if (v === "pt" || v === "pt_BR") return "pt-BR";
  if (v === "zh" || v.toLowerCase() === "zh-cn") return "zh-Hans";
  return v;
}

function humanizeKey(key) {
  const lastSegment = String(key).split(".").pop() || String(key);
  return lastSegment
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (s) => s.toUpperCase());
}

// Resources: primary codes + aliases for backward compatibility
const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  it: { translation: it },
  "pt-BR": { translation: ptBR },
  nl: { translation: nl },
  pl: { translation: pl },
  ja: { translation: ja },
  "zh-Hans": { translation: zhHans },
  sv: { translation: sv },
  // Aliases (old codes map to new canonical ones)
  pt: { translation: ptBR },
  zh: { translation: zhHans },
};

const SUPPORTED_LANGUAGES = Object.keys(resources);

const storedLang = normalizeLang(
  typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : "en"
);

const initialLng = storedLang || "en";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLng,
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGUAGES,

    returnNull: false,
    returnEmptyString: false,
    returnObjects: false,
    parseMissingKeyHandler: (key) => {
      // Track missing keys in dev mode
      if (import.meta.env.DEV) {
        if (!window.__i18nMissingKeys) window.__i18nMissingKeys = new Set();
        window.__i18nMissingKeys.add(key);
      }
      return humanizeKey(key);
    },

    interpolation: { escapeValue: false },

    react: { useSuspense: false },

    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: STORAGE_KEY,
    },
  });

i18n.on("languageChanged", (lng) => {
  if (typeof window !== "undefined") {
    const normalized = normalizeLang(lng);
    window.localStorage.setItem(STORAGE_KEY, normalized);
    // If i18n was set to an alias, switch to normalized canonical
    if (lng !== normalized) {
      i18n.changeLanguage(normalized);
    }
  }
});

// Dev-only: expose missing keys dump function
if (import.meta.env.DEV && typeof window !== "undefined") {
  window.__dumpMissingI18nKeys = () => {
    const missing = window.__i18nMissingKeys;
    if (!missing || missing.size === 0) {
      console.log("✅ No missing i18n keys detected");
      return [];
    }
    const keys = Array.from(missing).sort();
    console.warn(`⚠️ Found ${keys.length} missing i18n keys:`, keys);
    return keys;
  };
}

export default i18n;
export { SUPPORTED_LANGUAGES, humanizeKey };