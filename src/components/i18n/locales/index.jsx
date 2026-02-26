/**
 * i18n Loader - Dynamically imports language files
 * Usage: import { getTranslations } from '@/components/i18n'
 */

const locales = {
  'en': () => import('./en').then(m => m.default),
  'es': () => import('./es').then(m => m.default),
  'fr': () => import('./fr').then(m => m.default),
  'de': () => import('./de').then(m => m.default),
  'it': () => import('./it').then(m => m.default),
  'pt-BR': () => import('./pt-BR').then(m => m.default),
  'nl': () => import('./nl').then(m => m.default),
  'pl': () => import('./pl').then(m => m.default),
  'ja': () => import('./ja').then(m => m.default),
  'zh-Hans': () => import('./zh-Hans').then(m => m.default),
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