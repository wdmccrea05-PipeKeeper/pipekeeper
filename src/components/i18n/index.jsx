
export { useTranslation, translate } from "./safeTranslation";
export { translationsComplete } from "./translations-complete";
export { missingKeyRegistry, registerMissingKey, clearMissingKeys } from "./missingKeyRegistry";
export { missingKeyHandler } from "./missingKeyHandler";

export const SUPPORTED_LANGS = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "pt-BR", label: "Português (Brasil)" },
  { code: "nl", label: "Nederlands" },
  { code: "pl", label: "Polski" },
  { code: "ja", label: "日本語" },
  { code: "zh-Hans", label: "中文（简体）" },
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
