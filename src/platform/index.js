import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import translations from './translations complete';

const DEFAULT_LANGUAGE = 'en';

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: translations,
      lng: DEFAULT_LANGUAGE,
      fallbackLng: DEFAULT_LANGUAGE,
      interpolation: {
        escapeValue: false,
      },
      returnNull: false,
      returnEmptyString: false,
      react: {
        useSuspense: false,
      },
    })
    .catch((err) => {
      console.error('[i18n] initialization failed:', err);
    });
}

export default i18n;
