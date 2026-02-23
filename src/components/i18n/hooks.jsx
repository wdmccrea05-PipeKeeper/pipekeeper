import { useMemo } from 'react';
import { translations } from './translations.jsx';
import { getNestedValue, interpolate } from './utils.jsx';

export function useTranslation(languageOverride = null) {
  const lang = useMemo(() => {
    if (languageOverride) return languageOverride;
    
    try {
      return (
        window?.localStorage?.getItem('pk_lang') ||
        window?.localStorage?.getItem('app_language') ||
        'en'
      );
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
        console.warn(`Missing translation key: ${key}`);
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