import React, { useState, useEffect } from 'react';
import { translateDOM, getStoredLanguage, SUPPORTED_LANGUAGES } from "@/components/utils/runtimeTranslate";

export default function LanguageSwitcher() {
  const [currentLang, setCurrentLang] = useState(() => getStoredLanguage());
  const [translating, setTranslating] = useState(false);

  const handleChange = async (e) => {
    const newLang = e.target.value;
    setCurrentLang(newLang);
    setTranslating(true);
    
    try {
      await translateDOM(newLang);
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setTranslating(false);
    }
  };

  return (
    <div className="relative">
      <select
        value={currentLang}
        onChange={handleChange}
        disabled={translating}
        className="bg-white/10 text-[#E0D8C8] text-sm rounded-lg px-3 py-1.5 border border-white/20 hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-[#A35C5C]/50 disabled:opacity-50"
      >
        {SUPPORTED_LANGUAGES.map(lang => (
          <option key={lang.code} value={lang.code} className="bg-[#1A2B3A] text-[#E0D8C8]">
            {lang.label}
          </option>
        ))}
      </select>
      {translating && (
        <div className="absolute top-full mt-1 left-0 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          Translating...
        </div>
      )}
    </div>
  );
}