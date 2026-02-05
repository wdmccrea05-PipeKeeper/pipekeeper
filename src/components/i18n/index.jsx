// src/components/i18n/index.jsx
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Existing sources
import { translationsGenerated } from "./translations-generated.jsx";
import { translationsComplete } from "./translations-complete.jsx";

function deepMerge(target, source) {
  const output = { ...target };
  Object.keys(source || {}).forEach((key) => {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
      output[key] = deepMerge(output[key] || {}, source[key]);
    } else {
      output[key] = source[key];
    }
  });
  return output;
}

function humanizeKey(key) {
  const last = String(key || "").split(".").pop() || String(key || "");
  return last
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (s) => s.toUpperCase());
}

// Normalize translations so "bad values" that look like keys don't leak into UI.
// If a value is a key-ish string (contains dots like a.b.c), replace it with a humanized label.
function normalizeTranslationTree(node, path = "") {
  if (!node || typeof node !== "object") return node;

  const out = Array.isArray(node) ? [...node] : { ...node };

  Object.keys(out).forEach((k) => {
    const v = out[k];
    const nextPath = path ? `${path}.${k}` : k;

    if (v && typeof v === "object") {
      out[k] = normalizeTranslationTree(v, nextPath);
      return;
    }

    if (typeof v === "string") {
      // If the stored value looks like an i18n key, it's wrong — humanize instead.
      // Example bad value: "tobacconist.identify"
      if (/^[a-z0-9]+(\.[a-z0-9_-]+)+$/i.test(v)) {
        out[k] = humanizeKey(nextPath);
      }
      // Also prevent empty strings
      if (out[k].trim() === "") {
        out[k] = humanizeKey(nextPath);
      }
    }
  });

  return out;
}

// Build resources
const generatedEn = translationsGenerated?.en || {};
const completeEn = translationsComplete?.en || {};

const mergedEn = deepMerge(generatedEn, completeEn);
const normalizedEn = normalizeTranslationTree(mergedEn);

const resources = {
  en: { translation: normalizedEn },
};

// i18n init
i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",

  // Prevent null/empty/object returns
  returnNull: false,
  returnEmptyString: false,
  returnObjects: false,

  // CRITICAL: This is what actually prevents "key returns key"
  parseMissingKeyHandler: (key) => humanizeKey(key),

  interpolation: { escapeValue: false },

  // Don't emit missing keys to backend
  saveMissing: false,
});

// EXTRA HARD GUARANTEE:
// Monkey-patch i18n.t so ANY direct `t("a.b")` call can never leak a key.
// If i18n returns the key, we humanize it.
const _t = i18n.t.bind(i18n);
i18n.t = (key, options) => {
  const value = _t(key, options);
  if (typeof value === "string" && value === key) return humanizeKey(key);
  if (typeof value === "string" && /^[a-z0-9]+(\.[a-z0-9_-]+)+$/i.test(value)) return humanizeKey(key);
  if (typeof value === "string" && value.trim() === "") return humanizeKey(key);
  return value;
};

export default i18n;