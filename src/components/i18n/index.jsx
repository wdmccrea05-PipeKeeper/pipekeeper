import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { translationsComplete } from "./translations-complete";
import { translations } from "./translations";

/**
 * Humanize a translation key into readable text.
 * Examples:
 *  - "tobacconist.identificationTitle" -> "Identification Title"
 *  - "profile.manageSubscription" -> "Manage Subscription"
 */
export function humanizeKey(key) {
  const last = String(key || "").split(".").pop() || "";
  return last
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (s) => s.toUpperCase());
}

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

// Restore language preference if present
const savedLng =
  (typeof window !== "undefined" &&
    window.localStorage &&
    window.localStorage.getItem("pk_lang")) ||
  "en";

const initialLng = resources[savedLng] ? savedLng : "en";

i18n.use(initReactI18next).init({
  resources,
  lng: initialLng,
  fallbackLng: "en",

  // never leak null/empty/object values into UI
  returnNull: false,
  returnEmptyString: false,
  returnObjects: false,

  // If missing, show readable fallback (NOT the raw key)
  parseMissingKeyHandler: (key) => humanizeKey(key),

  interpolation: { escapeValue: false },
});

export default i18n;
export { humanizeKey };