
export { useTranslation, translate } from "./safeTranslation";
export { translationsComplete } from "./translations-complete.jsx";
export { missingKeyRegistry, recordMissingKey, clearMissingKeys } from "./missingKeyRegistry.jsx";
export { missingKeyHandler } from "./missingKeyHandler";

export const SUPPORTED_LANGS = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
  { code: "ja", label: "日本語" },
];

// Default export (prevents accidental default-import crashes)
import * as safe from "./safeTranslation";
import { translationsComplete as tc } from "./translations-complete.jsx";
import * as registry from "./missingKeyRegistry.jsx";
import { missingKeyHandler as mkh } from "./missingKeyHandler";

export default {
  ...safe,
  translationsComplete: tc,
  ...registry,
  missingKeyHandler: mkh,
};
