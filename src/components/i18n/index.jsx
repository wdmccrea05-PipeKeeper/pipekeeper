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

i18n.use(initReactI18next).init({
  resources,
  lng: initialLng,
  fallbackLng: "en",
  supportedLngs,
  nonExplicitSupportedLngs: true,

  returnNull: false,
  returnEmptyString: false,
  returnObjects: false,

  parseMissingKeyHandler: (key) => humanizeKey(key),

  interpolation: { escapeValue: false },
});

// Keep HTML lang and pk_lang in sync when language changes
i18n.on("languageChanged", (lng) => {
  const normalized = normalizeLanguage(lng);
  try { document.documentElement.lang = normalized || "en"; } catch {}
  try { localStorage.setItem("pk_lang", normalized || "en"); } catch {}
});

// GLOBAL ENFORCEMENT: Monkey-patch i18n.t to always run enforceTranslation
const originalT = i18n.t.bind(i18n);
i18n.t = function (key, options) {
  const raw = originalT(key, options);
  return enforceTranslation(key, raw, i18n.language);
};

export default i18n;