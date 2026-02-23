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

// Merge each language pack on top of English so missing keys fall back gracefully.
const es = mergeDeep(en, base?.es || {});
const fr = mergeDeep(en, base?.fr || {});
const de = mergeDeep(en, base?.de || {});
const it = mergeDeep(en, base?.it || {});
const ptBR = mergeDeep(en, base?.["pt-BR"] || {});
const nl = mergeDeep(en, base?.nl || {});
const pl = mergeDeep(en, base?.pl || {});
const ja = mergeDeep(en, base?.ja || {});
const zhHans = mergeDeep(en, base?.["zh-Hans"] || {});

export const translationsComplete = {
  en,
  es,
  fr,
  de,
  it,
  "pt-BR": ptBR,
  nl,
  pl,
  ja,
  "zh-Hans": zhHans,
};

export default translationsComplete;