import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getLocaleForLanguage } from './locale.js';
import { normalizeLng } from './normalizeLng.js';
import en from './locales/en.jsx';
import es from './locales/es.jsx';
import fr from './locales/fr.jsx';
import de from './locales/de.jsx';
import it from './locales/it.jsx';
import ptBR from './locales/pt-BR.jsx';
import nl from './locales/nl.jsx';
import pl from './locales/pl.jsx';
import ja from './locales/ja.jsx';
import zhHans from './locales/zh-Hans.jsx';
import { homeTranslations } from './homeContent.jsx';
import { insightsTranslations } from './insightsContent.jsx';
import { storyWineTranslations } from './storyWineTranslations.jsx';
import enCollectionIntelligence from './locales/en.collectionIntelligence.jsx';
import enDocs from './locales/en.docs.jsx';
import esDocs from './locales/es.docs.jsx';
import frDocs from './locales/fr.docs.jsx';
import deDocs from './locales/de.docs.jsx';
import itDocs from './locales/it.docs.jsx';
import ptBRDocs from './locales/pt-BR.docs.jsx';
import nlDocs from './locales/nl.docs.jsx';
import plDocs from './locales/pl.docs.jsx';
import jaDocs from './locales/ja.docs.jsx';
import zhHansDocs from './locales/zh-Hans.docs.jsx';
import deEnums from './locales/de.enums.jsx';
import frEnums from './locales/fr.enums.jsx';
import enUI from './locales/en.ui.jsx';
import esUI from './locales/es.ui.jsx';
import frUI from './locales/fr.ui.jsx';
import deUI from './locales/de.ui.jsx';
import itUI from './locales/it.ui.jsx';
import ptBRUI from './locales/pt-BR.ui.jsx';
import nlUI from './locales/nl.ui.jsx';
import plUI from './locales/pl.ui.jsx';
import jaUI from './locales/ja.ui.jsx';
import zhHansUI from './locales/zh-Hans.ui.jsx';

const CRITICAL_FALLBACKS = {
  common: { back: 'Back', search: 'Search', share: 'Share', loading: 'Loading...', retry: 'Retry' },
  nav: {
    hub: 'Hub', pipekeeper: 'PipeKeeper', whiskeykeeper: 'WhiskeyKeeper', cigarkeeper: 'CigarKeeper', curator: 'Curator',
    community: 'Community', profile: 'Profile', help: 'Help', faq: 'FAQ', support: 'Support', insights: 'Insights',
    wantList: 'Want List', quickAccess: 'Quick Access',
  },
  footer: { copyright: '© 2026 CollectionKeeper. All rights reserved.' },
  search: {
    trigger: 'Search...', openAria: 'Open search', commandInputPlaceholder: 'Search...',
    noResultsFound: 'No results found', noResultsMessage: 'Try another search term.',
    sectionQuickActions: 'Quick Actions', sectionPipes: 'Pipes', sectionTobacco: 'Tobacco',
    actionViewStats: 'View Insights', actionExportData: 'Export Data', actionAddPipe: 'Add Pipe', actionAddBlend: 'Add Blend',
  },
  insightsTabs: {
    summary: 'Summary',
    value: 'Value',
    usage: 'Usage',
    statistics: 'Statistics',
    trends: 'Trends',
    reports: 'Reports',
    sessions: 'Sessions',
    drinkingWindow: 'Drinking Window',
  },
  insightsShared: {
    recentSessions: 'Recent Sessions',
    recentTastings: 'Recent Tastings',
    sessionActivity: 'Session Activity',
    exportReports: 'Export Reports',
    insuranceAndExportReports: 'Insurance & Export Reports',
    totalSessions: 'Total Sessions',
    collectionValue: 'Collection Value',
    averageRating: 'Average Rating',
    bottlesInCellar: 'Bottles in Cellar',
    unknownDate: 'Unknown date',
    noRecentTastings: 'No tastings logged yet.',
    noRecentSessions: 'No sessions logged yet.',
  },
  hub: {
    title: 'CollectionKeeper',
    description: 'Your unified ecosystem for collecting pipes, whiskey, wine, and more. Manage, explore, and curate across all your collections in one place.',
    collectionSummary: 'Collection Overview', totalValue: 'Total Value', pipes: 'Pipes', blends: 'Blends',
    bottleTypes: 'Bottle Types', totalBottles: 'Total Bottles', activeModules: 'Active Modules', yourModules: 'Your Collections',
    pipekeeper: 'PipeKeeper', whiskeykeeper: 'WhiskeyKeeper', cigarkeeper: 'CigarKeeper', winekeeper: 'WineKeeper',
    openModule: 'Open Module', quickLaunch: 'Quick Launch', comingSoon: 'Expanding Soon', comingSoonLabel: 'Coming Soon',
    expandingEcosystem: 'Expanding your CollectionKeeper ecosystem soon.', recentActivity: 'Recent Activity',
    noRecentActivity: 'No recent activity yet. Start by adding to your collections!', loading: 'Loading ecosystem data...',
    curatorTitle: 'Collection Curator', curatorDescription: 'Get AI-powered insights, recommendations, and guidance across your entire collection.',
    curatorAction: 'Open Curator', bottleTypesShort: 'Btl. Types', totalBottlesShort: 'Total Btls', totalValueShort: 'Value',
    collectionStory: 'Collection Story', collectorSnapshot: "Your Collector's Snapshot", storyLoading: 'Composing your collection story…',
    regenerateStory: 'Regenerate story', regenerate: 'Regenerate', trackedWithCollectionKeeper: 'Tracked with CollectionKeeper',
    mostUsedPipe: 'Most Used Pipe', topBlend: 'Top Blend', mostTasted: 'Most Tasted', crownJewel: 'Crown Jewel',
    sessions: 'sessions', tastings: 'tastings', justNow: 'Just now', unknownDate: 'Unknown', tastingLogged: 'Tasting logged',
  },
  quickActions: {
    addPipe: 'Add Pipe', addBlend: 'Add Blend', logSession: 'Log Session', addBottle: 'Add Bottle',
    quickSearchBottle: 'Quick Search Bottle', logTasting: 'Log Tasting', identifyPipe: 'Identify Pipe',
    collectionCurator: 'Collection Curator', insights: 'Insights', wantList: 'Want List',
  },
  modules: {
    notAvailable: 'Not Available',
    notAvailableInRelease: '{{moduleName}} is not available in this release.',
    notYetAvailable: '{{moduleName}} is not yet available.',
    isHidden: '{{moduleName}} is Hidden',
    hiddenDescription: 'This module is currently hidden in your preferences. Your data is safe and intact.',
    manageModules: 'Manage Modules in Profile',
  },
  subscription: {
    activating: 'Activating your subscription...',
    activationDelayedTitle: 'Activation Taking Longer',
    activationDelayedBody: 'Please try again or contact support if the issue persists.',
    continueAnyway: 'Continue Anyway',
    welcome: 'Welcome!',
    nowActive: 'Your subscription is now active. Your modules are ready to use.',
    activeAccess: 'Active Access',
    exploreCollections: 'Explore Collections',
  },
};

const rawLocales = { en, es, fr, de, it, 'pt-BR': ptBR, nl, pl, ja, 'zh-Hans': zhHans };
const docsLocales = {
  en: { ...enDocs, ...enUI }, es: { ...esDocs, ...esUI }, fr: { ...frDocs, ...frEnums, ...frUI },
  de: { ...deDocs, ...deEnums, ...deUI }, it: { ...itDocs, ...itUI }, 'pt-BR': { ...ptBRDocs, ...ptBRUI },
  nl: { ...nlDocs, ...nlUI }, pl: { ...plDocs, ...plUI }, ja: { ...jaDocs, ...jaUI }, 'zh-Hans': { ...zhHansDocs, ...zhHansUI },
};

function isPlainObject(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
function deepMerge(target, source) {
  const out = isPlainObject(target) ? { ...target } : {};
  if (!isPlainObject(source)) return out;
  for (const key of Object.keys(source)) {
    const src = source[key];
    if (isPlainObject(src) && isPlainObject(out[key])) out[key] = deepMerge(out[key], src);
    else if (!(key in out)) out[key] = src;
  }
  return out;
}
function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  return String(path).split('.').reduce((acc, part) => (acc && typeof acc === 'object' && part in acc ? acc[part] : undefined), obj);
}
function interpolate(str, vars) {
  if (typeof str !== 'string' || !vars || typeof vars !== 'object') return str;
  return str.replace(/\{\{?([^{}]+)\}?\}/g, (_, key) => {
    const k = String(key).trim();
    return vars[k] !== undefined ? String(vars[k]) : `{${k}}`;
  });
}
const loggedMissingKeys = new Set();
function logMissingI18nKey(lang, key, source = 'locale') {
  const token = `${lang}:${key}:${source}`;
  if (loggedMissingKeys.has(token)) return;
  loggedMissingKeys.add(token);
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(`[i18n] Missing key "${key}" for "${lang}" (${source})`);
  }
}

export const translations = Object.fromEntries(Object.entries(rawLocales).map(([lang, pack]) => {
  const withDocs = deepMerge(pack, docsLocales[lang] || {});
  const withHome = deepMerge(withDocs, homeTranslations[lang] || {});
  const withInsights = deepMerge(withHome, insightsTranslations[lang] || {});
  const withStoryWine = deepMerge(withInsights, storyWineTranslations[lang] || {});
  const withIntel = lang === 'en'
    ? deepMerge(withStoryWine, { collectionIntelligence: enCollectionIntelligence })
    : withStoryWine;
  const withCriticals = deepMerge(withIntel, CRITICAL_FALLBACKS);
  return [lang, withCriticals];
}));

const I18nContext = createContext(null);

function readLanguage(languageOverride = null) {
  if (languageOverride) return normalizeLng(languageOverride);
  try {
    if (typeof window === 'undefined') return 'en';
    const raw = window.localStorage.getItem('pk_lang') || window.localStorage.getItem('i18nextLng') || document.documentElement.lang || navigator.language || 'en';
    return normalizeLng(raw);
  } catch {
    return 'en';
  }
}
function persistNormalizedLanguage(code) {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('pk_lang', code);
    document.documentElement.lang = code;
    window.dispatchEvent(new CustomEvent('pk:language-changed', { detail: code }));
  } catch {}
}

export function setLanguage(languageCode) {
  const normalized = normalizeLng(languageCode || 'en');
  persistNormalizedLanguage(normalized);
  return normalized;
}
export function I18nProvider({ children, languageOverride = null }) {
  const [lang, setLang] = useState(() => readLanguage(languageOverride));

  useEffect(() => {
    const normalized = readLanguage(languageOverride);
    setLang(normalized);
    persistNormalizedLanguage(normalized);
  }, [languageOverride]);

  useEffect(() => {
    if (languageOverride || typeof window === 'undefined') return undefined;
    const sync = () => setLang(readLanguage(null));
    window.addEventListener('storage', sync);
    window.addEventListener('pk:language-changed', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('pk:language-changed', sync);
    };
  }, [languageOverride]);

  const value = useMemo(() => ({
    lang,
    locale: getLocaleForLanguage(lang),
    setLanguage,
  }), [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
export function useI18n() {
  return useContext(I18nContext);
}
function useLang(languageOverride = null) {
  const context = useI18n();
  const [lang, setLang] = useState(() => readLanguage(languageOverride));
  useEffect(() => {
    if (context && !languageOverride) return undefined;
    const normalized = readLanguage(languageOverride);
    setLang(normalized);
    persistNormalizedLanguage(normalized);
  }, [languageOverride]);
  useEffect(() => {
    if (context || languageOverride) return undefined;
    const sync = () => setLang(readLanguage(null));
    window.addEventListener('storage', sync);
    window.addEventListener('pk:language-changed', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('pk:language-changed', sync);
    };
  }, [context, languageOverride]);
  return context && !languageOverride ? context.lang : lang;
}
function createTranslator(lang) {
  const translationPack = translations[lang] || translations.en || CRITICAL_FALLBACKS;
  return (key, varsOrFallback = {}) => {
    const isOptions = isPlainObject(varsOrFallback);
    const vars = isOptions ? varsOrFallback : {};
    const fallback = typeof varsOrFallback === 'string'
      ? varsOrFallback
      : isOptions && typeof varsOrFallback.defaultValue === 'string'
        ? varsOrFallback.defaultValue
        : undefined;
    const returnObjects = isOptions && varsOrFallback.returnObjects === true;
    let value = getNestedValue(translationPack, key);
    if (value === undefined && lang !== 'en') logMissingI18nKey(lang, key, 'locale');
    if (value === undefined) value = getNestedValue(translations.en, key);
    if (value === undefined) value = getNestedValue(CRITICAL_FALLBACKS, key);
    if (value === undefined) logMissingI18nKey(lang, key, 'global');
    if (value === undefined) value = fallback !== undefined ? fallback : key;
    if (returnObjects) return value;
    if (typeof value === 'string') return interpolate(value, vars);
    return value == null ? '' : String(value);
  };
}

export function useTranslation(languageOverride = null) {
  const lang = useLang(languageOverride);
  const t = useMemo(() => createTranslator(lang), [lang]);
  return { t, lang, locale: getLocaleForLanguage(lang), setLanguage };
}
export function translate(key, varsOrFallback = {}, language = 'en') {
  return createTranslator(normalizeLng(language || 'en'))(key, varsOrFallback);
}
export const SUPPORTED_LANGS = [
  { code: 'en', label: 'English' }, { code: 'es', label: 'Español' }, { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' }, { code: 'it', label: 'Italiano' }, { code: 'pt-BR', label: 'Português (BR)' },
  { code: 'nl', label: 'Nederlands' }, { code: 'pl', label: 'Polski' }, { code: 'ja', label: '日本語' }, { code: 'zh-Hans', label: '中文 (简体)' },
];
export default { I18nProvider, useI18n, useTranslation, translate, SUPPORTED_LANGS, setLanguage };
