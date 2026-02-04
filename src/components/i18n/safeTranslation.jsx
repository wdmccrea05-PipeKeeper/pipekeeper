/**
 * Safe Translation Utilities
 * 
 * Provides defensive wrappers around i18n to prevent crashes
 * and ensure graceful fallbacks for missing keys.
 */

import { useTranslation as useI18nTranslation } from 'react-i18next';

/**
 * Safe wrapper around useTranslation that never throws
 * Returns English fallback if hook fails
 */
export function useTranslation() {
  try {
    const result = useI18nTranslation();
    
    // Defensive wrapper around t() function
    const safeT = (key, fallback) => {
      try {
        const translated = result.t(key);
        
        // If translation returns the key itself (not found), use fallback
        if (typeof translated === 'string' && translated === key && fallback) {
          return fallback;
        }
        
        // If translation returns a non-string, use fallback or key
        if (typeof translated !== 'string') {
          console.warn(`[safeTranslation] Translation for "${key}" returned non-string:`, translated);
          return fallback || key;
        }
        
        return translated;
      } catch (error) {
        console.error(`[safeTranslation] Error translating "${key}":`, error);
        return fallback || key;
      }
    };
    
    return {
      ...result,
      t: safeT,
    };
  } catch (error) {
    console.error('[safeTranslation] useTranslation hook failed:', error);
    
    // Emergency fallback - return a mock translation function
    return {
      t: (key, fallback) => {
        console.warn(`[safeTranslation] Using fallback for key "${key}"`);
        return fallback || key;
      },
      i18n: { language: 'en' },
      ready: false,
    };
  }
}

/**
 * Validates that a value is safe to use as a translation key
 * (not itself already a translated string that might shadow 't')
 */
export function isSafeTranslationKey(value) {
  if (typeof value !== 'string') return false;
  
  // Check if it looks like a translation key (has dots)
  if (value.includes('.')) {
    // Must not be a very long string (likely translated content, not a key)
    return value.length < 100;
  }
  
  return false;
}

/**
 * Safely translates a value that might be a key or might already be translated
 * Common in select options where some are keys, some are plain strings
 */
export function translateIfKey(t, value, prefix = '') {
  if (!value) return '';
  
  // If value contains the prefix, it's likely a key
  if (prefix && value.startsWith(prefix)) {
    return t(value);
  }
  
  // If it looks like a key (has dots), try translating
  if (isSafeTranslationKey(value)) {
    const translated = t(value);
    // If translation failed (returns key), return original value
    return translated === value ? value : translated;
  }
  
  // Otherwise, it's already a plain string
  return value;
}