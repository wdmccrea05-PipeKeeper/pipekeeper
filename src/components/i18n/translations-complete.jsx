// src/components/i18n/translations-complete.js
import { translations as base } from "./translations";

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
const en = base?.en || {};

// You can keep overrides here later if you want.
// For now, rely on translations.js as the canonical packs.
const es = mergeDeep(en, base?.es || {});
const de = mergeDeep(en, base?.de || {});
const ja = mergeDeep(en, base?.ja || {});

export const translationsComplete = {
  en,
  es,
  de,
  ja,
};

export default translationsComplete;