/**
 * Exchange rate store.
 *
 * Persists exchange rates and the user's selected display currency to localStorage.
 * Provides freshness checks (24-hour TTL aligned with ECB's daily publishing cadence).
 */

import { BASE_CURRENCY, FALLBACK_RATES, SUPPORTED_CURRENCIES } from './currencyConstants';

const RATES_KEY = 'pk_exchange_rates_v2';
const CURRENCY_KEY = 'pk_currency';
const STALE_MS = 24 * 60 * 60 * 1000; // 24 hours

// ---------------------------------------------------------------------------
// Rate cache
// ---------------------------------------------------------------------------

/**
 * Load the most recently saved rate payload from localStorage.
 * Returns null if nothing has been stored yet.
 *
 * @returns {{base: string, rates: Object, asOf: string, provider: string, last_refreshed_at: number}|null}
 */
export function getCachedRates() {
  try {
    const raw = localStorage.getItem(RATES_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    // Basic validity check
    if (!payload || !payload.rates || !payload.base) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Persist a rate payload returned by the provider.
 * Stamps `last_refreshed_at` with the current epoch ms.
 *
 * @param {{base: string, rates: Object, asOf: string, provider: string}} ratePayload
 */
export function saveCachedRates(ratePayload) {
  try {
    const stamped = { ...ratePayload, last_refreshed_at: Date.now() };
    localStorage.setItem(RATES_KEY, JSON.stringify(stamped));
  } catch {
    // Ignore storage errors (e.g. private browsing quota)
  }
}

/**
 * Returns true if the cached payload is still within the 24-hour freshness window.
 *
 * @param {{last_refreshed_at?: number}|null} ratePayload
 * @returns {boolean}
 */
export function isRatePayloadFresh(ratePayload) {
  if (!ratePayload || !ratePayload.last_refreshed_at) return false;
  return Date.now() - ratePayload.last_refreshed_at < STALE_MS;
}

// ---------------------------------------------------------------------------
// Display currency preference
// ---------------------------------------------------------------------------

/**
 * Read the user's currently selected display currency from localStorage.
 * Falls back to BASE_CURRENCY if nothing is stored.
 *
 * @returns {string}
 */
export function getCurrentDisplayCurrency() {
  try {
    const stored = localStorage.getItem(CURRENCY_KEY);
    if (stored && SUPPORTED_CURRENCIES.includes(stored)) return stored;
  } catch {
    // ignore
  }
  return BASE_CURRENCY;
}

/**
 * Persist the user's chosen display currency.
 *
 * @param {string} currencyCode
 */
export function setCurrentDisplayCurrency(currencyCode) {
  try {
    localStorage.setItem(CURRENCY_KEY, currencyCode);
    // Notify any legacy listeners that rely on the storage event.
    window.dispatchEvent(new Event('storage'));
  } catch {
    // ignore
  }
}

/**
 * Return a safe rate payload for rendering: either the cached payload or
 * a synthetic fallback built from FALLBACK_RATES so UI never blocks.
 *
 * @returns {{base: string, rates: Object, asOf: string, provider: string, last_refreshed_at: number}}
 */
export function getEffectiveRates() {
  const cached = getCachedRates();
  if (cached) return cached;
  return {
    base: BASE_CURRENCY,
    rates: { ...FALLBACK_RATES },
    asOf: null,
    provider: 'fallback',
    last_refreshed_at: 0,
  };
}
