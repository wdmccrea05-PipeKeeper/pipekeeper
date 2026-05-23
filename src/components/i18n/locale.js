import { normalizeLng } from './normalizeLng.js';

export const LANGUAGE_TO_LOCALE = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
  'pt-BR': 'pt-BR',
  nl: 'nl-NL',
  pl: 'pl-PL',
  ja: 'ja-JP',
  'zh-Hans': 'zh-CN',
};

export function getLocaleForLanguage(language = 'en') {
  return LANGUAGE_TO_LOCALE[normalizeLng(language || 'en')] || LANGUAGE_TO_LOCALE.en;
}

export function getCurrentLanguage() {
  try {
    if (typeof window === 'undefined') return 'en';
    const raw =
      window.localStorage.getItem('pk_lang') ||
      window.localStorage.getItem('i18nextLng') ||
      document.documentElement.lang ||
      navigator.language ||
      'en';
    return normalizeLng(raw);
  } catch {
    return 'en';
  }
}

export function getCurrentLocale() {
  return getLocaleForLanguage(getCurrentLanguage());
}
