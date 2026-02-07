import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { translationsExtended } from "./translations-extended";
import { homeTranslations } from "./homeContent";

// ---- utils
function normalizeLang(raw) {
  const v = (raw || "").toString().trim();
  if (!v) return "en";
  if (v === "pt") return "pt-BR";
  if (v === "zh") return "zh-Hans";
  if (v.toLowerCase() === "zh-cn") return "zh-Hans";
  if (v.toLowerCase() === "pt-br") return "pt-BR";
  return v;
}

function isPlainObject(x) {
  return x && typeof x === "object" && !Array.isArray(x);
}

function deepMerge(target, source) {
  const out = { ...(target || {}) };
  Object.entries(source || {}).forEach(([k, v]) => {
    if (isPlainObject(v) && isPlainObject(out[k])) out[k] = deepMerge(out[k], v);
    else out[k] = v;
  });
  return out;
}

function buildMergedTranslations() {
  // translationsExtended is the authoritative "big" set (includes subscription.* keys, etc.)
  const merged = { ...(translationsExtended || {}) };

  // Merge homeTranslations in (it contains the home page title/subtitle strings)
  Object.entries(homeTranslations || {}).forEach(([lng, pack]) => {
    merged[lng] = deepMerge(merged[lng] || {}, pack || {});
  });

  return merged;
}

// ---- build resources from merged packs
const merged = buildMergedTranslations();

const resources = Object.fromEntries(
  Object.entries(merged).map(([lng, pack]) => [lng, { translation: pack }])
);

// aliases (so "pt" and "zh" don't silently fail)
if (resources["pt-BR"]) resources.pt = resources["pt-BR"];
if (resources["zh-Hans"]) {
  resources.zh = resources["zh-Hans"];
  resources["zh-CN"] = resources["zh-Hans"];
}

// ---- storage: accept BOTH keys, write BOTH keys
function readStoredLang() {
  if (typeof window === "undefined") return "en";
  return normalizeLang(
    window.localStorage.getItem("pk_lang") ||
      window.localStorage.getItem("pipekeeper_language") ||
      "en"
  );
}

function writeStoredLang(lng) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("pk_lang", lng);
    window.localStorage.setItem("pipekeeper_language", lng);
  } catch {}
}

const initial = readStoredLang();

i18n.use(initReactI18next).init({
  resources,
  lng: initial,
  fallbackLng: "en",
  returnNull: false,
  returnEmptyString: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false }
});

i18n.on("languageChanged", (lng) => {
  const normalized = normalizeLang(lng);
  writeStoredLang(normalized);
  if (lng !== normalized) i18n.changeLanguage(normalized);
});

export default i18n;