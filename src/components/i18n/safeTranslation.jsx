import { useMemo } from "react";
import { translationsComplete } from "./translations-complete.jsx";
import { missingKeyHandler } from "./missingKeyHandler.jsx";

function interpolate(str, vars) {
  if (!vars || typeof str !== "string") return str;
  let out = str.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) => {
    const v = vars[k];
    return v === undefined || v === null ? "" : String(v);
  });
  out = out.replace(/\{\s*([a-zA-Z0-9_]+)\s*\}/g, (_, k) => {
    const v = vars[k];
    return v === undefined || v === null ? "" : String(v);
  });
  return out;
}

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

export function useTranslation(langOverride) {
  const lang = useMemo(() => {
    if (langOverride) return langOverride;
    try {
      const stored = window?.localStorage?.getItem("pk_lang") || window?.localStorage?.getItem("pipekeeper.language");
      if (stored) return stored;
    } catch {}
    return "en";
  }, [langOverride]);

  const pack = useMemo(() => {
    return translationsComplete?.[lang] || translationsComplete?.en || {};
  }, [lang]);

  const t = useMemo(() => {
    return (key, vars) => {
      const raw = get(pack, key);
      if (raw === undefined || raw === null || raw === "") {
        const rawEn = get(translationsComplete?.en || {}, key);
        if (rawEn !== undefined && rawEn !== null && rawEn !== "") {
          return interpolate(String(rawEn), vars);
        }
        return missingKeyHandler(key, lang);
      }
      if (typeof raw === "string") return interpolate(raw, vars);
      return String(raw);
    };
  }, [pack, lang]);

  return { t, lang };
}

export function translate(key, vars, lang = "en") {
  const pack = translationsComplete?.[lang] || translationsComplete?.en || {};
  const raw = get(pack, key);
  if (raw === undefined || raw === null || raw === "") {
    const rawEn = get(translationsComplete?.en || {}, key);
    if (rawEn !== undefined && rawEn !== null && rawEn !== "") {
      return interpolate(String(rawEn), vars);
    }
    return missingKeyHandler(key, lang);
  }
  if (typeof raw === "string") return interpolate(raw, vars);
  return String(raw);
}

export default { useTranslation, translate };