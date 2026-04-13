/**
 * Currency formatting utilities.
 *
 * Pure functions — not reactive. Components that need reactive re-renders
 * when the user changes currency should use the useCurrency() hook instead.
 */

import { BASE_CURRENCY } from './currencyConstants';
import { convertFromBase } from './convertCurrency';

/**
 * Format a pre-converted amount as a locale-aware currency string.
 *
 * @param {number|null|undefined} amount   Already-converted value
 * @param {string} currencyCode            ISO 4217 code (e.g. "GBP")
 * @param {string} [locale]                BCP-47 locale; defaults to browser locale
 * @returns {string}
 */
export function formatMoney(amount, currencyCode, locale) {
  const num = Number(amount);
  if (!Number.isFinite(num)) return '—';

  const code = currencyCode || BASE_CURRENCY;
  const loc = locale || undefined; // undefined = browser default

  try {
    return new Intl.NumberFormat(loc, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    // Fallback if the currency code is unrecognised
    return `${code} ${num.toFixed(0)}`;
  }
}

/**
 * Convert from the app base currency (USD) then format.
 *
 * This is the primary utility for displaying stored monetary values.
 *
 * @param {number|null|undefined} amount       Value stored in baseCurrency
 * @param {string} currencyCode                Display currency
 * @param {string} [locale]                    BCP-47 locale
 * @param {{base: string, rates: Object}} ratePayload  Current rate payload
 * @param {string} [baseCurrency]              Defaults to USD
 * @returns {string}
 */
export function formatMoneyFromBase(amount, currencyCode, locale, ratePayload, baseCurrency = BASE_CURRENCY) {
  const converted = convertFromBase(amount, currencyCode, ratePayload, baseCurrency);
  return formatMoney(converted, currencyCode, locale);
}
