
import { useTranslation, translate } from "./safeTranslation.jsx";
import { translations } from "./translations.jsx";
import { translationsComplete } from "./translations-complete.jsx";
import {
  missingKeyRegistry,
  registerMissingKey,
  clearMissingKeys,
} from "./missingKeyRegistry.jsx";
import { missingKeyHandler } from "./missingKeyHandler.jsx";

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
