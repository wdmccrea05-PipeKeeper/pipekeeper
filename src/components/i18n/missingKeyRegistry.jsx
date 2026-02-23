// src/components/i18n/missingKeyRegistry.jsx
// Centralized registry for missing translation keys.
// IMPORTANT: This file MUST export the bindings that src/components/i18n/index.jsx re-exports.

const STORE_KEY = "pipekeeper_missing_i18n_keys_v1";

function readStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    // ignore storage failures
  }
}

/**
 * Record a missing key for a locale.
 */
export function recordMissingKey(locale, key) {
  if (!key) return;

  const loc = locale || "unknown";
  const store = readStore();

  if (!store[loc]) store[loc] = {};
  store[loc][key] = (store[loc][key] || 0) + 1;

  writeStore(store);
}

/**
 * Register a missing key with metadata.
 * Different from missingKeyHandler in missingKeyHandler.jsx
 */
export function registerMissingKey(locale, key) {
  recordMissingKey(locale, key);
}

/**
 * Get missing keys for one locale, or all locales when locale is falsy.
 */
export function getMissingKeys(locale) {
  const store = readStore();
  if (!locale) return store;
  return store[locale] || {};
}

/**
 * Clear missing keys for one locale, or all locales when locale is falsy.
 */
export function clearMissingKeys(locale) {
  if (!locale) {
    writeStore({});
    return;
  }
  const store = readStore();
  delete store[locale];
  writeStore(store);
}

/**
 * Download a JSON report of missing keys.
 */
export function downloadMissingKeysReport(filename = "missing-i18n-keys.json") {
  try {
    const store = readStore();
    const blob = new Blob([JSON.stringify(store, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  } catch {
    // ignore
  }
}

/**
 * Hook-like helper some code may call.
 * We keep it as a function (no React dependency) to avoid crashes in non-React contexts.
 */
export function useMissingKeyCapture(locale) {
  return {
    locale: locale || "unknown",
    get: () => getMissingKeys(locale),
    clear: () => clearMissingKeys(locale),
    download: (filename) => downloadMissingKeysReport(filename),
  };
}

/**
 * Convenience object export (some codebases like calling missingKeyRegistry.get()).
 */
export const missingKeyRegistry = {
  STORE_KEY,
  recordMissingKey,
  registerMissingKey,
  getMissingKeys,
  clearMissingKeys,
  downloadMissingKeysReport,
  useMissingKeyCapture,
};