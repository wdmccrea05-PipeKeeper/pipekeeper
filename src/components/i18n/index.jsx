
// Build timestamp: 2026-02-23 - Canonical .js imports only

// Import from canonical .js files (no extensions for Vite compatibility)
export { useTranslation, translate } from "./safeTranslation";
export { translationsComplete } from "./translations-complete";
export { missingKeyRegistry, registerMissingKey, clearMissingKeys } from "./missingKeyRegistry";
export { missingKeyHandler } from "./missingKeyHandler";

// Supported langs constant - ALL 10 LOCALES
export const SUPPORTED_LANGS = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "pt-BR", label: "Português (BR)" },
  { code: "nl", label: "Nederlands" },
  { code: "pl", label: "Polski" },
  { code: "ja", label: "日本語" },
  { code: "zh-Hans", label: "中文 (简体)" },
];

// Default export
export default {
  useTranslation,
  translate,
  translationsComplete,
  missingKeyRegistry,
  registerMissingKey,
  clearMissingKeys,
  missingKeyHandler,
  SUPPORTED_LANGS,
};
