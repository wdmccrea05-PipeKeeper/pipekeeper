/**
 * Currency utilities — canonical wrapper over the shared currency stack.
 *
 * All active formatting and conversion logic now lives in src/lib/currency/.
 * This file is the single entry-point for legacy and new call-sites.
 *
 * New code should use the useCurrency() hook directly.
 */

import { convertAmount, convertFromBase } from '@/lib/currency/convertCurrency';
import {
  formatMoneyFromBase,
  formatMoney as _formatMoney,
} from '@/lib/currency/formatCurrency';
import { getEffectiveRates, getCurrentDisplayCurrency } from '@/lib/currency/exchangeRateStore';
import { FALLBACK_RATES } from '@/lib/currency/currencyConstants';

export { FALLBACK_RATES };

export function getCurrentCurrency() {
  return getCurrentDisplayCurrency();
}

export function convertCurrency(value, fromCurrency = 'USD', toCurrency = getCurrentDisplayCurrency()) {
  const rates = getEffectiveRates();
  return convertAmount(value, fromCurrency, toCurrency, rates);
}

export function formatCurrencyAmount(value, options = {}) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';

  const currency = options.currency || getCurrentDisplayCurrency();
  const locale = options.locale;
  const baseCurrency = options.baseCurrency || 'USD';
  const rates = getEffectiveRates();

  if (options.fromCurrency && options.fromCurrency !== baseCurrency) {
    const converted = convertAmount(Number(value), options.fromCurrency, currency, rates);
    return _formatMoney(converted, currency, locale);
  }

  return formatMoneyFromBase(Number(value), currency, locale, rates, baseCurrency);
}

/**
 * Format a USD amount in the user's preferred (or specified) currency.
 * @deprecated Use useCurrency().formatFromBase() in React components.
 */
export function formatMoney(usdValue, currency) {
  const cur = currency || getCurrentDisplayCurrency();
  return formatMoneyFromBase(usdValue, cur, undefined, getEffectiveRates());
}

/**
 * Convert a USD amount to the target currency.
 */
export function convertFromUSD(usdAmount, currency) {
  const cur = currency || getCurrentDisplayCurrency();
  return convertFromBase(usdAmount, cur, getEffectiveRates());
}
