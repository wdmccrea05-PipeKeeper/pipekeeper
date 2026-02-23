
export { useTranslation, translate } from './hooks.jsx';
export { translations } from './translations.jsx';
export { getNestedValue, interpolate } from './utils.jsx';
export { SUPPORTED_LANGS, DEFAULT_LANGUAGE } from './constants.jsx';

console.log('✓ i18n index.jsx loaded successfully');

export default {
  useTranslation: (await import('./hooks.jsx')).useTranslation,
  translate: (await import('./hooks.jsx')).translate,
  SUPPORTED_LANGS: (await import('./constants.jsx')).SUPPORTED_LANGS,
};
