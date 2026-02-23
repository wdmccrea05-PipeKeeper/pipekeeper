
import * as safe from "./safeTranslation.jsx";
import { translationsComplete as tc } from "./translations-complete.jsx";
import { missingKeyHandler as mkh } from "./missingKeyHandler.jsx";
import { missingKeyRegistry, registerMissingKey, clearMissingKeys } from "./missingKeyRegistry.jsx";

export { useTranslation, translate } from "./safeTranslation.jsx";
export { translationsComplete } from "./translations-complete.jsx";
export { missingKeyHandler } from "./missingKeyHandler.jsx";
export { missingKeyRegistry, registerMissingKey, clearMissingKeys } from "./missingKeyRegistry.jsx";

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

console.log("✓ i18n index.jsx loaded");

export default {
  ...safe,
  translationsComplete: tc,
  missingKeyRegistry,
  registerMissingKey,
  clearMissingKeys,
  missingKeyHandler: mkh,
  SUPPORTED_LANGS,
};
