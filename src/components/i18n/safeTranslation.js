import { useSyncExternalStore, useMemo } from "react";
import { translationsComplete } from "./translations-complete";
import { missingKeyHandler } from "./missingKeyHandler";

// -----------------------------
// Utilities
// -----------------------------
function isObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function getByPath(obj, path) {
  if (!obj || !path) return undefined;
  const parts = String(path).split(".");
  let cur = obj;
  for (const p of parts) {
    if (!isObject(cur) && typeof cur !== "function") return undefined;
    cur = cur?.[p];
    if (cur === undefined || cur === null) return cur;
  }
  return cur;
}

function interpolate(str, vars) {
  if (!str || typeof str !== "string" || !vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => {
    const v = vars[k];
    return v === undefined || v === null ? "" : String(v);
  });
}

function normalizeLang(raw) {
  const lang = (raw || "").toLowerCase();
  if (lang.startsWith("es")) return "es";
  if (lang.startsWith("de")) return "de";
  if (lang.startsWith("ja")) return "ja";
  return "en";
}

function getInitialLanguage() {
  try {
    const saved = localStorage.getItem("pipekeeper.language");
    if (saved) return normalizeLang(saved);
  } catch {}
  try {
    return normalizeLang(navigator.language);
  } catch {}
  return "en";
}

// -----------------------------
// Tiny external store (provider-free)
// -----------------------------
const store = {
  lang: getInitialLanguage(),
  listeners: new Set(),
  setLang(next) {
    const normalized = normalizeLang(next);
    if (normalized === store.lang) return;
    store.lang = normalized;
    try {
      localStorage.setItem("pipekeeper.language", normalized);
    } catch {}
    for (const fn of store.listeners) fn();
  },
  subscribe(fn) {
    store.listeners.add(fn);
    return () => store.listeners.delete(fn);
  },
  snapshot() {
    return store.lang;
  },
};

// -----------------------------
// i18n API
// -----------------------------
function translate(lang, key, options) {
  const pack = translationsComplete?.[lang] || translationsComplete?.en || {};
  const fallbackPack = translationsComplete?.en || {};
  const defaultValue = options?.defaultValue;

  // 1) current locale
  let value = getByPath(pack, key);

  // 2) fallback to EN
  if (value === undefined) value = getByPath(fallbackPack, key);

  // 3) missing
  if (value === undefined) {
    missingKeyHandler?.(key, lang, { defaultValue });
    return defaultValue !== undefined ? defaultValue : `[MISSING] ${key}`;
  }

  // Allow simple functions (rare, but safe)
  if (typeof value === "function") {
    try {
      const out = value(options);
      return typeof out === "string" ? out : String(out ?? "");
    } catch {
      return defaultValue !== undefined ? defaultValue : `[MISSING] ${key}`;
    }
  }

  // String / number
  const str = typeof value === "string" ? value : String(value);

  // interpolation
  return interpolate(str, options);
}

// React hook API expected by your codebase:
// const { i18n, t } = useTranslation();
// i18n.language
// i18n.changeLanguage("es")
export function useTranslation() {
  const lang = useSyncExternalStore(store.subscribe, store.snapshot, store.snapshot);

  const api = useMemo(() => {
    const i18n = {
      language: lang,
      changeLanguage: (next) => store.setLang(next),
      availableLanguages: Object.keys(translationsComplete || { en: true }),
    };

    const t = (key, options) => translate(lang, key, options);

    return { i18n, t, lang };
  }, [lang]);

  return api;
}

// Convenience exports (some files may import these directly)
export function setLanguage(lang) {
  store.setLang(lang);
}

export function getLanguage() {
  return store.lang;
}

export function t(key, options) {
  return translate(store.lang, key, options);
}
