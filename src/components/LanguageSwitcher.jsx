import React from 'react';
import { SUPPORTED_LANGUAGES } from "@/components/text";

export default function LanguageSwitcher({ currentLang, onLanguageChange }) {
  return (
    <select
      value={currentLang}
      onChange={(e) => onLanguageChange(e.target.value)}
      className="bg-white/10 text-[#E0D8C8] text-sm rounded-lg px-3 py-1.5 border border-white/20 hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-[#A35C5C]/50"
    >
      {SUPPORTED_LANGUAGES.map(lang => (
        <option key={lang.code} value={lang.code} className="bg-[#1A2B3A] text-[#E0D8C8]">
          {lang.label}
        </option>
      ))}
    </select>
  );
}