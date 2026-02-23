export { useTranslation, t, setLanguage, getLanguage } from "./safeTranslation";
export { translationsComplete } from "./translations-complete";
export { missingKeyRegistry, registerMissingKey, clearMissingKeys } from "./missingKeyRegistry";
export { missingKeyHandler } from "./missingKeyHandler";

// Default export (prevents accidental default-import crashes)
import * as safe from "./safeTranslation";
import { translationsComplete } from "./translations-complete";
import * as registry from "./missingKeyRegistry";
import { missingKeyHandler } from "./missingKeyHandler";

export default {
  ...safe,
  translationsComplete,
  ...registry,
  missingKeyHandler,
};
