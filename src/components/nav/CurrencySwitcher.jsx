import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCurrency } from '@/lib/currency/useCurrency';
import { CURRENCY_LABELS, SUPPORTED_CURRENCIES } from '@/lib/currency/currencyConstants';

/**
 * Nav-bar currency switcher.
 * Reads and updates the shared CurrencyContext so all value fields re-render
 * immediately when the user picks a new currency.
 */
export default function CurrencySwitcher({ className = '' }) {
  const { selectedCurrency, setSelectedCurrency } = useCurrency();

  return (
    <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
      <SelectTrigger
        className={`h-9 min-w-[90px] sm:min-w-[110px]
          bg-[rgba(28,21,16,0.9)]
          text-[#F5F1E7]
          border border-[rgba(180,140,75,0.35)]
          rounded-lg
          px-3
          focus:ring-1 focus:ring-[#D4A574]
          ${className}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-[#111] border-[rgba(212,175,55,0.2)]">
        {SUPPORTED_CURRENCIES.map((code) => (
          <SelectItem
            key={code}
            value={code}
            className="text-[#E0D8C8] focus:bg-[rgba(212,175,55,0.1)]"
          >
            {CURRENCY_LABELS[code]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
