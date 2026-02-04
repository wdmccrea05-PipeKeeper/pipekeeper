/**
 * Safe Translation Utilities
 * 
 * Provides defensive wrappers around i18n to prevent crashes
 * and ensure graceful fallbacks for missing keys.
 * 
 * PRODUCTION MODE: Never renders raw keys or enforcement markers.
 * Missing keys silently fall back to EN without visible indicators.
 * DEBUG MODE: Enable with ?i18nDebug=1 to see missing keys visually.
 */

import { useTranslation as useI18nTranslation } from 'react-i18next';
import { logMissingKey } from './missingKeyHandler';

const debugMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('i18nDebug') === '1';

/**
 * Safe wrapper around useTranslation
 * PRODUCTION: Missing keys silently fall back to EN without markers.
 * DEBUG: Missing keys show visual indicator only when ?i18nDebug=1.
 */
export function useTranslation() {
  try {
    const result = useI18nTranslation();
    
    // Defensive wrapper around t() function
    const safeT = (key, fallback) => {
      try {
        const translated = result.t(key);
        
        // If translation returns the key itself (not found)
        if (typeof translated === 'string' && translated === key) {
          logMissingKey(key, result.i18n.language);
          
          // PRODUCTION: silently use fallback or try EN
          if (fallback) return fallback;
          
          // Try falling back to EN version of the key
          if (result.i18n.language !== 'en') {
            const enFallback = result.i18n.t(key, { lng: 'en' });
            if (enFallback && enFallback !== key) {
              return enFallback;
            }
          }
          
          // DEBUG: only show indicator if debug mode enabled
          if (debugMode) {
            return `⚠️ ${key}`;
          }
          
          // PRODUCTION: return empty string instead of raw key
          return '';
        }
        
        // If translation returns a non-string, use fallback
        if (typeof translated !== 'string') {
          console.warn(`[safeTranslation] Translation for "${key}" returned non-string:`, translated);
          if (fallback) return fallback;
          return '';
        }
        
        return translated;
      } catch (error) {
        console.error(`[safeTranslation] Error translating "${key}":`, error);
        return fallback || '';
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
        return fallback || '';
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