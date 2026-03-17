import { useMemo } from 'react';
import { useTranslation as useI18NextTranslation } from 'react-i18next';

function cleanValue(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function looksLikeMissingTranslation(value, key) {
  const text = cleanValue(value);
  const normalizedKey = cleanValue(key);

  if (!text) return true;
  if (!normalizedKey) return false;

  return (
    text === normalizedKey ||
    text === `[missing:${normalizedKey}]` ||
    text.toLowerCase() === 'undefined' ||
    text.toLowerCase() === 'null'
  );
}

export function useTranslation() {
  const i18nApi = useI18NextTranslation();

  const safeT = useMemo(() => {
    return (key, fallback = '', options = {}) => {
      try {
        const translated = i18nApi?.t?.(key, options);
        if (looksLikeMissingTranslation(translated, key)) {
          return cleanValue(fallback) || cleanValue(key);
        }
        return translated;
      } catch (error) {
        console.warn('[safeTranslation] translation error:', key, error);
        return cleanValue(fallback) || cleanValue(key);
      }
    };
  }, [i18nApi]);

  return {
    ...i18nApi,
    t: safeT,
  };
}

export default useTranslation;
