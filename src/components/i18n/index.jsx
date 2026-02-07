import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { translationsExtended } from "./translations-extended";

function normalizeLang(raw) {
  const v = (raw || "").toString().trim();
  if (!v) return "en";
  if (v === "pt") return "pt-BR";
  if (v === "zh") return "zh-Hans";
  if (v.toLowerCase() === "zh-cn") return "zh-Hans";
  if (v.toLowerCase() === "pt-br") return "pt-BR";
  return v;
}

const resources = Object.entries(translationsExtended).reduce((acc, [lng, pack]) => {
  acc[lng] = { translation: pack };
  return acc;
}, {});

// Add aliases (optional)
if (resources["pt-BR"]) resources["pt"] = resources["pt-BR"];
if (resources["zh-Hans"]) {
  resources["zh"] = resources["zh-Hans"];
  resources["zh-CN"] = resources["zh-Hans"];
}

const stored =
  typeof window !== "undefined"
    ? normalizeLang(window.localStorage.getItem("pk_lang") || window.localStorage.getItem("pipekeeper_language"))
    : "en";

i18n.use(initReactI18next).init({
  resources,
  lng: stored,
  fallbackLng: "en",
  returnNull: false,
  returnEmptyString: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
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