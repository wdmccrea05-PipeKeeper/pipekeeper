/**
 * i18n Anti-Regression Diagnostics (dev-only)
 * Warns if a rendered string looks like a translation key
 */

const KEY_PATTERN = /^[a-z0-9]+(\.[a-z0-9]+)+$/i;

export function warnIfLooksLikeKey(text, context) {
  if (import.meta?.env?.PROD) return; // Skip in prod
  if (typeof text !== "string") return;
  
  if (KEY_PATTERN.test(text)) {
    console.warn("[i18n-regression] Key leak detected:", { text, context });
  }
}

export function validateNoKeyLeaks(componentName, props) {
  if (import.meta?.env?.PROD) return;
  
  // Check title, label, placeholder, aria-label for key patterns
  const checkProps = ["title", "label", "placeholder", "ariaLabel", "aria-label"];
  
  for (const prop of checkProps) {
    const value = props[prop];
    if (value && typeof value === "string" && KEY_PATTERN.test(value)) {
      console.warn(`[i18n-regression] ${componentName} has key-leak in prop "${prop}":`, value);
    }
  }
}