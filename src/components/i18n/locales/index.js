import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Load translations based on language
const loadTranslations = (language) => {
  switch (language) {
    case 'fr':
      return import('./fr.json');
    case 'en':
    default:
      return import('./en.json');
  }
};

// Initialize i18n
i18n
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    lng: 'en',
    resources: {
      en: loadTranslations('en'),
      fr: loadTranslations('fr'),
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
