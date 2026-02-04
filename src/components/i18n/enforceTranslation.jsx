function isProbablyKey(value) {
  return typeof value === "string" && value.includes(".") && !value.includes(" ");
}

export function enforceTranslation(key, resolvedValue, language = "en", component = "unknown") {
  // Guard: if someone passed args reversed (resolvedValue, key)
  if (isProbablyKey(resolvedValue) && !isProbablyKey(key)) {
    const tmp = key;
    key = resolvedValue;
    resolvedValue = tmp;
  }

  const isEnglish = language === "en" || language.startsWith("en-");
  const isProd = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.PROD) || false;

  const urlParams =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const debugParam = urlParams.get("i18nDebug") === "1";
  const debugLocal =
    typeof localStorage !== "undefined" && localStorage.getItem("i18nDebug") === "1";
  const debugEnabled = debugParam || debugLocal;

  // If missing, i18next often returns the key itself
  const isMissing = resolvedValue === key || resolvedValue == null;

  // Never show markers in prod. Just fall back to the resolvedValue.
  if (isProd) {
    if (isMissing) return key;
    return resolvedValue;
  }

  // In dev, show markers only if debug is enabled, AND non-English locale.
  if (!debugEnabled || isEnglish) {
    return isMissing ? key : resolvedValue;
  }

  if (isMissing) {
    console.warn(`[i18n] Missing key: "${key}" in ${language} (${component})`);
    return `🚫 ${key}`;
  }

  if (isProbablyKey(resolvedValue)) {
    console.warn(`[i18n] Key leak: "${resolvedValue}" in ${language} (${component})`);
    return `🚫 ${resolvedValue}`;
  }

  return resolvedValue;
}