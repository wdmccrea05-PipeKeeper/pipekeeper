/**
 * Currency conversion utilities.
 *
 * All stored values are assumed to be in BASE_CURRENCY (USD).
 * Conversion is done only at render time — stored data is never mutated.
 */

import { BASE_CURRENCY, FALLBACK_RATES } from './currencyConstants';

/**
 * Convert an amount from one currency to another using a rate payload.
 *
 * @param {number|null|undefined} amount
 * @param {string} fromCurrency  Source currency code
 * @param {string} toCurrency    Target currency code
 * @param {{base: string, rates: Object}} ratePayload
 * @returns {number}
 */
export function convertAmount(amount, fromCurrency, toCurrency, ratePayload) {
  const num = Number(amount);
  if (!Number.isFinite(num)) return 0;
  if (fromCurrency === toCurrency) return num;

  const rates = ratePayload?.rates || FALLBACK_RATES;

  // Convert to base first, then to target
  const fromRate = rates[fromCurrency] ?? FALLBACK_RATES[fromCurrency] ?? 1;
  const toRate = rates[toCurrency] ?? FALLBACK_RATES[toCurrency] ?? 1;

  if (!fromRate || !toRate) return num;

  // If ratePayload.base === fromCurrency we can skip the division
  if ((ratePayload?.base || BASE_CURRENCY) === fromCurrency) {
    return num * toRate;
  }

  // General cross-currency conversion via base
  return (num / fromRate) * toRate;
}

/**
 * Convert an amount from the app base currency (USD) to the target currency.
 *
 * @param {number|null|undefined} amount  Value in BASE_CURRENCY
 * @param {string} toCurrency
 * @param {{base: string, rates: Object}} ratePayload
 * @param {string} baseCurrency  Override if your base is not USD
 * @returns {number}
 */
export function convertFromBase(amount, toCurrency, ratePayload, baseCurrency = BASE_CURRENCY) {
  return convertAmount(amount, baseCurrency, toCurrency, ratePayload);
}

/**
 * Safe wrapper — always returns a number, never throws.
 * Returns { value, ok } where ok=false if a rate was missing.
 *
 * @param {number|null|undefined} amount
 * @param {string} fromCurrency
 * @param {string} toCurrency
 * @param {{base: string, rates: Object}} ratePayload
 * @returns {{ value: number, ok: boolean }}
 */
/**
 * Alias for convertAmount — allows callers to import by either name.
 */
export const convertCurrencyAmount = convertAmount;

export function safeConvertAmount(amount, fromCurrency, toCurrency, ratePayload) {
  try {
    const num = Number(amount);
    if (!Number.isFinite(num)) return { value: 0, ok: false };

    const rates = ratePayload?.rates || FALLBACK_RATES;
    const hasFrom = fromCurrency in rates || fromCurrency in FALLBACK_RATES;
    const hasTo = toCurrency in rates || toCurrency in FALLBACK_RATES;

    const value = convertAmount(amount, fromCurrency, toCurrency, ratePayload);
    return { value, ok: hasFrom && hasTo };
  } catch {
    return { value: Number(amount) || 0, ok: false };
  }
}
