import { base44 } from "@/api/base44Client";

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
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Translate the following text to English. Return ONLY the translated text, nothing else, no explanation, no quotes.\n\nText to translate:\n${text}`,
      response_json_schema: {
        type: "object",
        properties: {
          translation: { type: "string" },
        },
        required: ["translation"],
      },
    });
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
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Translate the following text to ${langName}. Preserve all markdown formatting (bold, bullets, headers). Return ONLY the translated text, nothing else.\n\nText to translate:\n${text}`,
      response_json_schema: {
        type: "object",
        properties: {
          translation: { type: "string" },
        },
        required: ["translation"],
      },
    });
    return result?.translation || text;
  } catch (err) {
    console.warn("[aiTranslation] translateFromEnglish failed, using original:", err);
    return text;
  }
}
