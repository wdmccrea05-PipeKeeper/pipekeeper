/**
 * Exchange rate provider.
 *
 * Default source: Frankfurter (https://api.frankfurter.app) — a free, open-source
 * API that proxies ECB (European Central Bank) reference rates published once per
 * working day around 16:00 CET.
 *
 * ECB rates are EUR-based; Frankfurter normalises them into any requested base
 * currency, so we request base=USD to get a USD-normalised payload directly.
 */

import { BASE_CURRENCY, SUPPORTED_CURRENCIES, FALLBACK_RATES } from './currencyConstants';

const PROVIDER_URL = 'https://api.frankfurter.app';

/**
 * Fetch the latest exchange rates from the ECB-backed Frankfurter API.
 *
 * @param {string} baseCurrency - The base currency for the returned rates.
 * @returns {Promise<{base: string, rates: Object, asOf: string, provider: string}>}
 */
export async function fetchLatestRates(baseCurrency = BASE_CURRENCY) {
  const symbols = SUPPORTED_CURRENCIES.filter((c) => c !== baseCurrency).join(',');
  const url = `${PROVIDER_URL}/latest?base=${baseCurrency}&symbols=${symbols}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`ECB provider returned HTTP ${res.status}`);

  const raw = await res.json();
  return normalizeRatesFromProvider(raw, baseCurrency);
}

/**
 * Fetch historical exchange rates for a specific date (ISO date string, e.g. "2026-04-13").
 *
 * @param {string} date - ISO date string (YYYY-MM-DD)
 * @param {string} baseCurrency
 * @returns {Promise<{base: string, rates: Object, asOf: string, provider: string}>}
 */
export async function fetchHistoricalRates(date, baseCurrency = BASE_CURRENCY) {
  const symbols = SUPPORTED_CURRENCIES.filter((c) => c !== baseCurrency).join(',');
  const url = `${PROVIDER_URL}/${date}?base=${baseCurrency}&symbols=${symbols}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`ECB provider returned HTTP ${res.status} for ${date}`);

  const raw = await res.json();
  return normalizeRatesFromProvider(raw, baseCurrency);
}

/**
 * Normalize the raw Frankfurter/ECB response into the app's canonical rate shape.
 *
 * @param {Object} raw - Raw API response object
 * @param {string} baseCurrency
 * @returns {{base: string, rates: Object, asOf: string, provider: string}}
 */
export function normalizeRatesFromProvider(raw, baseCurrency = BASE_CURRENCY) {
  const rates = { [baseCurrency]: 1, ...(raw.rates || {}) };

  // Ensure all supported currencies are present; fall back to static rates.
  for (const code of SUPPORTED_CURRENCIES) {
    if (rates[code] == null && FALLBACK_RATES[code] != null) {
      rates[code] = FALLBACK_RATES[code];
    }
  }

  return {
    base: baseCurrency,
    rates,
    asOf: raw.date || new Date().toISOString().slice(0, 10),
    provider: 'ECB',
  };
}
