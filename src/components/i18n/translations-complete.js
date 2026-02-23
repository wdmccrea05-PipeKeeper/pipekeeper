import { translations } from "./translations";

/**
 * Canonical complete translation packs.
 * We intentionally point directly at translations.jsx as the single source of truth
 * to prevent "generated/ai" placeholder strings from overriding real copy.
 */
export const translationsComplete = {
  en: translations?.en || {},
  es: translations?.es || {},
  de: translations?.de || {},
  ja: translations?.ja || {},
};
