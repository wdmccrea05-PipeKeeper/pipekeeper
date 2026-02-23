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
// Use the existing English pack as the canonical base.
const enBase = base?.en || {};

// --- EN OVERRIDES ---
// Fix placeholder copy that is currently showing on Home.
const enOverrides = {
  home: {
    heroTitle: "Pipe & Tobacco Collection",
    heroSubtitle:
      "Manage your pipes and tobacco blends with AI-powered search, photo identification, pairing suggestions, and market valuations.",

    pipeCollectionTitle: "Pipe Collection",
    pipeCollectionSubtitle: "Track and value your pipes",

    tobaccoCellarTitle: "Tobacco Cellar",
    tobaccoCellarSubtitle: "Manage your blends",

    pipesInCollection: "Pipes in Collection",
    tobaccoBlends: "Tobacco Blends",
    collectionValue: "Collection Value",
    cellared: "Cellared",
    viewCollection: "View Collection",
    viewCellar: "View Cellar",
  },
};

// --- ES OVERRIDES ---
const esOverrides = {
  home: {
    heroTitle: "Colección de pipas y tabaco",
    heroSubtitle:
      "Gestiona tus pipas y mezclas de tabaco con búsqueda con IA, identificación por fotos, sugerencias de emparejamiento y valoraciones de mercado.",

    pipeCollectionTitle: "Colección de pipas",
    pipeCollectionSubtitle: "Rastrea y valora tus pipas",

    tobaccoCellarTitle: "Bodega de tabaco",
    tobaccoCellarSubtitle: "Gestiona tus mezclas",

    pipesInCollection: "Pipas en colección",
    tobaccoBlends: "Mezclas de tabaco",
    collectionValue: "Valor de la colección",
    cellared: "En bodega",
    viewCollection: "Ver colección",
    viewCellar: "Ver bodega",
  },

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

  // NOTE: These keys match what your UI is showing right now in the Tobacconist card.
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
  home: {
    heroTitle: "Pfeifen- & Tabaksammlung",
    heroSubtitle:
      "Verwalte deine Pfeifen und Tabakmischungen mit KI-Suche, Foto-Identifikation, Pairing-Vorschlägen und Marktwert-Schätzungen.",

    pipeCollectionTitle: "Pfeifensammlung",
    pipeCollectionSubtitle: "Pfeifen erfassen und bewerten",

    tobaccoCellarTitle: "Tabakkeller",
    tobaccoCellarSubtitle: "Mischungen verwalten",

    pipesInCollection: "Pfeifen in der Sammlung",
    tobaccoBlends: "Tabakmischungen",
    collectionValue: "Sammlungswert",
    cellared: "Eingelagert",
    viewCollection: "Sammlung ansehen",
    viewCellar: "Keller ansehen",
  },

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
    whatIf: "Was wäre wenn…?",
    updatesTitle: "KI-Updates",
    identificationTitle: "KI-Pfeifen-Identifikator",
    identificationSubtitle: "Fotos hochladen für schnelle Identifikationshilfe",
  },
};

// --- JA OVERRIDES ---
const jaOverrides = {
  home: {
    heroTitle: "パイプ＆タバココレクション",
    heroSubtitle:
      "AI検索、写真識別、ペアリング提案、市場価値の見積もりで、パイプとタバコブレンドを管理します。",

    pipeCollectionTitle: "パイプコレクション",
    pipeCollectionSubtitle: "パイプの記録と評価",

    tobaccoCellarTitle: "タバコセラー",
    tobaccoCellarSubtitle: "ブレンドを管理",

    pipesInCollection: "コレクション内のパイプ",
    tobaccoBlends: "タバコブレンド",
    collectionValue: "コレクション価値",
    cellared: "熟成中",
    viewCollection: "コレクションを見る",
    viewCellar: "セラーを見る",
  },

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
    whatIf: "もしも…",
    updatesTitle: "AI更新",
    identificationTitle: "AIパイプ識別",
    identificationSubtitle: "写真をアップロードして簡易識別",
  },
};

// Build full locale packs:
// - Start with EN base
// - Apply EN overrides (fix placeholders)
// - Merge any existing base locale (keeps prior translations)
// - Apply our overrides last (so they WIN)
const en = mergeDeep(enBase, enOverrides);
const es = mergeDeep(mergeDeep(en, base?.es || {}), esOverrides);
const de = mergeDeep(mergeDeep(en, base?.de || {}), deOverrides);
const ja = mergeDeep(mergeDeep(en, base?.ja || {}), jaOverrides);

export const translationsComplete = {
  en,
  es,
  de,
  ja,
};
