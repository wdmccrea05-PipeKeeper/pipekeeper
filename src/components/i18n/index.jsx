import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// IMPORTANT: use the real, full translation packs
import en from "./locales/en";
import es from "./locales/es";
import fr from "./locales/fr";
import de from "./locales/de";
import it from "./locales/it";
import ptBR from "./locales/pt-BR";
import nl from "./locales/nl";
import pl from "./locales/pl";
import ja from "./locales/ja";
import zhHans from "./locales/zh-Hans";
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

const stored =
  typeof window !== "undefined"
    ? normalizeLang(window.localStorage.getItem("pk_lang"))
    : "en";

i18n.use(initReactI18next).init({
  resources,
  lng: stored,
  fallbackLng: "en",
  supportedLngs: ["en", "es", "fr", "de", "it", "pt-BR", "nl", "pl", "ja", "zh-Hans", "sv"],
  nonExplicitSupportedLngs: true,

  // key behavior
  returnNull: false,
  returnEmptyString: false,
  returnObjects: false,

  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

i18n.on("languageChanged", (lng) => {
  try {
    const normalized = normalizeLang(lng);
    window.localStorage.setItem("pk_lang", normalized);
    if (lng !== normalized) i18n.changeLanguage(normalized);
  } catch {}
});

export default i18n;