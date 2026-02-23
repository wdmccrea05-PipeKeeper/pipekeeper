
// Build timestamp: 2026-02-23 - Force Vite cache invalidation
// Imports first
import * as safe from "./safeTranslation.js";
import { translationsComplete as tc } from "./translations-complete.js";
import * as registry from "./missingKeyRegistry.jsx";
import { missingKeyHandler as mkh } from "./missingKeyHandler.jsx";

// Named exports second
export { useTranslation, translate } from "./safeTranslation.js";
export { translationsComplete } from "./translations-complete.js";
export { missingKeyRegistry, registerMissingKey, clearMissingKeys } from "./missingKeyRegistry.jsx";
export { missingKeyHandler } from "./missingKeyHandler.jsx";

// Supported langs constant
export const SUPPORTED_LANGS = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
  { code: "ja", label: "日本語" },
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
