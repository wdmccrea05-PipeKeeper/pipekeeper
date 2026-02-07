import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en";
import es from "./locales/es";
import fr from "./locales/fr";
import de from "./locales/de";
import it from "./locales/it";
import ptBR from "./locales/ptBR";
import nl from "./locales/nl";
import pl from "./locales/pl";
import ja from "./locales/ja";
import zhHans from "./locales/zhHans";
import sv from "./locales/sv";

function normalizeLang(raw) {
  const v = (raw || "").toString().trim();
  if (!v) return "en";
  if (v === "pt") return "pt-BR";
  if (v === "zh") return "zh-Hans";
  if (v.toLowerCase() === "zh-cn") return "zh-Hans";
  if (v.toLowerCase() === "pt-br") return "pt-BR";
  return v;
}

function humanizeKey(key) {
  const last = (key || "").split(".").pop() || "";
  const withSpaces = last.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

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

  // aliases
  pt: { translation: ptBR },
  zh: { translation: zhHans },
};

const stored = normalizeLang(
  typeof window !== "undefined" 
    ? (window.localStorage.getItem("pk_lang") || window.localStorage.getItem("pipekeeper_language"))
    : "en"
);

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: stored,
    fallbackLng: "en",
    returnNull: false,
    returnEmptyString: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },

    // CRITICAL: prevents raw keys ever showing in UI
    parseMissingKeyHandler: (key) => humanizeKey(key),
  });

i18n.on("languageChanged", (lng) => {
  try {
    const normalized = normalizeLang(lng);
    window.localStorage.setItem("pk_lang", normalized);
    window.localStorage.setItem("pipekeeper_language", normalized);
    if (lng !== normalized) i18n.changeLanguage(normalized);
  } catch {}
});

export default i18n;