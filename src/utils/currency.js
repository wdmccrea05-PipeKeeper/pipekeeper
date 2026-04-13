/**
 * Currency detection, exchange-rate fetching, conversion, and formatting utilities.
 *
 * All monetary values in the database are stored in USD.
 * This module converts them to the user's preferred currency before display.
 *
 * Exchange rates are fetched from https://api.frankfurter.app and cached in
 * localStorage for 4 hours. Static fallback rates are used when offline or
 * when the API is unavailable.
 */

const RATES_CACHE_KEY = "pk_exchange_rates";
const RATES_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

/** Approximate fallback rates relative to 1 USD (updated periodically) */
export const FALLBACK_RATES = {
  USD: 1,
  GBP: 0.79,
  EUR: 0.92,
  AUD: 1.54,
  CAD: 1.37,
};

/** In-memory rate map: { USD: 1, GBP: 0.79, ... } */
let _rates = null;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function readCachedRates() {
  try {
    const raw = localStorage.getItem(RATES_CACHE_KEY);
    if (!raw) return null;
    const { rates, fetchedAt } = JSON.parse(raw);
    if (Date.now() - fetchedAt > RATES_TTL_MS) return null;
    return rates;
  } catch {
    return null;
  }
}

function writeCachedRates(rates) {
  try {
    localStorage.setItem(RATES_CACHE_KEY, JSON.stringify({ rates, fetchedAt: Date.now() }));
  } catch {}
}

function getRates() {
  if (_rates) return _rates;
  const cached = readCachedRates();
  if (cached) {
    _rates = cached;
    return _rates;
  }
  return FALLBACK_RATES;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Detect the appropriate currency code from a BCP-47 locale string.
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
 * Returns the user's preferred currency code.
 * Reads pk_currency from localStorage first; falls back to browser locale.
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
 * Convert a USD amount to the target currency using cached exchange rates.
 * Returns the converted number (not formatted).
 *
 * @param {number} usdAmount  Value in USD
 * @param {string} [currency] Target currency code — defaults to user preference
 * @returns {number}
 */
export function convertFromUSD(usdAmount, currency) {
  const cur = currency || getUserCurrency();
  if (cur === "USD") return Number(usdAmount || 0);
  const rates = getRates();
  const rate = rates[cur] ?? FALLBACK_RATES[cur] ?? 1;
  return Number(usdAmount || 0) * rate;
}

/**
 * Format a USD amount in the user's preferred (or specified) currency,
 * automatically converting the value from USD.
 *
 * @param {number} usdValue   Value stored in USD
 * @param {string} [currency] Override currency code
 * @returns {string}
 */
export function formatMoney(usdValue, currency) {
  const cur = currency || getUserCurrency();
  const converted = convertFromUSD(usdValue, cur);
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: cur,
  }).format(converted);
}

/**
 * Fetch fresh exchange rates from https://api.frankfurter.app and cache them.
 * Call this once at app startup (e.g. in App.jsx useEffect).
 * Safe to call multiple times — skips if a fresh cache already exists.
 */
export async function initExchangeRates() {
  const cached = readCachedRates();
  if (cached) {
    _rates = cached;
    return;
  }
  try {
    const res = await fetch(
      "https://api.frankfurter.app/latest?base=USD&symbols=GBP,EUR,AUD,CAD"
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const rates = { USD: 1, ...data.rates };
    _rates = rates;
    writeCachedRates(rates);
  } catch {
    // Use fallback silently — no error thrown so UI is never blocked
    _rates = { ...FALLBACK_RATES };
  }
}
