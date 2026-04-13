/**
 * Currency constants shared across the app.
 * All monetary values are stored in USD (BASE_CURRENCY).
 */

export const BASE_CURRENCY = 'USD';

export const SUPPORTED_CURRENCIES = ['USD', 'GBP', 'EUR', 'CAD', 'AUD'];

export const CURRENCY_LABELS = {
  USD: 'USD ($) – US Dollar',
  GBP: 'GBP (£) – British Pound',
  EUR: 'EUR (€) – Euro',
  CAD: 'CAD ($) – Canadian Dollar',
  AUD: 'AUD ($) – Australian Dollar',
};

/**
 * Approximate fallback rates relative to 1 USD.
 * Used only when no live or cached rates are available.
 */
export const FALLBACK_RATES = {
  USD: 1,
  GBP: 0.79,
  EUR: 0.92,
  AUD: 1.54,
  CAD: 1.37,
};
