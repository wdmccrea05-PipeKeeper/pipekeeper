// src/components/i18n/translations-complete.jsx
// Build timestamp: 2026-02-23 - Force Vite cache invalidation
import { translations } from "./translations.js";

// Deep merge utility - recursively merges source into target
function mergeDeep(target, source) {
  const t = target && typeof target === "object" ? target : {};
  const s = source && typeof source === "object" ? source : {};
  const result = Array.isArray(t) ? [...t] : { ...t };

  for (const key in s) {
    const sv = s[key];
    const tv = result[key];

    if (sv && typeof sv === "object" && !Array.isArray(sv)) {
      result[key] = mergeDeep(tv && typeof tv === "object" ? tv : {}, sv);
    } else {
      result[key] = sv;
    }
  }

  return result;
}

// Use the existing English pack as the canonical base.
const en = translations?.en || {};

// Merge each locale on top of English so missing keys fall back gracefully.
const es = mergeDeep(en, translations?.es || {});
const de = mergeDeep(en, translations?.de || {});
const ja = mergeDeep(en, translations?.ja || {});
const fr = mergeDeep(en, translations?.fr || {});
const it = mergeDeep(en, translations?.it || {});
const ptBR = mergeDeep(en, translations?.["pt-BR"] || {});
const nl = mergeDeep(en, translations?.nl || {});
const pl = mergeDeep(en, translations?.pl || {});
const zhHans = mergeDeep(en, translations?.["zh-Hans"] || {});

export const translationsComplete = {
  en,
  es,
  de,
  ja,
  fr,
  it,
  "pt-BR": ptBR,
  nl,
  pl,
  "zh-Hans": zhHans,
};

export default translationsComplete;