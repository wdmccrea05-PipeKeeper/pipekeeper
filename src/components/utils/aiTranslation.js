import { base44 } from "@/api/base44Client";
import { trackedInvokeLLM } from '@/lib/integrationTelemetry';

/**
 * Get the current user locale from localStorage (pk_lang key).
 * Returns 'en' if not set or if unavailable (SSR/iOS).
 */
export function getCurrentLocale() {
  try {
    return (typeof window !== "undefined" && window?.localStorage?.getItem("pk_lang")) || "en";
  } catch {
    return "en";
  }
}

/**
 * Returns true if the locale is English (no translation needed).
 */
export function isEnglishLocale(locale) {
  return !locale || locale === "en" || locale.startsWith("en-");
}

/**
 * Translate arbitrary user-typed text to English before sending to AI.
 * If the locale is already English, returns the text unchanged (no LLM call).
 * If the text is empty/falsy, returns it unchanged.
 *
 * @param {string} text - User-provided free-form text
 * @param {string} [locale] - Locale code (defaults to getCurrentLocale())
 * @returns {Promise<string>} English version of the text
 */
export async function translateToEnglish(text, locale) {
  const lang = locale ?? getCurrentLocale();
  if (!text || !text.trim() || isEnglishLocale(lang)) return text;

  try {
    const result = await trackedInvokeLLM({
      prompt: `Translate the following text to English. Return ONLY the translated text, nothing else, no explanation, no quotes.\n\nText to translate:\n${text}`,
      response_json_schema: {
        type: "object",
        properties: {
          translation: { type: "string" },
        },
        required: ["translation"],
      },
    }, { feature: 'i18n.translation', module: 'shared' });
    return result?.translation || text;
  } catch (err) {
    console.warn("[aiTranslation] translateToEnglish failed, using original:", err);
    return text;
  }
}

/**
 * Translate an AI-generated English response back to the user's locale.
 * If the locale is English, returns the text unchanged (no LLM call).
 * If the text is empty/falsy, returns it unchanged.
 *
 * @param {string} text - English AI response
 * @param {string} [locale] - Locale code (defaults to getCurrentLocale())
 * @returns {Promise<string>} Translated response in the user's language
 */
export async function translateFromEnglish(text, locale) {
  const lang = locale ?? getCurrentLocale();
  if (!text || !text.trim() || isEnglishLocale(lang)) return text;

  const LOCALE_NAMES = {
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    "pt-BR": "Brazilian Portuguese",
    nl: "Dutch",
    pl: "Polish",
    ja: "Japanese",
    "zh-Hans": "Simplified Chinese",
  };

  const langName = LOCALE_NAMES[lang] || lang;

  try {
    const result = await trackedInvokeLLM({
      prompt: `Translate the following text to ${langName}. Preserve all markdown formatting (bold, bullets, headers). Return ONLY the translated text, nothing else.\n\nText to translate:\n${text}`,
      response_json_schema: {
        type: "object",
        properties: {
          translation: { type: "string" },
        },
        required: ["translation"],
      },
    }, { feature: 'i18n.translation', module: 'shared' });
    return result?.translation || text;
  } catch (err) {
    console.warn("[aiTranslation] translateFromEnglish failed, using original:", err);
    return text;
  }
}

/**
 * Detects if text contains characters from a script different from the target locale.
 * Returns true if the text appears to contain mixed-language content.
 */
function hasMixedScript(text, locale) {
  if (!text || typeof text !== "string") return false;
  // CJK unified ideographs (Japanese, Chinese, Korean)
  const hasCJK = /[\u3000-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/.test(text);
  // Arabic and Hebrew
  const hasArabicHebrew = /[\u0600-\u06FF\u0590-\u05FF]/.test(text);
  // Cyrillic
  const hasCyrillic = /[\u0400-\u04FF]/.test(text);

  if (isEnglishLocale(locale)) {
    return hasCJK || hasArabicHebrew || hasCyrillic;
  }
  // For Japanese and Chinese, flag content that contains Arabic/Hebrew (clearly wrong script)
  if (locale === "ja" || locale === "zh-Hans") return hasArabicHebrew;
  return false;
}

/**
 * Synchronously normalize a recommendation text string for display.
 * If the text appears to be in the wrong language, returns it as-is (translation
 * requires an async LLM call, so this only handles obvious rendering issues like
 * stripping stray foreign characters that got mixed in).
 *
 * For async normalization, use translateFromEnglish.
 *
 * @param {string} text - The recommendation or reasoning text to display
 * @param {string} [locale] - Target locale (defaults to getCurrentLocale())
 * @returns {string} Cleaned text
 */
export function normalizeRecommendationText(text, locale) {
  if (!text || typeof text !== "string") return text || "";
  const lang = locale ?? getCurrentLocale();
  // If text is clearly mixed-language, log a warning in dev but return the text as-is.
  // Full normalization requires async translateFromEnglish; this function is sync.
  if (import.meta.env?.DEV && hasMixedScript(text, lang)) {
    console.warn("[normalizeRecommendationText] Possible mixed-language text detected:", text.slice(0, 80));
  }
  return text.trim();
}

