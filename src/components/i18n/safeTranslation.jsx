// src/components/i18n/safeTranslation.js
import { useMemo } from "react";
import { translationsComplete } from "./translations-complete.js";
import { missingKeyHandler } from "./missingKeyHandler";

/**
 * Interpolation:
 * Supports both "{{var}}" and "{var}" placeholders.
 */
function interpolate(str, vars) {
  if (!vars || typeof str !== "string") return str;

  // Replace {{var}}
  let out = str.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) => {
    const v = vars[k];
    return v === undefined || v === null ? "" : String(v);
  });

  // Replace {var}
  out = out.replace(/\{\s*([a-zA-Z0-9_]+)\s*\}/g, (_, k) => {
    const v = vars[k];
    return v === undefined || v === null ? "" : String(v);
  });

  return out;
}

/**
 * Safe deep-get: "a.b.c"
 */
function get(obj, path) {
  if (!obj || typeof obj !== "object") return undefined;
  if (!path) return undefined;

  const parts = String(path).split(".");
  let cur = obj;

  for (const p of parts) {
    if (cur && typeof cur === "object" && p in cur) {
      cur = cur[p];
    } else {
      return undefined;
    }
  }
  return cur;
}

/**
 * React hook used throughout the app.
 * Assumes some other part of the app sets language (localStorage, context, etc).
 */
export function useTranslation(langOverride) {
  const lang = useMemo(() => {
    if (langOverride) return langOverride;

    // Try common storage keys (safe fallback) - prioritize pk_lang
    try {
      const stored =
        window?.localStorage?.getItem("pk_lang") ||
        window?.localStorage?.getItem("pipekeeper.language") ||
        window?.localStorage?.getItem("pk.language") ||
        window?.localStorage?.getItem("language");
      if (stored) return stored;
    } catch {
      // ignore
    }

    return "en";
  }, [langOverride]);

  const pack = useMemo(() => {
    return translationsComplete?.[lang] || translationsComplete?.en || {};
  }, [lang]);

  /**
   * t("some.key", {var})
   */
  const t = useMemo(() => {
    return (key, vars, where) => {
      const raw = get(pack, key);

      if (raw === undefined || raw === null || raw === "") {
        // fall back to English if current lang is missing
        const rawEn = get(translationsComplete?.en || {}, key);

        if (rawEn !== undefined && rawEn !== null && rawEn !== "") {
          return interpolate(String(rawEn), vars);
        }

        return missingKeyHandler(key, lang, where);
      }

      if (typeof raw === "string") return interpolate(raw, vars);
      if (typeof raw === "number" || typeof raw === "boolean") return String(raw);

      // If someone stored an object/array at a leaf key, show missing instead of crashing UI
      return missingKeyHandler(key, lang, where);
    };
  }, [pack, lang]);

  // Return i18n-compatible object for backward compatibility
  return { 
    t, 
    lang,
    i18n: {
      language: lang,
      changeLanguage: async (newLang) => {
        try {
          localStorage.setItem("pk_lang", newLang);
          window.location.reload();
        } catch (e) {
          console.error("Failed to change language:", e);
        }
      },
      t
    }
  };
}

/**
 * Non-hook helper for places that can't use hooks.
 */
export function translate(key, vars, lang = "en", where) {
  const pack = translationsComplete?.[lang] || translationsComplete?.en || {};
  const raw = get(pack, key);

  if (raw === undefined || raw === null || raw === "") {
    const rawEn = get(translationsComplete?.en || {}, key);
    if (rawEn !== undefined && rawEn !== null && rawEn !== "") {
      return interpolate(String(rawEn), vars);
    }
    return missingKeyHandler(key, lang, where);
  }

  if (typeof raw === "string") return interpolate(raw, vars);
  if (typeof raw === "number" || typeof raw === "boolean") return String(raw);
  return missingKeyHandler(key, lang, where);
}