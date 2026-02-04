/**
 * Strict i18n Enforcement Layer
 * Blocks untranslated strings with visible 🚫 placeholders
 * Non-negotiable: no silent fallbacks
 */

import { logMissingKey } from './missingKeyHandler';

const VIOLATIONS = [];

export function enforceTranslation(key, resolvedValue, language = 'en', componentInfo = '') {
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
    console.error(`[i18n ENFORCE] MISSING KEY "${key}" in ${language} at ${componentInfo}`);
    return `🚫 ${key}`;
  }

  // Check if value contains . (likely a key string)
  if (typeof resolvedValue === 'string' && resolvedValue.includes('.') && resolvedValue.length < 100) {
    const violation = {
      type: 'KEY_LEAK',
      value: resolvedValue,
      key,
      language,
      component: componentInfo,
      timestamp: new Date().toISOString(),
    };
    VIOLATIONS.push(violation);
    console.error(`[i18n ENFORCE] KEY LEAK "${resolvedValue}" at ${componentInfo}`);
    return `🚫 KEY_LEAK`;
  }

  // Check if value contains {{ (template not interpolated)
  if (typeof resolvedValue === 'string' && resolvedValue.includes('{{')) {
    const violation = {
      type: 'TEMPLATE_LEAK',
      value: resolvedValue,
      key,
      language,
      component: componentInfo,
      timestamp: new Date().toISOString(),
    };
    VIOLATIONS.push(violation);
    console.error(`[i18n ENFORCE] TEMPLATE NOT INTERPOLATED "${resolvedValue}" at ${componentInfo}`);
    return `🚫 TEMPLATE_NOT_INTERPOLATED`;
  }

  // Check if English text when locale is not English
  if (language !== 'en' && typeof resolvedValue === 'string') {
    const englishMarkers = /^[A-Z][a-z]+\s|^\s*\(default\)|\[.*\]|^undefined|^null/;
    if (englishMarkers.test(resolvedValue)) {
      const violation = {
        type: 'ENGLISH_FALLBACK',
        value: resolvedValue,
        key,
        language,
        component: componentInfo,
        timestamp: new Date().toISOString(),
      };
      VIOLATIONS.push(violation);
      console.warn(`[i18n ENFORCE] ENGLISH FALLBACK in ${language}: "${resolvedValue}" at ${componentInfo}`);
      // Don't block, but flag it
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
    console.error(`[i18n BUILD FAIL] ${VIOLATIONS.length} violations detected:`);
    VIOLATIONS.forEach(v => {
      console.error(`  - ${v.type}: ${v.key || v.value} (${v.language}) @ ${v.component}`);
    });
    throw new Error(`Build failed: ${VIOLATIONS.length} i18n violations. Fix all 🚫 placeholders.`);
  }
}