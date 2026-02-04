/**
 * i18n Enforcement Layer
 * Production: Silent mode (logs only, no UI markers)
 * Debug mode (?i18nDebug=1): Visible violation markers
 */

import { logMissingKey } from './missingKeyHandler';

const VIOLATIONS = [];

function isDebugMode() {
  if (typeof window === 'undefined') return false;
  return window.location.search.includes('i18nDebug=1');
}

export function enforceTranslation(key, resolvedValue, language = 'en', componentInfo = '') {
  const debug = isDebugMode();
  const isEnglish = language === 'en' || language?.startsWith('en-');
  
  // Skip enforcement in English (always works)
  if (isEnglish) {
    return resolvedValue;
  }

  // Check if value equals the key (untranslated)
  if (resolvedValue === key) {
    const violation = {
      type: 'MISSING_KEY',
      key,
      language,
      component: componentInfo,
      timestamp: new Date().toISOString(),
    };
    VIOLATIONS.push(violation);
    logMissingKey(key, language);
    
    if (debug) {
      console.error(`[i18n DEBUG] MISSING KEY "${key}" in ${language} at ${componentInfo}`);
      return `🚫 ${key}`;
    } else {
      console.warn(`[i18n:${language}] Missing key: ${key}`);
      return resolvedValue; // Return English/original fallback silently
    }
  }

  // Check if value contains . (likely a key string)
  if (typeof resolvedValue === 'string' && resolvedValue.includes('.') && resolvedValue.length < 100) {
    if (debug) {
      console.error(`[i18n DEBUG] KEY LEAK "${resolvedValue}" at ${componentInfo}`);
      return `🚫 KEY_LEAK`;
    } else {
      console.warn(`[i18n:${language}] Key leak: ${resolvedValue}`);
      return resolvedValue;
    }
  }

  // Check if value contains {{ (template not interpolated)
  if (typeof resolvedValue === 'string' && resolvedValue.includes('{{')) {
    if (debug) {
      console.error(`[i18n DEBUG] TEMPLATE NOT INTERPOLATED "${resolvedValue}" at ${componentInfo}`);
      return `🚫 TEMPLATE_NOT_INTERPOLATED`;
    } else {
      console.warn(`[i18n:${language}] Uninterpolated template: ${resolvedValue}`);
      return resolvedValue;
    }
  }

  return resolvedValue;
}

export function getViolations() {
  return VIOLATIONS;
}

export function clearViolations() {
  VIOLATIONS.length = 0;
}

export function violationCount() {
  return VIOLATIONS.length;
}

export function failBuildIfViolations() {
  if (VIOLATIONS.length > 0) {
    console.error(`[i18n BUILD] ${VIOLATIONS.length} violations detected:`);
    VIOLATIONS.forEach(v => {
      console.error(`  - ${v.type}: ${v.key || v.value} (${v.language}) @ ${v.component}`);
    });
    throw new Error(`Build failed: ${VIOLATIONS.length} i18n violations detected.`);
  }
}