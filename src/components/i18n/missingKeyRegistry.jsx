// src/components/i18n/missingKeyRegistry.js
const STORE_KEY = "__PK_MISSING_I18N__";

export function recordMissingKey(lang, key, where) {
  try {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    data[lang] = data[lang] || {};
    data[lang][key] = data[lang][key] || [];
    if (where && !data[lang][key].includes(where)) {
      data[lang][key].push(where);
    }
    window.localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch {}
}

export function getMissingKeys() {
  try {
    if (typeof window === "undefined") return {};
    const raw = window.localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function clearMissingKeys() {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORE_KEY);
  } catch {}
}

export function downloadMissingKeysReport() {
  try {
    const data = getMissingKeys();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pipekeeper-missing-i18n-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  } catch (e) {
    console.error("Failed to download i18n report:", e);
  }
}