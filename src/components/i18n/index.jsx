// src/components/i18n/index.jsx
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import { translations } from "./translations";
import { translationsExtended } from "./translations-extended";
import { translationsComplete } from "./translations-complete";
import { translationsSupplement } from "./translations-supplement";
import { translationsGenerated } from "./translations-generated";

import { homeTranslations } from "./homeContent";
import { helpContentFull } from "./helpContent-full";

function normalizeLocale(localeObj) {
  if (!localeObj) return {};
  // If wrapped in { common: {...} }, unwrap
  if (localeObj.common && typeof localeObj.common === "object") return localeObj.common;
  return localeObj;
}

// Deep merge so we never overwrite whole namespaces accidentally
function deepMerge(target, source) {
  if (!source || typeof source !== "object") return target;
  for (const key of Object.keys(source)) {
    const sVal = source[key];
    const tVal = target[key];
    if (Array.isArray(sVal)) {
      // Arrays: replace (help sections/items rely on arrays being exact)
      target[key] = sVal.slice();
    } else if (sVal && typeof sVal === "object") {
      target[key] = (tVal && typeof tVal === "object" && !Array.isArray(tVal)) ? tVal : {};
      deepMerge(target[key], sVal);
    } else {
      target[key] = sVal;
    }
  }
  return target;
}

function buildLocale(lang) {
  const base = {};

  // Merge in correct precedence order (later can override *individual keys* safely)
  deepMerge(base, normalizeLocale(translations?.[lang]));
  deepMerge(base, normalizeLocale(translationsExtended?.[lang]));
  deepMerge(base, normalizeLocale(translationsSupplement?.[lang]));
  deepMerge(base, normalizeLocale(translationsComplete?.[lang]));
  deepMerge(base, normalizeLocale(homeTranslations?.[lang]));

  // HELP FIX:
  // helpContent-full.jsx is shaped { faqFull, howTo, troubleshooting } — must be nested under helpContent
  const help = normalizeLocale(helpContentFull?.[lang]);
  if (help && typeof help === "object" && !help.helpContent) {
    deepMerge(base, { helpContent: help });
  } else {
    deepMerge(base, help);
  }

  // GENERATED LAST: wins over all previous sources
  deepMerge(base, normalizeLocale(translationsGenerated?.[lang]));

  return base;
}

const supported = ["en", "es", "fr", "de", "it", "pt-BR", "nl", "pl", "ja", "zh-Hans"];

const resources = supported.reduce((acc, lang) => {
  acc[lang] = { translation: buildLocale(lang) };
  return acc;
}, {});

function humanizeKey(key) {
  const last = key.split(".").pop() || key;
  return last
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (s) => s.toUpperCase());
}

if (!i18next.isInitialized) {
  i18next
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      lng: "en",
      fallbackLng: "en",
      supportedLngs: supported,
      interpolation: { escapeValue: false },
      returnEmptyString: false,
      returnNull: false,
      detection: {
        order: ["localStorage", "navigator"],
        caches: ["localStorage"],
        lookupLocalStorage: "pipekeeper_language",
      },
      react: {
        useSuspense: false,
      },
      missingKeyHandler: (lngs, ns, key) => {
        if (import.meta?.env?.DEV) {
          console.warn(`[i18n] Missing translation: ${key} (${lngs.join(", ")})`);
        }
        return humanizeKey(key);
      },
    });
}

export default i18next;
export { resources, supported };