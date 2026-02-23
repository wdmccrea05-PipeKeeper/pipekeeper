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

// --- EN BASE ---
const en = base?.en || {};

// --- ES OVERRIDES ---
const esOverrides = {
  insights: {
    log: "Registro de uso",
    pairingGrid: "Cuadrícula de emparejamiento",
    rotation: "Rotación",
    stats: "Estadísticas",
    trends: "Tendencias",
    aging: "Añejamiento",
    reports: "Informes",
  },
  smokingLog: {
    logSession: "Registrar sesión",
  },
  tobacconist: {
    title: "Consulta con tabaquero",
    optional: "Opcional",
    identify: "Identificar",
    optimize: "Optimizar",
    whatIf: "¿Y si...?",
    updatesTitle: "Actualizaciones de IA",
    identificationTitle: "Identificador de pipas con IA",
    identificationSubtitle: "Sube fotos para ayuda rápida de identificación",
  },
};

// --- DE OVERRIDES ---
const deOverrides = {
  insights: {
    log: "Nutzungsprotokoll",
    pairingGrid: "Pairing-Raster",
    rotation: "Rotation",
    stats: "Statistiken",
    trends: "Trends",
    aging: "Reifung",
    reports: "Berichte",
  },
  smokingLog: {
    logSession: "Sitzung protokollieren",
  },
  tobacconist: {
    title: "Tabakberater-Beratung",
    optional: "Optional",
    identify: "Identifizieren",
    optimize: "Optimieren",
    whatIf: "Was wäre wenn",
    updatesTitle: "KI-Updates",
    identificationTitle: "KI-Pfeifen-Identifikator",
    identificationSubtitle: "Fotos hochladen für schnelle Identifikationshilfe",
  },
};

// --- JA OVERRIDES ---
const jaOverrides = {
  insights: {
    log: "使用ログ",
    pairingGrid: "ペアリング表",
    rotation: "ローテーション",
    stats: "統計",
    trends: "トレンド",
    aging: "熟成",
    reports: "レポート",
  },
  smokingLog: {
    logSession: "セッションを記録",
  },
  tobacconist: {
    title: "タバコ相談",
    optional: "任意",
    identify: "識別",
    optimize: "最適化",
    whatIf: "もしも",
    updatesTitle: "AI更新",
    identificationTitle: "AIパイプ識別",
    identificationSubtitle: "写真をアップロードして簡易識別",
  },
};

// Build full locale packs:
// - Start with EN
// - Merge any base locale you already have (so you keep prior work)
// - Apply overrides last
const es = mergeDeep(mergeDeep(en, base?.es || {}), esOverrides);
const de = mergeDeep(mergeDeep(en, base?.de || {}), deOverrides);
const ja = mergeDeep(mergeDeep(en, base?.ja || {}), jaOverrides);

export const translationsComplete = {
  en,
  es,
  de,
  ja,
};
