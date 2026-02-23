const missingKeyRegistry = {};

function registerMissingKey(key) {
    if (!missingKeyRegistry[key]) {
        missingKeyRegistry[key] = true;
    }
}

function recordMissingKey(locale, key, where) {
    const entry = `${locale}:${key}`;
    if (!missingKeyRegistry[entry]) {
        missingKeyRegistry[entry] = { locale, key, where };
    }
}

function clearMissingKeys() {
    Object.keys(missingKeyRegistry).forEach(key => {
        delete missingKeyRegistry[key];
    });
}

function downloadMissingKeysReport() {
    const entries = Object.values(missingKeyRegistry).filter(v => typeof v === "object");
    const report = JSON.stringify(entries, null, 2);
    try {
        const blob = new Blob([report], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "missing-keys-report.json";
        a.click();
        URL.revokeObjectURL(url);
    } catch {
        // ignore
    }
}

export { missingKeyRegistry, registerMissingKey, recordMissingKey, downloadMissingKeysReport, clearMissingKeys };