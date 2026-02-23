
// Imports first
import * as safe from "./safeTranslation";
import { translationsComplete as tc } from "./translations-complete";
import * as registry from "./missingKeyRegistry";
import { missingKeyHandler as mkh } from "./missingKeyHandler";

// Named exports second
export { useTranslation, translate } from "./safeTranslation";
export { translationsComplete } from "./translations-complete";
export { missingKeyRegistry, registerMissingKey, clearMissingKeys } from "./missingKeyRegistry";
export { missingKeyHandler } from "./missingKeyHandler";

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
