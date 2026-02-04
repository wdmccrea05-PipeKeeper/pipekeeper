/**
 * Safe Translation Utilities
 * 
 * Provides defensive wrappers around i18n to prevent crashes
 * and ensure graceful fallbacks for missing keys.
 */

import { useTranslation as useI18nTranslation } from 'react-i18next';
import { logMissingKey } from './missingKeyHandler';
import { enforceTranslation } from './enforceTranslation';

/**
 * Safe wrapper around useTranslation + Enforcement
 * Never throws, logs violations, renders 🚫 placeholders
 */
export function useTranslation() {
  try {
    const result = useI18nTranslation();
    
    // Defensive wrapper around t() function with enforcement
    // Signature: safeT(key, optionsOrFallback, maybeFallback)
    const safeT = (key, optionsOrFallback, maybeFallback) => {
      try {
        let i18nOptions = {};
        let fallback = '';
        
        // Parse arguments: handle both safeT(key, options) and safeT(key, fallback)
        if (optionsOrFallback !== undefined) {
          if (typeof optionsOrFallback === 'object' && !Array.isArray(optionsOrFallback)) {
            // Treat as i18next options (e.g., returnObjects: true, variables)
            i18nOptions = optionsOrFallback;
          } else if (typeof optionsOrFallback === 'string') {
            // Treat as fallback string
            fallback = optionsOrFallback;
          }
        }
        
        // Use maybeFallback if provided (overrides string optionsOrFallback)
        if (typeof maybeFallback === 'string') {
          fallback = maybeFallback;
        }
        
        // Call i18next with options (includes returnObjects, variables for interpolation, etc.)
        const translated = result.t(key, i18nOptions);
        
        // ENFORCE: Check for violations - pass actual key for enforcement checking
        const componentInfo = `useTranslation(${key})`;
        const enforced = enforceTranslation(translated, key, result.i18n.language, componentInfo);
        
        // If enforcement returned a placeholder, return it
        if (typeof enforced === 'string' && enforced.includes('🚫')) {
          return enforced;
        }
        
        // If translation returns the key itself (not found), log and use fallback
        if (typeof translated === 'string' && translated === key) {
          logMissingKey(key, result.i18n.language);
          if (fallback) return fallback;
          return `🚫 ${key}`;
        }
        
        // If translation returns a non-string (returnObjects: true), return it as-is
        if (typeof translated !== 'string') {
          // This is OK for returnObjects: true - return the object/array directly
          return translated;
        }
        
        return translated;
      } catch (error) {
        console.error(`[safeTranslation] Error translating "${key}":`, error);
        return fallback || `🚫 ERROR`;
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
      t: (key, optionsOrFallback, maybeFallback) => {
        console.warn(`[safeTranslation] Using fallback for key "${key}"`);
        const fallback = typeof optionsOrFallback === 'string' ? optionsOrFallback : maybeFallback;
        return fallback || `🚫 ${key}`;
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