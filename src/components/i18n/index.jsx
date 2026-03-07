import { useState, useEffect } from 'react';
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

// Documentation files — split out to keep main locale files under the size limit
// Each docs file contains: howTo (steps), troubleshooting (full Q&A), faqExtended,
// verificationHelp, supportFull, inviteFull, appleSupport, termsOfService, privacyPolicy
import enDocs from './locales/en.docs';
import esDocs from './locales/es.docs';
import frDocs from './locales/fr.docs';
import deDocs from './locales/de.docs';
import itDocs from './locales/it.docs';
import ptBRDocs from './locales/pt-BR.docs';
import nlDocs from './locales/nl.docs';
import plDocs from './locales/pl.docs';
import jaDocs from './locales/ja.docs';
import zhHansDocs from './locales/zh-Hans.docs';

// Supplementary files for languages that exceeded the main file size limit
import deEnums from './locales/de.enums';
import frEnums from './locales/fr.enums';

const docsLocales = {
  en: enDocs,
  es: esDocs,
  fr: { ...frDocs, ...frEnums },
  de: { ...deDocs, ...deEnums },
  it: itDocs,
  'pt-BR': ptBRDocs,
  nl: nlDocs,
  pl: plDocs,
  ja: jaDocs,
  'zh-Hans': zhHansDocs,
};

// Deep merge: source keys overwrite target only when target is missing the key
function deepMerge(target, source) {
  if (!source || typeof source !== 'object') return target;
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      result[key] &&
      typeof result[key] === 'object'
    ) {
      result[key] = deepMerge(result[key], source[key]);
    } else if (!(key in result)) {
      // Only add keys that don't already exist in locale file (locale file wins)
      result[key] = source[key];
    }
  }
  return result;
}

const rawLocales = {
  en,
  es,
  fr,
  de,
  it,
  'pt-BR': ptBR,
  nl,
  pl,
  ja,
  'zh-Hans': zhHans,
};

// Merge homeContent + docs translations into each language pack
// Priority: locale file wins > homeContent > docs (English fallback handles missing doc keys)
const translations = Object.fromEntries(
  Object.entries(rawLocales).map(([lang, pack]) => {
    const withHome = deepMerge(pack, (homeTranslations[lang] || {}));
    const withDocs = deepMerge(withHome, (docsLocales[lang] || {}));
    return [lang, withDocs];
  })
);

function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  const parts = String(path).split('.');
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return current;
}

function interpolate(str, vars) {
  if (!str || typeof str !== 'string') return str;
  if (!vars) return str;
  return str.replace(/\{([^}]+)\}/g, (_, key) => {
    return vars[key] !== undefined ? String(vars[key]) : `{${key}}`;
  });
}

// Read lang from localStorage reactively with a storage event listener
// so language changes propagate to already-mounted components without a full reload.
function useLang(languageOverride = null) {
  const [lang, setLang] = useState(() => {
    if (languageOverride) return languageOverride;
    try {
      return typeof window !== 'undefined'
        ? (window.localStorage.getItem('pk_lang') || 'en')
        : 'en';
    } catch {
      return 'en';
    }
  });

  useEffect(() => {
    if (languageOverride) return; // override takes precedence
    const handler = () => {
      try {
        setLang(window.localStorage.getItem('pk_lang') || 'en');
      } catch {
        setLang('en');
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [languageOverride]);

  return languageOverride || lang;
}

export function useTranslation(languageOverride = null) {
  const lang = useLang(languageOverride);
  const translationPack = translations[lang] || translations.en || {};

  const t = (key, varsOrFallback = {}) => {
    const isOptions =
      typeof varsOrFallback === 'object' &&
      varsOrFallback !== null &&
      !Array.isArray(varsOrFallback);
    const vars = isOptions ? varsOrFallback : {};
    const fallbackStr =
      typeof varsOrFallback === 'string' ? varsOrFallback : undefined;
    const returnObjects = isOptions && varsOrFallback.returnObjects === true;

    const value = getNestedValue(translationPack, key);
    if (value === undefined) {
      const fallback = getNestedValue(translations.en, key);
      if (fallback !== undefined) {
        if (returnObjects) return fallback;
        if (typeof fallback === 'string') return interpolate(fallback, vars);
        return String(fallback);
      }
      return fallbackStr !== undefined ? fallbackStr : key;
    }
    if (returnObjects) return value;
    if (typeof value === 'string') return interpolate(value, vars);
    return String(value);
  };

  return { t, lang };
}

export function translate(key, vars = {}, language = 'en') {
  const isOptions = typeof vars === 'object' && vars !== null && !Array.isArray(vars);
  const returnObjects = isOptions && vars.returnObjects === true;
  const pack = translations[language] || translations.en || {};
  const value = getNestedValue(pack, key);
  if (value === undefined) {
    const fallback = getNestedValue(translations.en, key);
    if (fallback !== undefined) {
      if (returnObjects) return fallback;
      if (typeof fallback === 'string') return interpolate(fallback, vars);
      return String(fallback);
    }
    return key;
  }
  if (returnObjects) return value;
  if (typeof value === 'string') {
    return interpolate(value, vars);
  }
  return String(value);
}

export const SUPPORTED_LANGS = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt-BR', label: 'Português (BR)' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'pl', label: 'Polski' },
  { code: 'ja', label: '日本語' },
  { code: 'zh-Hans', label: '中文 (简体)' },
];

export default {
  useTranslation,
  translate,
  SUPPORTED_LANGS,
};