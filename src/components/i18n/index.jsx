import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json.js";
import es from "./locales/es.json.js";
import fr from "./locales/fr.json.js";
import de from "./locales/de.json.js";
import it from "./locales/it.json.js";
import ptBR from "./locales/pt-BR.json.js";
import nl from "./locales/nl.json.js";
import pl from "./locales/pl.json.js";
import ja from "./locales/ja.json.js";
import zhHans from "./locales/zh-Hans.json.js";
import sv from "./locales/sv.json.js";

function normalizeLang(raw) {
  const v = (raw || "").toString().trim();
  if (!v) return "en";
  if (v === "pt") return "pt-BR";
  if (v === "zh") return "zh-Hans";
  if (v.toLowerCase() === "zh-cn") return "zh-Hans";
  if (v.toLowerCase() === "pt-br") return "pt-BR";
  return v;
}

function flatten(obj, prefix = "") {
  const out = {};
  Object.entries(obj || {}).forEach(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) Object.assign(out, flatten(v, key));
    else out[key] = v;
  });
  return out;
}

function parityCheck(resources) {
  const base = flatten(resources.en.translation);
  const baseKeys = new Set(Object.keys(base));
  Object.entries(resources).forEach(([lng, pack]) => {
    if (lng === "en") return;
    const flat = flatten(pack.translation);
    const missing = [...baseKeys].filter((k) => !(k in flat));
    if (missing.length) {
      console.error(`[i18n] Locale "${lng}" missing ${missing.length} keys vs en`, missing.slice(0, 50));
    }
  });
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

if (typeof window !== "undefined" && import.meta?.env?.DEV) {
  parityCheck(resources);
}

const stored = normalizeLang(typeof window !== "undefined" ? window.localStorage.getItem("pk_lang") : "en");

i18n.use(initReactI18next).init({
  resources,
  lng: stored,
  fallbackLng: "en",
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