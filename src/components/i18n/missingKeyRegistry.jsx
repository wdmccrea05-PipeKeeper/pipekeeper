// Missing key registry for development tracking
const registry = new Set();

export function registerMissingKey(key, lang, where) {
  if (import.meta?.env?.DEV) {
    const entry = `${key}|${lang}|${where || 'unknown'}`;
    registry.add(entry);
  }
}

export function clearMissingKeys() {
  registry.clear();
}

export const missingKeyRegistry = registry;