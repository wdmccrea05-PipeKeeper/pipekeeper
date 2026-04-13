import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getUserCurrency } from "@/utils/currency";

const CURRENCIES = [
  { code: "USD", label: "USD ($) – US Dollar" },
  { code: "GBP", label: "GBP (£) – British Pound" },
  { code: "EUR", label: "EUR (€) – Euro" },
  { code: "AUD", label: "AUD ($) – Australian Dollar" },
  { code: "CAD", label: "CAD ($) – Canadian Dollar" },
];

export default function CurrencyPreferenceSetting() {
  const [value, setValue] = React.useState(() => getUserCurrency());

  const handleChange = (cur) => {
    setValue(cur);
    try { localStorage.setItem("pk_currency", cur); } catch {}
    window.dispatchEvent(new Event("storage"));
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[#E0D8C8]">Currency Preference</label>
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger className="w-full bg-[#111]/60 border-[rgba(212,175,55,0.2)] text-[#E0D8C8]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#111] border-[rgba(212,175,55,0.2)]">
          {CURRENCIES.map((c) => (
            <SelectItem key={c.code} value={c.code} className="text-[#E0D8C8] focus:bg-[rgba(212,175,55,0.1)]">
              {c.label}
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
