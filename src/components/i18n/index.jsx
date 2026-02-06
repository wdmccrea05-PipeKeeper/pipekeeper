import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "@/components/i18n/locales/en.js";
import es from "@/components/i18n/locales/es.js";
import fr from "@/components/i18n/locales/fr.js";
import de from "@/components/i18n/locales/de.js";
import it from "@/components/i18n/locales/it.js";
import ptBR from "@/components/i18n/locales/pt-BR.js";
import nl from "@/components/i18n/locales/nl.js";
import pl from "@/components/i18n/locales/pl.js";
import ja from "@/components/i18n/locales/ja.js";
import zhHans from "@/components/i18n/locales/zh-Hans.js";

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

const SUPPORTED = Object.keys(resources);

function normalizeLang(code) {
  if (!code) return "en";
  // Normalize common variants
  if (code === "pt" || code === "pt_BR") return "pt-BR";
  if (code === "zh" || code === "zh_CN") return "zh-Hans";
  return code;
}

function humanizeKey(key) {
  const last = String(key).split(".").pop() || String(key);
  return last
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (s) => s.toUpperCase());
}

const storedRaw =
  typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;

const initial = normalizeLang(storedRaw);
const initialLng = SUPPORTED.includes(initial) ? initial : "en";

i18n.use(initReactI18next).init({
  resources,
  lng: initialLng,
  fallbackLng: "en",
  supportedLngs: SUPPORTED,

  // Never leak keys
  returnNull: false,
  returnEmptyString: false,
  returnObjects: false,
  parseMissingKeyHandler: (key) => humanizeKey(key),

  interpolation: { escapeValue: false },
});

export default i18n;
export { SUPPORTED as SUPPORTED_LANGUAGES };