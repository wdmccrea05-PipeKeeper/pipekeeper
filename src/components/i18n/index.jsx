import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Use the comprehensive locale files that were created earlier
import en from "./locales/en";
import es from "./locales/es";
import fr from "./locales/fr";
import de from "./locales/de";
import it from "./locales/it";
import pt from "./locales/pt";
import nl from "./locales/nl";
import pl from "./locales/pl";
import ja from "./locales/ja";
import zh from "./locales/zh";
import sv from "./locales/sv";

const STORAGE_KEY = "pk_lang";

const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  it: { translation: it },
  pt: { translation: pt },
  nl: { translation: nl },
  pl: { translation: pl },
  ja: { translation: ja },
  zh: { translation: zh },
  sv: { translation: sv },
};

const SUPPORTED_LANGUAGES = Object.keys(resources);

function normalizeLang(code) {
  if (!code) return "en";
  if (code === "pt-BR" || code === "pt_BR") return "pt";
  if (code === "zh-Hans" || code === "zh_CN" || code === "zh-Hans-CN") return "zh";
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