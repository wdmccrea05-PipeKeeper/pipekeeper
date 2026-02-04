// src/components/i18n/enforceTranslation.jsx
const isDebug = () => {
  try {
    if (typeof window === "undefined") return false;
    const url = new URL(window.location.href);
    return url.searchParams.get("i18nDebug") === "1";
  } catch {
    return false;
  }
};

function isProbablyKey(value) {
  if (typeof value !== "string") return false;
  if (value.length > 100) return false;
  if (value.includes(".") && !value.includes(" ") && value.length < 60) return true;
  return false;
}

export function enforceTranslation(key, resolvedValue, language, componentInfo) {
  // Guard: if someone passed args reversed (resolvedValue, key)
  if (isProbablyKey(resolvedValue) && !isProbablyKey(key)) {
    const tmp = key;
    key = resolvedValue;
    resolvedValue = tmp;
  }

  const debug = isDebug();
  const isProd = import.meta?.env?.PROD === true;

  const looksMissing =
    resolvedValue === undefined ||
    resolvedValue === null ||
    resolvedValue === "" ||
    resolvedValue === key ||
    (typeof resolvedValue === "string" && resolvedValue.includes("{{"));

  // In debug: show explicit markers so you can hunt them down.
  if (debug && looksMissing) {
    return `🚫 ${key}`;
  }

  // In production: NEVER return empty.  Fall back to key (or English via i18next fallbackLng).
  // Returning "" is what makes whole sections disappear.
  if (isProd && looksMissing) {
    return key; // i18next fallbackLng should resolve if EN exists; otherwise at least visible.
  }

  // In dev non-debug: avoid key spam if possible, but never blank UI.
  if (!isProd && looksMissing) {
    return key;
  }

  return resolvedValue;
}