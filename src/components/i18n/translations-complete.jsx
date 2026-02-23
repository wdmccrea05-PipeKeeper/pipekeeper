import { translations } from "./translations.jsx";

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

const en = translations?.en || {};
const es = mergeDeep(en, translations?.es || {});
const fr = mergeDeep(en, translations?.fr || {});
const de = mergeDeep(en, translations?.de || {});
const it = mergeDeep(en, translations?.it || {});
const pt_BR = mergeDeep(en, translations?.['pt-BR'] || {});
const nl = mergeDeep(en, translations?.nl || {});
const pl = mergeDeep(en, translations?.pl || {});
const ja = mergeDeep(en, translations?.ja || {});
const zh_Hans = mergeDeep(en, translations?.['zh-Hans'] || {});

export const translationsComplete = {
  en, es, fr, de, it, 'pt-BR': pt_BR, nl, pl, ja, 'zh-Hans': zh_Hans
};

export default translationsComplete;