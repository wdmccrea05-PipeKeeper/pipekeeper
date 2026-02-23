
export { useTranslation, translate } from "./safeTranslation";
export { translationsComplete } from "./translations-complete";
export { missingKeyRegistry, registerMissingKey, clearMissingKeys } from "./missingKeyRegistry";
export { missingKeyHandler } from "./missingKeyHandler";

export const SUPPORTED_LANGS = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
  { code: "ja", label: "日本語" },
];

// Default export (prevents accidental default-import crashes)
import * as safe from "./safeTranslation";
import { translationsComplete as tc } from "./translations-complete";
import * as registry from "./missingKeyRegistry";
import { missingKeyHandler as mkh } from "./missingKeyHandler";

export default {
  ...safe,
  translationsComplete: tc,
  ...registry,
  missingKeyHandler: mkh,
};
