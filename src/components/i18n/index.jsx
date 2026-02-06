import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Use the comprehensive locale files that were created earlier
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import it from "./locales/it.json";
import ptBR from "./locales/pt-BR";
import nl from "./locales/nl.json";
import pl from "./locales/pl.json";
import ja from "./locales/ja.json";
import zhHans from "./locales/zh-Hans";

const STORAGE_KEY = "pk_lang";

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
};

const SUPPORTED_LANGUAGES = Object.keys(resources);

function normalizeLang(code) {
  if (!code) return "en";
  if (code === "pt-BR" || code === "pt_BR" || code === "pt") return "pt-BR";
  if (code === "zh-Hans" || code === "zh_CN" || code === "zh-Hans-CN" || code === "zh") return "zh-Hans";
  return code;
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

const storedLang =
  typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;

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

    returnNull: false,
    returnEmptyString: false,
    returnObjects: false,
    parseMissingKeyHandler: (key) => humanizeKey(key),

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
    window.localStorage.setItem(STORAGE_KEY, lng);
  }
});

export default i18n;
export { SUPPORTED_LANGUAGES, humanizeKey };