import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrency } from "@/lib/currency/useCurrency";
import { CURRENCY_LABELS, SUPPORTED_CURRENCIES } from "@/lib/currency/currencyConstants";

export default function CurrencyPreferenceSetting() {
  const { selectedCurrency, setSelectedCurrency } = useCurrency();

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[#E0D8C8]">Currency Preference</label>
      <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
        <SelectTrigger className="w-full bg-[#111]/60 border-[rgba(212,175,55,0.2)] text-[#E0D8C8]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#111] border-[rgba(212,175,55,0.2)]">
          {SUPPORTED_CURRENCIES.map((code) => (
            <SelectItem key={code} value={code} className="text-[#E0D8C8] focus:bg-[rgba(212,175,55,0.1)]">
              {CURRENCY_LABELS[code]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-[#E0D8C8]/50">
        Controls how monetary values are displayed throughout the app.
      </p>
    </div>
  );
}
