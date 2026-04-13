/**
 * useCurrency — shared React hook and context provider for currency state.
 *
 * Wrap the app once with <CurrencyProvider>.
 * Any component can then call useCurrency() to get reactive access to:
 *   - selectedCurrency      current display currency code
 *   - setSelectedCurrency   change display currency (persists to localStorage)
 *   - rates                 current cached rate payload (or null while loading)
 *   - isRatesLoading        true while a network fetch is in progress
 *   - isRatesStale          true if cached rates are older than 24 hours
 *   - convertFromBase(amount, toCurrency?)  convert a USD value
 *   - formatFromBase(amount, toCurrency?)   format a USD value as currency string
 *   - refreshRates()        manually trigger a rate refresh
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { fetchLatestRates } from './exchangeRateProvider';
import {
  getCachedRates,
  getCurrentDisplayCurrency,
  getEffectiveRates,
  isRatePayloadFresh,
  saveCachedRates,
  setCurrentDisplayCurrency,
} from './exchangeRateStore';
import { convertFromBase as convertFromBaseUtil } from './convertCurrency';
import { formatMoneyFromBase } from './formatCurrency';
import { FALLBACK_RATES, BASE_CURRENCY } from './currencyConstants';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const CurrencyContext = createContext(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function CurrencyProvider({ children }) {
  const [selectedCurrency, setSelectedCurrencyState] = useState(
    () => getCurrentDisplayCurrency()
  );
  const [rates, setRates] = useState(() => getCachedRates());
  const [isRatesLoading, setIsRatesLoading] = useState(false);
  const [isRatesStale, setIsRatesStale] = useState(
    () => !isRatePayloadFresh(getCachedRates())
  );

  const fetchingRef = useRef(false);

  // -------------------------------------------------------------------------
  // Rate refresh
  // -------------------------------------------------------------------------

  const refreshRates = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setIsRatesLoading(true);
    try {
      const payload = await fetchLatestRates(BASE_CURRENCY);
      saveCachedRates(payload);
      setRates(payload);
      setIsRatesStale(false);
    } catch (err) {
      // Keep rendering with stale/fallback data — never block the UI
      console.warn('[CurrencyProvider] Rate refresh failed:', err?.message);
      const cached = getCachedRates();
      if (cached) {
        setRates(cached);
        setIsRatesStale(true);
      }
    } finally {
      setIsRatesLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  // -------------------------------------------------------------------------
  // Boot + scheduled refresh + focus refresh
  // -------------------------------------------------------------------------

  useEffect(() => {
    const cached = getCachedRates();

    if (!cached) {
      // No rates at all — fetch immediately
      refreshRates();
    } else if (!isRatePayloadFresh(cached)) {
      // Stale — fetch in background, keep rendering with cached data
      setIsRatesStale(true);
      refreshRates();
    }

    // Refresh when window regains focus and rates are stale
    const onFocus = () => {
      const current = getCachedRates();
      if (!isRatePayloadFresh(current)) {
        refreshRates();
      }
    };
    window.addEventListener('focus', onFocus);

    // Scheduled refresh every 24 hours
    const timer = setInterval(() => refreshRates(), 24 * 60 * 60 * 1000);

    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(timer);
    };
  }, []); // intentionally empty — this effect runs once on mount to initialize

  // -------------------------------------------------------------------------
  // Currency selection
  // -------------------------------------------------------------------------

  const setSelectedCurrency = useCallback((code) => {
    setSelectedCurrencyState(code);
    setCurrentDisplayCurrency(code);
    // Do NOT re-fetch rates on currency change — just re-render with cached data
  }, []);

  // -------------------------------------------------------------------------
  // Derived helpers (memoised so they only change when currency/rates change)
  // -------------------------------------------------------------------------

  const effectiveRates = rates || getEffectiveRates();

  const convertFromBase = useCallback(
    (amount, toCurrency) => {
      const cur = toCurrency || selectedCurrency;
      return convertFromBaseUtil(amount, cur, effectiveRates);
    },
    [selectedCurrency, effectiveRates]
  );

  const formatFromBase = useCallback(
    (amount, toCurrency) => {
      const cur = toCurrency || selectedCurrency;
      return formatMoneyFromBase(amount, cur, undefined, effectiveRates);
    },
    [selectedCurrency, effectiveRates]
  );

  // -------------------------------------------------------------------------
  // Context value
  // -------------------------------------------------------------------------

  const value = {
    selectedCurrency,
    setSelectedCurrency,
    rates: effectiveRates,
    isRatesLoading,
    isRatesStale,
    convertFromBase,
    formatFromBase,
    refreshRates,
  };

  return React.createElement(CurrencyContext.Provider, { value }, children);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns the shared currency context.
 * Must be used inside <CurrencyProvider>.
 */
export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    // Outside provider — return a safe synchronous fallback so components
    // don't crash in unit tests or isolated renders.
    const fallbackRates = getEffectiveRates();
    const currency = getCurrentDisplayCurrency();
    return {
      selectedCurrency: currency,
      setSelectedCurrency: setCurrentDisplayCurrency,
      rates: fallbackRates,
      isRatesLoading: false,
      isRatesStale: true,
      convertFromBase: (amount, toCurrency) =>
        convertFromBaseUtil(amount, toCurrency || currency, fallbackRates),
      formatFromBase: (amount, toCurrency) =>
        formatMoneyFromBase(amount, toCurrency || currency, undefined, fallbackRates),
      refreshRates: async () => {},
    };
  }
  return ctx;
}
