/**
 * useValuation.js
 *
 * React hook that provides a complete multi-layer valuation snapshot for a
 * single item, integrated with the live currency system.
 *
 * Usage:
 *   const { valuation, formatValue, isLoading } = useValuation(item, 'bottle');
 *
 * Returns:
 *   valuation         — full buildValuationRecord() output (memo-cached)
 *   formatValue(v)    — formats a USD base value in the user's display currency
 *   convertValue(v)   — converts a USD base value to the user's display currency
 *   selectedCurrency  — user's current display currency code
 *   marketProfile     — user's market profile (country, region, currency)
 *   setMarketProfile  — function to update and persist the market profile
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCurrency } from '@/lib/currency/useCurrency';
import { getEffectiveMarketProfile, saveMarketProfile } from './marketProfiles';
import { buildValuationRecord } from './valuationEngine';

/**
 * @param {Object|null}  item       - Raw item record
 * @param {'bottle'|'blend'|'tobacco'|'pipe'} itemType
 * @param {Object}       [options]
 * @param {Object}       [options.marketProfileOverride] - Override market profile for this call
 */
export function useValuation(item, itemType, options = {}) {
  const { formatFromBase, convertFromBase, selectedCurrency } = useCurrency();

  // Market profile is stored in localStorage; local state keeps it reactive
  const [marketProfile, setMarketProfileState] = useState(() => getEffectiveMarketProfile());

  // Allow external override (e.g. preview mode in settings)
  const effectiveProfile = options.marketProfileOverride || marketProfile;

  // Persist + update local state together
  const setMarketProfile = useCallback((profile) => {
    const saved = saveMarketProfile(profile);
    setMarketProfileState(saved);
  }, []);

  // Sync state if storage changes externally (e.g. another tab)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'pk_market_profile_v1') {
        setMarketProfileState(getEffectiveMarketProfile());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // ---------------------------------------------------------------------------
  // Build valuation record — memoised so it only recomputes when item or
  // profile changes.
  // ---------------------------------------------------------------------------

  const valuation = useMemo(() => {
    if (!item) return null;
    return buildValuationRecord(item, itemType, effectiveProfile);
  }, [item, itemType, effectiveProfile]);

  // ---------------------------------------------------------------------------
  // Currency helpers (reactive to user's display currency)
  // ---------------------------------------------------------------------------

  const formatValue  = useCallback((usdAmount) => formatFromBase(usdAmount), [formatFromBase]);
  const convertValue = useCallback((usdAmount) => convertFromBase(usdAmount), [convertFromBase]);

  return {
    valuation,
    formatValue,
    convertValue,
    selectedCurrency,
    marketProfile,
    setMarketProfile,
  };
}
