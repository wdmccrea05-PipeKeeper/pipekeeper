/**
 * AI Text Normalization Utilities
 * Prevents multilingual bleed in AI-generated text by ensuring content
 * matches the active locale and removing mixed-language fragments.
 */

import { useTranslation } from "@/components/i18n/safeTranslation";

/**
 * Sanitize AI-generated recommendation text
 * Removes non-ASCII characters that may have leaked from other language datasets
 * Ensures text is appropriate for the active locale
 */
export function sanitizeRecommendationText(text, activeLocale = 'en') {
  if (!text || typeof text !== 'string') return '';
  
  // Trim whitespace
  let sanitized = text.trim();
  
  // For English locale: remove any CJK characters, Arabic, etc.
  if (activeLocale === 'en' || activeLocale.startsWith('en-')) {
    // Remove CJK Unicode ranges (Japanese, Chinese, Korean)
    sanitized = sanitized.replace(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/g, '');
    
    // Remove Arabic script
    sanitized = sanitized.replace(/[\u0600-\u06FF]/g, '');
    
    // Remove other non-Latin scripts (Cyrillic, Greek, etc. — keep only if context requires)
    sanitized = sanitized.replace(/[\u0400-\u04FF\u0370-\u03FF]/g, '');
  }
  
  // Clean up multiple spaces
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  // Remove empty parentheses or brackets
  sanitized = sanitized.replace(/\(\s*\)|\[\s*\]/g, '').trim();
  
  return sanitized;
}

/**
 * Normalize AI recommendation data structure
 * Applies locale-specific text sanitization across multiple fields
 */
export function normalizeAIRecommendation(recommendation, activeLocale = 'en') {
  if (!recommendation) return recommendation;
  
  return {
    ...recommendation,
    reason: sanitizeRecommendationText(recommendation.reason, activeLocale),
    description: sanitizeRecommendationText(recommendation.description, activeLocale),
    title: sanitizeRecommendationText(recommendation.title, activeLocale),
    insight: sanitizeRecommendationText(recommendation.insight, activeLocale),
  };
}

/**
 * Normalize array of AI recommendations
 */
export function normalizeAIRecommendations(recommendations, activeLocale = 'en') {
  if (!Array.isArray(recommendations)) return [];
  
  return recommendations
    .map(rec => normalizeAIRecommendation(rec, activeLocale))
    .filter(rec => {
      // Filter out entries that became empty after sanitization
      return rec.reason && rec.reason.length > 0;
    });
}

/**
 * Hook to apply locale-aware text normalization
 * Use in components that display AI-generated content
 */
export function useAITextNormalization() {
  const { lang } = useTranslation();
  
  return {
    sanitize: (text) => sanitizeRecommendationText(text, lang),
    normalizeRec: (rec) => normalizeAIRecommendation(rec, lang),
    normalizeRecs: (recs) => normalizeAIRecommendations(recs, lang),
  };
}