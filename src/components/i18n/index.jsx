import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { translations } from './translations';
import { translationsExtended } from './translations-extended';
import { helpContent } from './helpContent';
import { homeTranslations } from './homeContent';
import { translationsComplete } from './translations-complete';

// Deep merge helper
function deepMerge(...objects) {
  const result = {};
  for (const obj of objects) {
    for (const key in obj) {
      if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        result[key] = deepMerge(result[key] || {}, obj[key]);
      } else {
        result[key] = obj[key];
      }
    }
  }
  return result;
}

// Merge all translation sources
const resources = {};
const languages = ['en', 'es', 'fr', 'de', 'it', 'pt-BR', 'nl', 'pl', 'ja', 'zh-Hans'];

languages.forEach(lang => {
  resources[lang] = {
    translation: deepMerge(
      translations[lang] || {},
      translationsExtended[lang]?.common || {},
      { helpContent: helpContent[lang] || helpContent.en },
      homeTranslations[lang] || homeTranslations.en,
      translationsComplete[lang] || translationsComplete.en
    )
  };
});

i18n
   .use(LanguageDetector)
   .use(initReactI18next)
   .init({
     resources,
     fallbackLng: 'en',
     supportedLngs: languages,
     returnEmptyString: false,
     returnNull: false,
     interpolation: {
       escapeValue: false,
     },
     detection: {
       order: ['localStorage', 'navigator'],
       caches: ['localStorage'],
       lookupLocalStorage: 'pipekeeper_language'
     },
     react: {
       useSuspense: false
     }
   });

export default i18n;