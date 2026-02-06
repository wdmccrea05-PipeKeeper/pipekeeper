import i18n from "i18next";
import { initReactI18next } from "react-i18next";

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

export function humanizeKey(key) {
  const last = String(key).split(".").pop() || String(key);
  return last
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (s) => s.toUpperCase());
}

const initialLng =
  (typeof window !== "undefined" && window.localStorage?.getItem(STORAGE_KEY)) || "en";

// IMPORTANT: guard so init runs exactly once
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: initialLng,
    fallbackLng: "en",

    returnNull: false,
    returnEmptyString: false,
    returnObjects: false,

    // Missing key => readable text (never raw key)
    parseMissingKeyHandler: (key) => humanizeKey(key),

    interpolation: { escapeValue: false },
  });
}

// keep language persisted
i18n.on("languageChanged", (lng) => {
  try {
    window.localStorage?.setItem(STORAGE_KEY, lng);
  } catch {}
});

export default i18n;