// src/components/i18n/index.jsx
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { translations } from "./translations";
import { translationsComplete } from "./translations-complete";
import { missingKeyHandler } from "./missingKeyHandler";
import { normalizeLng } from "./normalizeLng";

// Supported language list used by the UI dropdown
export const SUPPORTED_LANGS = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
  { code: "ja", label: "日本語" },
];

// Deep merge utility - recursively merges source into target
function mergeDeep(target, source) {
  const t = target && typeof target === "object" ? target : {};
  const s = source && typeof source === "object" ? source : {};
  const result = Array.isArray(t) ? [...t] : { ...t };

  for (const key in s) {
    const sv = s[key];
    const tv = result[key];

    if (sv && typeof sv === "object" && !Array.isArray(sv)) {
      result[key] = mergeDeep(tv && typeof tv === "object" ? tv : {}, sv);
    } else {
      result[key] = sv;
    }
  }

  return result;
}

// Merge base + complete packs (complete wins)
const mergedPacks = mergeDeep(translations || {}, translationsComplete || {});
const safePack = (lng) => mergedPacks?.[lng] || mergedPacks?.en || {};

// i18next resources
const resources = {
  en: { translation: safePack("en") },
  es: { translation: safePack("es") },
  de: { translation: safePack("de") },
  ja: { translation: safePack("ja") },
};

function readStoredLang() {
  try {
    return localStorage.getItem("pk_lang");
  } catch {
    return null;
  }
}

const initialLng = normalizeLng(readStoredLang() || "en");

// IMPORTANT: prevent double-init in hot reload / preview
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: initialLng,
    fallbackLng: "en",
    supportedLngs: ["en", "es", "de", "ja"],
    nonExplicitSupportedLngs: true,

    // We store everything under the default "translation" namespace
    ns: ["translation"],
    defaultNS: "translation",

    interpolation: { escapeValue: false },

    // Show missing keys clearly (your existing handler)
    parseMissingKeyHandler: (key) => missingKeyHandler(key),

    // i18next will call this when a key is missing
    missingKeyHandler: (lng, ns, key) => {
      try {
        // keep it lightweight; missingKeyRegistry can hook elsewhere if needed
        // eslint-disable-next-line no-console
        console.warn("[i18n missing]", lng, ns, key);
      } catch {}
    },

    // Keep react-i18next snappy
    react: {
      useSuspense: false,
    },
  });
}

export default i18n;
