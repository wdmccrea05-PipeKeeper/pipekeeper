/**
 * Missing Translation Key Handler
 * Detects and logs keys that are not translated
 * Used by safeTranslation wrapper to prevent regressions
 */

const MISSING_KEYS_REGISTRY = new Map();

export function logMissingKey(key, language = 'en') {
  const reg_key = `${language}:${key}`;
  if (!MISSING_KEYS_REGISTRY.has(reg_key)) {
    MISSING_KEYS_REGISTRY.set(reg_key, { key, language, count: 1, firstSeen: new Date() });
    console.warn(`[i18n MISSING KEY] "${key}" not found in language "${language}"`);
  } else {
    const entry = MISSING_KEYS_REGISTRY.get(reg_key);
    entry.count += 1;
  }
}

export function getMissingKeysReport() {
  return Array.from(MISSING_KEYS_REGISTRY.values()).map(entry => ({
    key: entry.key,
    language: entry.language,
    occurrences: entry.count,
    firstSeen: entry.firstSeen.toISOString(),
  }));
}

export function clearMissingKeysRegistry() {
  MISSING_KEYS_REGISTRY.clear();
}

// Admin-only panel integration
export function showMissingKeysAdmin() {
  const missing = getMissingKeysReport();
  if (missing.length === 0) {
    console.log('[i18n] No missing keys detected.');
    return null;
  }
  console.warn(`[i18n ADMIN] ${missing.length} missing keys:`, missing);
  return missing;
}