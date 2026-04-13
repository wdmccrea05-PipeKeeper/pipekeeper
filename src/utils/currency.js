/**
 * Currency utilities — backward-compatible re-exports.
 *
 * The canonical implementation now lives in src/lib/currency/.
 * This file keeps legacy exports alive for any call-sites that have not yet
 * been migrated.  New code should import directly from the lib modules or use
 * the useCurrency() hook.
 */

export { FALLBACK_RATES } from '@/lib/currency/currencyConstants';
export { getCurrentDisplayCurrency as getUserCurrency } from '@/lib/currency/exchangeRateStore';

import { BASE_CURRENCY, FALLBACK_RATES } from '@/lib/currency/currencyConstants';
import {
  getCachedRates,
  getCurrentDisplayCurrency,
  getEffectiveRates,
  isRatePayloadFresh,
  saveCachedRates,
} from '@/lib/currency/exchangeRateStore';
import { fetchLatestRates } from '@/lib/currency/exchangeRateProvider';
import { convertFromBase } from '@/lib/currency/convertCurrency';
import { formatMoneyFromBase } from '@/lib/currency/formatCurrency';

/**
 * Detect the appropriate currency code from a BCP-47 locale string.
 */
export function getCurrencyFromLocale(locale) {
  if (!locale) return 'USD';
  if (locale.includes('GB')) return 'GBP';
  if (locale.includes('AU')) return 'AUD';
  if (locale.includes('CA')) return 'CAD';
  if (locale.includes('DE') || locale.includes('FR') || locale.includes('ES')) return 'EUR';
  return 'USD';
}

/**
 * Convert a USD amount to the target currency using the latest cached rates.
 * Returns the converted number (not formatted).
 */
export function convertFromUSD(usdAmount, currency) {
  const cur = currency || getCurrentDisplayCurrency();
  return convertFromBase(usdAmount, cur, getEffectiveRates());
}

/**
 * Format a USD amount in the user's preferred (or specified) currency.
 */
export function formatMoney(usdValue, currency) {
  const cur = currency || getCurrentDisplayCurrency();
  return formatMoneyFromBase(usdValue, cur, undefined, getEffectiveRates());
}

/**
 * Initialise exchange rates on app boot.
 * The CurrencyProvider handles this automatically; this shim is kept for
 * call-sites in App.jsx that haven't been removed yet.
 */
export async function initExchangeRates() {
  const cached = getCachedRates();
  if (cached && isRatePayloadFresh(cached)) return;
  try {
    const payload = await fetchLatestRates(BASE_CURRENCY);
    saveCachedRates(payload);
  } catch {
    // Silently fall back to cached or static rates
  }
}
