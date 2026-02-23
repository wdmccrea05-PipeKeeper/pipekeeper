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
const en = base?.en || {};

// --- ES OVERRIDES ---
// Fix the exact “still English” items from your screenshots.
const esOverrides = {
  // Home hero + cards (top of screenshot)
  home: {
    pageTitle: "Colección de pipas y tabaco",
    pageSubtitle:
      "Administra tus pipas y mezclas de tabaco con búsqueda impulsada por IA, identificación por foto, sugerencias de emparejamiento y valoraciones de mercado.",
    pipeCollection: "Colección de pipas",
    trackAndValue: "Rastrea y valora tus pipas",
    pipesInCollection: "Pipas en colección",
    collectionValue: "Valor de la colección",
    viewCollection: "Ver colección",
    tobaccoCellar: "Bodega de tabaco",
    manageBlends: "Administra tus mezclas",
    tobaccoBlends: "Mezclas de tabaco",
    cellared: "En bodega",
    viewCellar: "Ver bodega",
  },

  // Insights header + tabs
  insights: {
    title: "Información de colección",
    subtitle: "Rastrear uso y optimizar emparejamientos",
    log: "Registro de uso",
    pairingGrid: "Cuadrícula de emparejamiento",
    rotation: "Rotación",
    stats: "Estadísticas",
    trends: "Tendencias",
    aging: "Añejamiento",
    reports: "Informes",
  },

  // Usage Log card / CTA
  smokingLog: {
    usageLog: "Registro de uso",
    totalBowls: "Total de fumadas",
    logSession: "Registrar sesión",
  },

  // “Pro Active” subtext showing as placeholder
  subscription: {
    premiumActiveSubtextPaid: "Gracias por apoyar PipeKeeper",
  },

  // Tobacconist section / tabs
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
    pageTitle: "Pfeifen- & Tabaksammlung",
    pageSubtitle:
      "Verwalte deine Pfeifen und Tabakmischungen mit KI-Suche, Foto-Identifikation, Pairing-Vorschlägen und Marktwert-Schätzungen.",
    pipeCollection: "Pfeifensammlung",
    trackAndValue: "Pfeifen verfolgen und bewerten",
    pipesInCollection: "Pfeifen in der Sammlung",
    collectionValue: "Sammlungswert",
    viewCollection: "Sammlung ansehen",
    tobaccoCellar: "Tabakkeller",
    manageBlends: "Mischungen verwalten",
    tobaccoBlends: "Tabakmischungen",
    cellared: "Eingelagert",
    viewCellar: "Keller ansehen",
  },

  insights: {
    title: "Sammlungseinblicke",
    subtitle: "Nutzung verfolgen und Pairings optimieren",
    log: "Nutzungsprotokoll",
    pairingGrid: "Pairing-Raster",
    rotation: "Rotation",
    stats: "Statistiken",
    trends: "Trends",
    aging: "Reifung",
    reports: "Berichte",
  },

  smokingLog: {
    usageLog: "Nutzungsprotokoll",
    totalBowls: "Gesamtzahl Köpfe",
    logSession: "Sitzung protokollieren",
  },

  subscription: {
    premiumActiveSubtextPaid: "Danke, dass du PipeKeeper unterstützt",
  },

  tobacconist: {
    title: "Tabakberater-Beratung",
    optional: "Optional",
    identify: "Identifizieren",
    optimize: "Optimieren",
    whatIf: "Was wäre wenn…",
    updatesTitle: "KI-Updates",
    identificationTitle: "KI-Pfeifen-Identifikator",
    identificationSubtitle: "Fotos hochladen für schnelle Identifikationshilfe",
  },
};

// --- JA OVERRIDES ---
const jaOverrides = {
  home: {
    pageTitle: "パイプ＆タバココレクション",
    pageSubtitle:
      "AI検索、写真識別、ペアリング提案、相場の評価などで、パイプとブレンドを管理できます。",
    pipeCollection: "パイプコレクション",
    trackAndValue: "パイプを追跡して価値を管理",
    pipesInCollection: "コレクション内のパイプ",
    collectionValue: "コレクション価値",
    viewCollection: "コレクションを見る",
    tobaccoCellar: "タバコセラー",
    manageBlends: "ブレンドを管理",
    tobaccoBlends: "タバコブレンド",
    cellared: "熟成中",
    viewCellar: "セラーを見る",
  },

  insights: {
    title: "コレクションインサイト",
    subtitle: "使用を追跡し、ペアリングを最適化",
    log: "使用ログ",
    pairingGrid: "ペアリング表",
    rotation: "ローテーション",
    stats: "統計",
    trends: "トレンド",
    aging: "熟成",
    reports: "レポート",
  },

  smokingLog: {
    usageLog: "使用ログ",
    totalBowls: "合計ボウル数",
    logSession: "セッションを記録",
  },

  subscription: {
    premiumActiveSubtextPaid: "PipeKeeperのご支援ありがとうございます",
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
// - Start with EN
// - Merge any base locale you already have (so you keep your prior work)
// - Apply our overrides last (so they WIN)
const es = mergeDeep(mergeDeep(en, base?.es || {}), esOverrides);
const de = mergeDeep(mergeDeep(en, base?.de || {}), deOverrides);
const ja = mergeDeep(mergeDeep(en, base?.ja || {}), jaOverrides);

export const translationsComplete = {
  en,
  es,
  de,
  ja,
};
