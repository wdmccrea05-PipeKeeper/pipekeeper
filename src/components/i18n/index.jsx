/**
 * TEMPORARY BYPASS: Minimal i18n system to isolate white screen issue.
 * No dependencies, returns keys as-is.
 */

export const SUPPORTED_LANGS = [
  { code: "en", label: "English" },
];

export const translationsComplete = {
  en: {},
  es: {},
  fr: {},
  de: {},
  it: {},
  'pt-BR': {},
  nl: {},
  pl: {},
  ja: {},
  'zh-Hans': {}
};

export function useTranslation() {
  return { t: (key) => key, lang: "en" };
}

export function translate(key) {
  return key;
}

export default {
  useTranslation,
  translate,
  translationsComplete,
  SUPPORTED_LANGS
};