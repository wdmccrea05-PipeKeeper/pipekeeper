const _store = {};

export function recordMissingKey(locale, key) {
    if (!key) return;
    const loc = locale || "unknown";
    if (!_store[loc]) _store[loc] = {};
    _store[loc][key] = (_store[loc][key] || 0) + 1;
}

export function getMissingKeys(locale) {
    if (!locale) return _store;
    return _store[locale] || {};
}

export function clearMissingKeys(locale) {
    if (!locale) {
        Object.keys(_store).forEach(k => { delete _store[k]; });
        return;
    }
    delete _store[locale];
}

export function downloadMissingKeysReport(filename) {
    try {
        const blob = new Blob([JSON.stringify(_store, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename || "missing-i18n-keys.json";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    } catch {
        // ignore
    }
}

// Legacy compat exports
export function registerMissingKey(key) {
    recordMissingKey("unknown", key);
}

export const missingKeyRegistry = {
    recordMissingKey,
    getMissingKeys,
    clearMissingKeys,
    downloadMissingKeysReport,
};