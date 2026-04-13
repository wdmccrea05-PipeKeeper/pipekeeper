/**
 * Currency detection and formatting utilities
 */

/**
 * Detect currency from browser/device locale
 */
export function getCurrencyFromLocale(locale) {
  if (!locale) return "USD";
  if (locale.includes("GB")) return "GBP";
  if (locale.includes("AU")) return "AUD";
  if (locale.includes("CA")) return "CAD";
  if (locale.includes("DE") || locale.includes("FR") || locale.includes("ES")) return "EUR";
  return "USD";
}

/**
 * Get user's preferred currency, falling back to browser locale detection
 */
export function getUserCurrency() {
  try {
    const stored = localStorage.getItem("pk_currency");
    if (stored) return stored;
  } catch {}
  const locale = navigator?.language || navigator?.languages?.[0] || "en-US";
  return getCurrencyFromLocale(locale);
}

/**
 * Format a monetary value with the user's preferred or specified currency
 */
export function formatMoney(value, currency) {
  const cur = currency || getUserCurrency();
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: cur,
  }).format(Number(value || 0));
}
