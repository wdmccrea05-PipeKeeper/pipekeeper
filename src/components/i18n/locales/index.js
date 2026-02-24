/**
 * i18n Loader - Dynamically imports language files
 * Usage: import { getTranslations } from '@/components/i18n'
 */

const locales = {
  'en': () => import('./locales/en').then(m => m.default),
  'es': () => import('./locales/es').then(m => m.default),
  'fr': () => import('./locales/fr').then(m => m.default),
  'de': () => import('./locales/de').then(m => m.default),
  'it': () => import('./locales/it').then(m => m.default),
  'pt-BR': () => import('./locales/pt-BR').then(m => m.default),
  'nl': () => import('./locales/nl').then(m => m.default),
  'pl': () => import('./locales/pl').then(m => m.default),
  'ja': () => import('./locales/ja').then(m => m.default),
  'zh-Hans': () => import('./locales/zh-Hans').then(m => m.default),
};

const cache = {};

export async function getTranslations(lang = 'en') {
  // Return cached version if available
  if (cache[lang]) {
    return cache[lang];
  }

  // Fallback to English if language not supported
  const loader = locales[lang] || locales['en'];
  
  try {
    const translations = await loader();
    cache[lang] = translations;
    return translations;
  } catch (error) {
    console.error(`Failed to load translations for ${lang}:`, error);
    // Fallback to English
    const fallback = await locales['en']();
    cache[lang] = fallback;
    return fallback;
  }
}

export default getTranslations;
