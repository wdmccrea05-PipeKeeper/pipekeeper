// src/components/utils/safeStorage.js
export function safeGetItem(key, fallback = null) {
  try {
    if (typeof window === "undefined" || !window?.localStorage) return fallback;
    return window.localStorage.getItem(key);
  } catch (e) {
    return fallback;
  }
}

export function safeSetItem(key, value) {
  try {
    if (typeof window === "undefined" || !window?.localStorage) return;
    window.localStorage.setItem(key, value);
  } catch (e) {
    // no-op
  }
}