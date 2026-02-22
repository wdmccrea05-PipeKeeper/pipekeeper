import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { translationsComplete } from "./translations-complete";
import { translations } from "./translations";
import { enforceTranslation, humanizeKey } from "./enforceTranslation";

/**
 * Humanize a translation key into readable text.
 * Re-exported for convenience.
 */
export { humanizeKey };

function isKeyLikeString(value) {
  if (typeof value !== "string") return false;
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
      if (!trimmed) continue;
      if (isKeyLikeString(trimmed)) continue;
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
  const lngs = ["en", "es", "fr", "de", "it", "pt", "zh", "ja"];
  const resources = {};

  for (const lng of lngs) {
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

const savedLng =
  (typeof window !== "undefined" &&
    window.localStorage &&
    window.localStorage.getItem("pk_lang")) ||
  "";

const initialLng = normalizeLanguage(savedLng || "en");

// keep pk_lang normalized on boot
try { localStorage.setItem("pk_lang", initialLng); } catch {}

// Sync HTML lang on boot
try { document.documentElement.lang = initialLng; } catch {}

// DEV-only strict mode: track missing keys, disable fallback
const missingKeysPerRoute = {};
let lastRoute = typeof window !== "undefined" ? window.location.pathname : "";

const createMissingKeyHandler = () => {
  if (!import.meta.env.DEV) {
    return (key) => humanizeKey(key);
  }

  // DEV: Return explicit missing indicator and log
  return (key) => {
    const lang = i18n.language || "en";
    const route = typeof window !== "undefined" ? window.location.pathname : "unknown";
    const logKey = `${route}::${lang}::${key}`;

    if (!missingKeysPerRoute[route]) {
      missingKeysPerRoute[route] = new Set();
    }

    if (!missingKeysPerRoute[route].has(logKey)) {
      missingKeysPerRoute[route].add(logKey);
      console.warn(`[i18n] MISSING KEY [${lang}] @ ${route}:`, key);
    }

    return humanizeKey(key);
  };
};

// PROD: still log missing keys for cleanup
const prodMissingKeyHandler = (key) => {
  const lang = i18n.language || "en";
  console.warn(`[i18n] Missing key [${lang}]:`, key);
  return humanizeKey(key);
};

i18n.use(initReactI18next).init({
  resources,
  lng: initialLng,
  fallbackLng: "en",
  supportedLngs,
  nonExplicitSupportedLngs: true,

  returnNull: false,
  returnEmptyString: false,
  returnObjects: false,

  parseMissingKeyHandler: import.meta.env.DEV
    ? createMissingKeyHandler()
    : prodMissingKeyHandler,

  interpolation: { escapeValue: false },
});

// Keep HTML lang and pk_lang in sync when language changes
i18n.on("languageChanged", (lng) => {
  const normalized = normalizeLanguage(lng);
  try { document.documentElement.lang = normalized || "en"; } catch {}
  try { localStorage.setItem("pk_lang", normalized || "en"); } catch {}
});

// Track route changes to reset missing key dedup
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    lastRoute = window.location.pathname;
  });
}

// Track TODO warnings per key per session (DEV only)
const todoWarningsShown = new Set();

// GLOBAL ENFORCEMENT: Monkey-patch i18n.t to always run enforceTranslation + placeholder guard
const originalT = i18n.t.bind(i18n);
i18n.t = function (key, options) {
  const raw = originalT(key, options);
  const enforced = enforceTranslation(key, raw, i18n.language);
  
  // DEV: Placeholder detection for [TODO] - fallback to English
  if (typeof enforced === 'string' && enforced.startsWith('[TODO]')) {
    const currentLng = i18n.language;
    
    if (import.meta.env.DEV && !todoWarningsShown.has(`${currentLng}::${key}`)) {
      todoWarningsShown.add(`${currentLng}::${key}`);
      console.warn(`[i18n TODO] ${currentLng} ${key}`);
    }
    
    const enValue = originalT(key, { ...options, lng: 'en' });
    return enforceTranslation(key, enValue, 'en');
  }
  
  // PROD: Safety guard - ensure [MISSING] never renders in production
  if (!import.meta.env.DEV && typeof enforced === 'string' && enforced.startsWith('[MISSING]')) {
    const enValue = originalT(key, { ...options, lng: 'en' });
    return enforceTranslation(key, enValue, 'en') || humanizeKey(key);
  }
  
  return enforced;
};

/**
 * Export supported languages derived from available resources.
 * Maps display labels to actual i18n language codes.
 */
export const SUPPORTED_LANGS = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português (BR)" },
  { code: "zh", label: "中文 (简体)" },
  { code: "ja", label: "日本語" },
].filter((lang) => supportedLngs.includes(lang.code));

export default i18n;
