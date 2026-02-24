/**
 * React Hook for accessing translations in components
 * Usage: const t = useTranslation('en'); const text = t('home.pageTitle');
 */

import { useState, useEffect } from 'react';
import { getTranslations } from './index';

export function useTranslation(lang = 'en') {
  const [translations, setTranslations] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    getTranslations(lang)
      .then(data => {
        setTranslations(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, [lang]);

  // Helper function to get nested translation keys
  const t = (key) => {
    const keys = key.split('.');
    let value = translations;
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };

  return { t, loading, error, translations };
}

export default useTranslation;
