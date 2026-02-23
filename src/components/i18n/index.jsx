import { useTranslation, translate } from "./safeTranslation";
import { translations } from "./translations";
import { translationsComplete } from "./translations-complete";
import {
  missingKeyRegistry,
  registerMissingKey,
  clearMissingKeys,
} from "./missingKeyRegistry";
import { missingKeyHandler } from "./missingKeyHandler";

// Named exports (preferred)
export {
  useTranslation,
  translate,
  translations,
  translationsComplete,
  missingKeyRegistry,
  registerMissingKey,
  clearMissingKeys,
  missingKeyHandler,
};

// Default export (backward compatible with any default-import usage)
export default {
  useTranslation,
  translate,
  translations,
  translationsComplete,
  missingKeyRegistry,
  registerMissingKey,
  clearMissingKeys,
  missingKeyHandler,
};
