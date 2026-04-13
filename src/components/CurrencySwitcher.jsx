import React, { useState } from 'react';

const LS_KEY = 'pk_currency';

const CURRENCIES = ['USD','EUR','GBP','CAD','AUD','JPY','CHF','SEK','NOK','DKK'];

export default function CurrencySwitcher({ className = '' }) {
  const [currency, setCurrency] = useState(() => {
    try { return localStorage.getItem(LS_KEY) || 'USD'; } catch { return 'USD'; }
  });

  const handleChange = (e) => {
    const val = e.target.value;
    setCurrency(val);
    try {
      localStorage.setItem(LS_KEY, val);
      window.dispatchEvent(new CustomEvent('pk:currency-changed', { detail: val }));
    } catch {}
  };

  return (
    <select
      value={currency}
      onChange={handleChange}
      className={`rounded-xl px-2 py-1.5 text-sm font-medium outline-none cursor-pointer ${className}`}
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(180,140,75,0.28)',
        color: '#E0D8C8',
        minWidth: 64,
        maxWidth: 80,
      }}
    >
      {CURRENCIES.map((c) => (
        <option key={c} value={c} style={{ background: '#1d1511', color: '#E0D8C8' }}>
          {c}
        </option>
      ))}
    </select>
  );
}