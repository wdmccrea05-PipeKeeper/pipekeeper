/**
 * marketProfiles.js
 *
 * User market profile — stores the user's country, region, and preferred
 * display currency so the valuation engine can apply localised pricing.
 *
 * Persisted to localStorage under the key 'pk_market_profile_v1'.
 *
 * Shape:
 *   {
 *     country:  'IE',          // ISO 3166-1 alpha-2 country code
 *     region:   'Dublin',      // Free-text region/city (optional)
 *     currency: 'EUR'          // ISO 4217 currency code
 *   }
 */

import { BASE_CURRENCY, SUPPORTED_CURRENCIES } from '@/lib/currency/currencyConstants';

// ---------------------------------------------------------------------------
// Storage key
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'pk_market_profile_v1';

// ---------------------------------------------------------------------------
// Country → currency defaults
// ---------------------------------------------------------------------------

/**
 * Best-guess default currency for a given ISO country code.
 * Falls back to BASE_CURRENCY (USD) for unknown/unlisted countries.
 * @param {string} countryCode - ISO 3166-1 alpha-2
 * @returns {string}
 */
export function defaultCurrencyForCountry(countryCode) {
  const map = {
    // EUR zone
    AT: 'EUR', BE: 'EUR', CY: 'EUR', EE: 'EUR', FI: 'EUR', FR: 'EUR',
    DE: 'EUR', GR: 'EUR', IE: 'EUR', IT: 'EUR', LV: 'EUR', LT: 'EUR',
    LU: 'EUR', MT: 'EUR', NL: 'EUR', PT: 'EUR', SK: 'EUR', SI: 'EUR', ES: 'EUR',
    // GBP
    GB: 'GBP',
    // CAD
    CA: 'CAD',
    // AUD
    AU: 'AUD',
    // USD
    US: 'USD',
  };
  return map[String(countryCode || '').toUpperCase()] || BASE_CURRENCY;
}

// ---------------------------------------------------------------------------
// Supported countries list (expand as needed)
// ---------------------------------------------------------------------------

export const SUPPORTED_COUNTRIES = [
  { code: 'US', name: 'United States',    currency: 'USD' },
  { code: 'GB', name: 'United Kingdom',   currency: 'GBP' },
  { code: 'IE', name: 'Ireland',          currency: 'EUR' },
  { code: 'DE', name: 'Germany',          currency: 'EUR' },
  { code: 'FR', name: 'France',           currency: 'EUR' },
  { code: 'IT', name: 'Italy',            currency: 'EUR' },
  { code: 'ES', name: 'Spain',            currency: 'EUR' },
  { code: 'NL', name: 'Netherlands',      currency: 'EUR' },
  { code: 'BE', name: 'Belgium',          currency: 'EUR' },
  { code: 'AT', name: 'Austria',          currency: 'EUR' },
  { code: 'CA', name: 'Canada',           currency: 'CAD' },
  { code: 'AU', name: 'Australia',        currency: 'AUD' },
  { code: 'JP', name: 'Japan',            currency: 'USD' },
  { code: 'NZ', name: 'New Zealand',      currency: 'AUD' },
  { code: 'ZA', name: 'South Africa',     currency: 'USD' },
  { code: 'SG', name: 'Singapore',        currency: 'USD' },
];

// ---------------------------------------------------------------------------
// Read / write
// ---------------------------------------------------------------------------

/**
 * Read the stored market profile.
 * Returns null if nothing is stored yet.
 * @returns {{ country: string, region: string, currency: string }|null}
 */
export function getMarketProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.country === 'string') return parsed;
    return null;
  } catch {
    return null;
  }
}

/**
 * Return the market profile or a default (US / USD) if none is stored.
 * @returns {{ country: string, region: string, currency: string }}
 */
export function getEffectiveMarketProfile() {
  return getMarketProfile() || { country: 'US', region: '', currency: BASE_CURRENCY };
}

/**
 * Persist a market profile.
 * @param {{ country?: string, region?: string, currency?: string }} profile
 */
export function saveMarketProfile(profile) {
  const current = getEffectiveMarketProfile();
  const next = {
    country:  String(profile.country  || current.country).toUpperCase(),
    region:   String(profile.region   ?? current.region),
    currency: SUPPORTED_CURRENCIES.includes(profile.currency)
      ? profile.currency
      : current.currency,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Silently ignore storage quota errors
  }
  return next;
}

/**
 * Clear the stored market profile (reverts to default on next read).
 */
export function clearMarketProfile() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silently ignore
  }
}
