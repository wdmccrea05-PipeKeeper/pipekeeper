import { useMemo } from 'react';
import { translations } from './translations.js';

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

export function useTranslation(languageOverride = null) {
  const lang = useMemo(() => {
    if (languageOverride) return languageOverride;
    try {
      return typeof window !== 'undefined' ? (window?.localStorage?.getItem('pk_lang') || 'en') : 'en';
    } catch {
      return 'en';
    }
  }, [languageOverride]);

  const translationPack = useMemo(() => {
    return translations[lang] || translations.en || {};
  }, [lang]);

  const t = useMemo(() => {
    return (key, vars = {}) => {
      const value = getNestedValue(translationPack, key);
      if (value === undefined) {
        const fallback = getNestedValue(translations.en, key);
        if (fallback) {
          return interpolate(String(fallback), vars);
        }
        return key;
      }
      if (typeof value === 'string') {
        return interpolate(value, vars);
      }
      return String(value);
    };
  }, [translationPack]);

  return { t, lang };
}

export function translate(key, vars = {}, language = 'en') {
  const pack = translations[language] || translations.en || {};
  const value = getNestedValue(pack, key);
  if (value === undefined) {
    const fallback = getNestedValue(translations.en, key);
    if (fallback) {
      return interpolate(String(fallback), vars);
    }
    return key;
  }
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
  translations,
};
