// src/components/i18n/translations-complete.jsx
/**
 * FULL LOCALE PACKS - DEEP MERGE IMPLEMENTATION
 *
 * This file builds the final locale packs by deep-merging:
 * - translationsExtended (large base set)
 * - translationsGenerated (generated additions)
 * - translationsSupplement (extra additions)
 * - aiGeneratedTranslations (AI-generated additions)
 * - translations (local/base overrides in repo)
 *
 * Then it applies a small set of "must-have" fixes for keys that are currently showing
 * as [MISSING] or as humanized placeholders (e.g., "Title", "Pipe Collection Title").
 */

import { translations as baseTranslations } from "./translations";
import { translationsExtended } from "./translations-extended";
import { translationsGenerated } from "./translations-generated";
import { translationsSupplement } from "./translations-supplement";
import { aiGeneratedTranslations } from "./translations-ai-generated";

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

function buildLocale(locale) {
  // Merge order: big base -> generated -> supplement -> ai-generated -> local/base -> fixes
  const merged1 = mergeDeep(translationsExtended?.[locale] || {}, translationsGenerated?.[locale] || {});
  const merged2 = mergeDeep(merged1, translationsSupplement?.[locale] || {});
  const merged3 = mergeDeep(merged2, aiGeneratedTranslations?.[locale] || {});
  const merged4 = mergeDeep(merged3, baseTranslations?.[locale] || {});
  return merged4;
}

/**
 * MUST-HAVE ENGLISH KEYS
 * These are currently showing as [MISSING] or placeholder-humanized strings.
 */
const enFixes = {
  ageGate: {
    title: "Adults Only",
    intendedForAdults: "PipeKeeper is intended for adult users only.",
    disclaimer:
      "This app is a collection management tool for pipe smoking enthusiasts. It does not sell or facilitate the purchase of tobacco products.",
    confirmAge: "I confirm I am of legal age",
  },

  // Home hero + cards (these were showing as “Pipe Collection Title”, etc.)
  home: {
    heroTitle: "Pipe & Tobacco Collection",
    heroSubtitle:
      "Manage your pipes and tobacco blends with AI-powered search, photo identification, pairing suggestions, and market valuations.",

    pipeCollectionTitle: "Pipe Collection",
    pipeCollectionSubtitle: "Track and value your pipes",

    tobaccoCellarTitle: "Tobacco Cellar",
    tobaccoCellarSubtitle: "Manage your blends",
  },

  // Insights header (was showing “Title”)
  insights: {
    title: "Collection Insights",
    subtitle: "Track usage, optimize pairings, and monitor your collection",
  },

  // Keep this aligned with the UI that uses Log Session on the Insights/Usage card
  smokingLog: {
    logSession: "Log Session",
  },

  // Keep these aligned with the “Tobacconist Consultation” panel area
  tobacconist: {
    title: "Tobacconist Consultation",
    optional: "Optional",
    subtitle: "Personalized pipe and tobacco advice",

    identify: "Identify",
    optimize: "Optimize",
    whatIf: "What If",
    updatesTitle: "AI Updates",

    identificationTitle: "AI Pipe Identifier",
    identificationSubtitle: "Upload photos for quick identification help",
  },
};

const esFixes = {
  ageGate: {
    title: "Solo adultos",
    intendedForAdults: "PipeKeeper está destinado únicamente a usuarios adultos.",
    disclaimer:
      "Esta app es una herramienta de gestión de colección para aficionados a la pipa. No vende ni facilita la compra de productos de tabaco.",
    confirmAge: "Confirmo que tengo la edad legal",
  },

  home: {
    heroTitle: "Colección de pipas y tabaco",
    heroSubtitle:
      "Gestiona tus pipas y mezclas de tabaco con búsqueda por IA, identificación por fotos, sugerencias de emparejamiento y valoraciones de mercado.",

    pipeCollectionTitle: "Colección de pipas",
    pipeCollectionSubtitle: "Rastrea y valora tus pipas",

    tobaccoCellarTitle: "Bodega de tabaco",
    tobaccoCellarSubtitle: "Gestiona tus mezclas",
  },

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

  smokingLog: {
    logSession: "Registrar sesión",
  },

  tobacconist: {
    title: "Consulta con tabaquero",
    optional: "Opcional",
    subtitle: "Asesoramiento personalizado sobre pipas y tabaco",

    identify: "Identificar",
    optimize: "Optimizar",
    whatIf: "¿Y si...?",
    updatesTitle: "Actualizaciones de IA",

    identificationTitle: "Identificador de pipas con IA",
    identificationSubtitle: "Sube fotos para ayuda rápida de identificación",
  },
};

const deFixes = {
  ageGate: {
    title: "Nur für Erwachsene",
    intendedForAdults: "PipeKeeper ist nur für erwachsene Nutzer bestimmt.",
    disclaimer:
      "Diese App ist ein Sammlungs-Tool für Pfeifenliebhaber. Sie verkauft keine Tabakprodukte und erleichtert keinen Kauf.",
    confirmAge: "Ich bestätige, dass ich volljährig bin",
  },

  home: {
    heroTitle: "Pfeifen- & Tabaksammlung",
    heroSubtitle:
      "Verwalte deine Pfeifen und Tabakmischungen mit KI-Suche, Foto-Identifikation, Pairing-Vorschlägen und Marktwerten.",

    pipeCollectionTitle: "Pfeifensammlung",
    pipeCollectionSubtitle: "Pfeifen verfolgen und bewerten",

    tobaccoCellarTitle: "Tabakkeller",
    tobaccoCellarSubtitle: "Mischungen verwalten",
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
    logSession: "Sitzung protokollieren",
  },

  tobacconist: {
    title: "Tabakberater-Beratung",
    optional: "Optional",
    subtitle: "Personalisierte Beratung zu Pfeife und Tabak",

    identify: "Identifizieren",
    optimize: "Optimieren",
    whatIf: "Was wäre wenn",
    updatesTitle: "KI-Updates",

    identificationTitle: "KI-Pfeifen-Identifikator",
    identificationSubtitle: "Fotos hochladen für schnelle Identifikationshilfe",
  },
};

const jaFixes = {
  ageGate: {
    title: "成人のみ",
    intendedForAdults: "PipeKeeper は成人ユーザーのみを対象としています。",
    disclaimer:
      "このアプリはパイプ愛好家向けのコレクション管理ツールです。タバコ製品の販売や購入の仲介は行いません。",
    confirmAge: "法定年齢であることを確認します",
  },

  home: {
    heroTitle: "パイプ＆タバココレクション",
    heroSubtitle:
      "AI検索、写真識別、ペアリング提案、相場評価でパイプとタバコブレンドを管理できます。",

    pipeCollectionTitle: "パイプコレクション",
    pipeCollectionSubtitle: "パイプの追跡と価値管理",

    tobaccoCellarTitle: "タバコセラー",
    tobaccoCellarSubtitle: "ブレンドを管理",
  },

  insights: {
    title: "コレクションインサイト",
    subtitle: "使用状況の追跡とペアリング最適化",
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
    subtitle: "パイプとタバコの個別アドバイス",

    identify: "識別",
    optimize: "最適化",
    whatIf: "もしも",
    updatesTitle: "AI更新",

    identificationTitle: "AIパイプ識別",
    identificationSubtitle: "写真をアップロードして簡易識別",
  },
};

// Build bases
const enBase = buildLocale("en");
const esBase = buildLocale("es");
const deBase = buildLocale("de");
const jaBase = buildLocale("ja");

// Apply fixes last so they always win
const en = mergeDeep(enBase, enFixes);
const es = mergeDeep(esBase, esFixes);
const de = mergeDeep(deBase, deFixes);
const ja = mergeDeep(jaBase, jaFixes);

export const translationsComplete = {
  en,
  es,
  de,
  ja,
};
