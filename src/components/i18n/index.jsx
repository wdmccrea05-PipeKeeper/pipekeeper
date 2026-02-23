// Build timestamp: 2026-02-23 - Force Vite cache invalidation
// Imports first
import * as safe from "./safeTranslation.jsx";
import { translationsComplete as tc } from "./translations-complete.jsx";
import * as registry from "./missingKeyRegistry.jsx";
import { missingKeyHandler as mkh } from "./missingKeyHandler.jsx";

// Named exports second
export { useTranslation, translate } from "./safeTranslation.jsx";
export { translationsComplete } from "./translations-complete.jsx";
export { missingKeyRegistry, registerMissingKey, clearMissingKeys } from "./missingKeyRegistry.jsx";
export { missingKeyHandler } from "./missingKeyHandler.jsx";

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

// Console logs after everything
console.log("✓ safeTranslation loaded");
console.log("✓ missingKeyHandler imported");
console.log("✓ i18n index.jsx loaded");

// Default export last
export default {
  ...safe,
  translationsComplete: tc,
  ...registry,
  missingKeyHandler: mkh,
};