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

function humanizeKey(keyStr) {
  const last = keyStr.split(".").pop() || keyStr;
  return last
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (s) => s.toUpperCase());
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
    return `🚫 ${humanizeKey(key)}`;
  }

  // In production: NEVER return empty or raw key. Show human readable fallback.
  if (looksMissing) {
    return humanizeKey(key);
  }

  return resolvedValue;
}