import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { translationsComplete } from "./translations-complete";
import { translations } from "./translations";
import { enforceTranslation, humanizeKey } from "./enforceTranslation";
import { getPkLanguage, setPkLanguage } from "./ui";

/**
 * Humanize a translation key into readable text.
 * Re-exported for convenience.
 */
export { humanizeKey };

function isKeyLikeString(value) {
  if (typeof value !== "string") return false;
  // Looks like "section.subSection.label"
  return /^[a-z0-9]+(\.[a-z0-9]+)+$/i.test(value.trim());
}

// Deep merge where empty strings / key-like placeholders do NOT overwrite real copy.
function mergeDeep(base, patch) {
  const out = Array.isArray(base) ? [...base] : { ...base };
  if (!patch || typeof patch !== "object") return out;

  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined) continue;

    if (typeof v === "string") {
      const trimmed = v.trim();
      if (!trimmed) continue; // ignore empty
      if (isKeyLikeString(trimmed)) continue; // ignore placeholders that are literally keys
      out[k] = v;
      continue;
    }

    if (Array.isArray(v)) {
      out[k] = v;
      continue;
    }

    if (typeof v === "object") {
      out[k] = mergeDeep(out[k] && typeof out[k] === "object" ? out[k] : {}, v);
      continue;
    }

    out[k] = v;
  }

  return out;
}

function buildResources() {
  // Only languages that actually exist in the shipped translation objects.
  const lngs = ["en", "es", "fr", "de", "it", "pt", "zh", "ja"];
  const resources = {};

  for (const lng of lngs) {
    // Complete = base truth, translations = overrides/legacy
    const merged = mergeDeep(
      mergeDeep({}, translationsComplete?.[lng] || {}),
      translations?.[lng] || {}
    );

    resources[lng] = { translation: merged };
  }

  return resources;
}

const resources = buildResources();
const supportedLngs = Object.keys(resources);
const normalizeLanguage = (rawLng) => {
  const lng = String(rawLng || "").trim();
  if (!lng) return "en";
  if (lng.startsWith("pt")) return "pt";
  if (lng.startsWith("zh")) return "zh";
  if (supportedLngs.includes(lng)) return lng;
  const base = lng.split("-")[0];
  return supportedLngs.includes(base) ? base : "en";
};

// Bootstrap: read pk_lang as single source of truth (NEVER overwrite if it exists)
const bootLang = getPkLanguage();
console.log("[LANG_BOOT]", { bootLang, file: "components/i18n/index.js" });
setPkLanguage(bootLang); // sets html lang too

const initialLng = normalizeLanguage(bootLang);

console.log("[LANG_WRITE]", "i18n.init", { value: initialLng, file: "components/i18n/index.js" });
console.trace("[LANG_WRITE_TRACE]");

i18n.use(initReactI18next).init({
  resources,
  lng: initialLng,
  fallbackLng: "en",
  supportedLngs,
  nonExplicitSupportedLngs: true,

  // never leak null/empty/object values into UI
  returnNull: false,
  returnEmptyString: false,
  returnObjects: false,

  // If missing, show readable fallback (NOT the raw key)
  parseMissingKeyHandler: (key) => humanizeKey(key),

  interpolation: { escapeValue: false },
});

// GLOBAL ENFORCEMENT: Monkey-patch i18n.t to always run enforceTranslation
// This ensures NO component can leak keys, even if they bypass safeTranslation wrapper
const originalT = i18n.t.bind(i18n);
i18n.t = function(key, options) {
  const raw = originalT(key, options);
  return enforceTranslation(key, raw, i18n.language);
};

export default i18n;