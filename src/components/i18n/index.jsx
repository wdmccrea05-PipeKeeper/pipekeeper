// src/components/i18n/index.jsx
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import { translations } from "./translations";
import { translationsExtended } from "./translations-extended";
import { translationsComplete } from "./translations-complete";

import { homeTranslations } from "./homeContent";
import { helpContentFull } from "./helpContent-full";
import { helpContentTranslations } from "./helpContent-translations";
import { helpContentFinal } from "./helpContent-final";

function isPlainObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function deepMerge(target, source) {
  if (!isPlainObject(target)) return source;
  if (!isPlainObject(source)) return target;

  const out = { ...target };
  for (const [k, v] of Object.entries(source)) {
    if (isPlainObject(v) && isPlainObject(out[k])) out[k] = deepMerge(out[k], v);
    else out[k] = v;
  }
  return out;
}

// Some locale files are shaped { common: {...} }, others are flat {...}
function normalizeLocale(localeObj) {
  if (!localeObj) return {};
  if (localeObj.common && isPlainObject(localeObj.common)) return localeObj.common;
  return localeObj;
}

// Wrap help content so pages can call helpContent.faqFull.sections etc.
function wrapHelp(helpObj) {
  if (!helpObj) return {};
  // help files export { faqFull, howTo, troubleshooting }
  return { helpContent: helpObj };
}

function buildLocale(lang) {
  const base =
    deepMerge(
      normalizeLocale(translations?.[lang]),
      normalizeLocale(translationsExtended?.[lang])
    );

  // translationsComplete already includes helpContent in some builds,
  // but keep it merged in case it has other keys.
  const complete = normalizeLocale(translationsComplete?.[lang]);

  const home = homeTranslations?.[lang] ?? {};

  const help =
    deepMerge(
      deepMerge(wrapHelp(helpContentFull?.[lang]), wrapHelp(helpContentTranslations?.[lang])),
      wrapHelp(helpContentFinal?.[lang])
    );

  return deepMerge(deepMerge(deepMerge(base, complete), home), help);
}

const supported = ["en", "es", "fr", "de", "it", "pt-BR", "nl", "pl", "ja", "zh-Hans"];

const resources = supported.reduce((acc, lang) => {
  acc[lang] = { translation: buildLocale(lang) };
  return acc;
}, {});

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
    });
}

export default i18next;
export { resources, supported };