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
  const looksMissing = 
    !resolvedValue ||
    resolvedValue === key ||
    (typeof resolvedValue === "string" && resolvedValue.includes("🚫")) ||
    (typeof resolvedValue === "string" && resolvedValue.includes("undefined"));

  // In production: fallback to English instead of leaking keys
  if (isProd) {
    if (looksMissing) {
      // Try to get English fallback
      try {
        const i18nInstance = typeof window !== "undefined" && window.i18n;
        if (i18nInstance) {
          const enFallback = i18nInstance.t(key, { lng: "en" });
          if (enFallback && enFallback !== key) return enFallback;
        }
      } catch (e) {
        // Ignore fallback errors
      }
      return ""; // last resort: blank (better than raw keys)
    }
    return resolvedValue;
  }

  // In dev, show markers only if debug is enabled, AND non-English locale.
  if (!debugEnabled || isEnglish) {
    return looksMissing ? key : resolvedValue;
  }

  if (looksMissing) {
    console.warn(`[i18n] Missing key: "${key}" in ${language} (${component})`);
    return `🚫 ${key}`;
  }

  if (isProbablyKey(resolvedValue)) {
    console.warn(`[i18n] Key leak: "${resolvedValue}" in ${language} (${component})`);
    return `🚫 ${resolvedValue}`;
  }

  return resolvedValue;
}