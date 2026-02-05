import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import { translationsGenerated } from "./translations-generated.jsx";
import { translationsComplete } from "./translations-complete.jsx";

function humanizeKey(key) {
  const last = String(key || "").split(".").pop() || String(key || "");
  return last
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (s) => s.toUpperCase());
}

// Deep merge
function deepMerge(target, source) {
  if (!source || typeof source !== "object") return target;
  for (const key of Object.keys(source)) {
    const sVal = source[key];
    const tVal = target[key];
    if (Array.isArray(sVal)) {
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

// Normalize: catch key-like strings that leaked as values
function normalizeLeakedKeys(obj, path = "") {
  if (!obj || typeof obj !== "object") return obj;
  const out = Array.isArray(obj) ? [...obj] : { ...obj };
  
  Object.keys(out).forEach((k) => {
    const v = out[k];
    const nextPath = path ? `${path}.${k}` : k;
    
    if (v && typeof v === "object") {
      out[k] = normalizeLeakedKeys(v, nextPath);
    } else if (typeof v === "string") {
      // If value looks like a key (dotted path), humanize it
      if (/^[a-z0-9]+(\.[a-z0-9_-]+)+$/i.test(v)) {
        out[k] = humanizeKey(nextPath);
      }
      // Prevent empty strings
      if (String(out[k] || "").trim() === "") {
        out[k] = humanizeKey(nextPath);
      }
    }
  });
  
  return out;
}

const supported = ["en", "es", "fr", "de", "it", "pt-BR", "nl", "pl", "ja", "zh-Hans"];

// Build resources: merge all sources + normalize
const resources = supported.reduce((acc, lang) => {
  const base = {};
  
  // Merge: generated overridden by complete
  deepMerge(base, translationsGenerated?.[lang] || {});
  deepMerge(base, translationsComplete?.[lang] || {});
  
  // Normalize leaked keys
  const normalized = normalizeLeakedKeys(base);
  
  acc[lang] = { translation: normalized };
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
      // Never return raw keys — humanize instead
      parseMissingKeyHandler: (key) => humanizeKey(key),
    });
}

// Monkey-patch: catch any key that still escapes
const _t = i18next.t.bind(i18next);
i18next.t = (key, options) => {
  const result = _t(key, options);
  if (typeof result === "string") {
    // If it returned the key itself or a key-like string, humanize
    if (result === key || /^[a-z0-9]+(\.[a-z0-9_-]+)+$/i.test(result)) {
      return humanizeKey(key);
    }
    // If empty, humanize
    if (result.trim() === "") {
      return humanizeKey(key);
    }
  }
  return result;
};

export default i18next;
export { resources, supported };