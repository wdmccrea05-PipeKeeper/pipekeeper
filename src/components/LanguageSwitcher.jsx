import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "pt-BR", label: "Português (Brasil)" },
  { code: "nl", label: "Nederlands" },
  { code: "pl", label: "Polski" },
  { code: "ja", label: "日本語" },
  { code: "zh-Hans", label: "简体中文" },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [selectedLang, setSelectedLang] = useState(i18n.language);

  useEffect(() => {
    setSelectedLang(i18n.language);
  }, [i18n.language]);

  const handleChange = (e) => {
    const newLang = e.target.value;
    setSelectedLang(newLang);
    i18n.changeLanguage(newLang);
  };

  return (
    <select
      value={selectedLang}
      onChange={handleChange}
      className="px-3 py-2 rounded-lg bg-[#243548] text-[#E0D8C8] border border-[#A35C5C]/30 text-sm hover:border-[#A35C5C]/60 transition-all"
    >
      {SUPPORTED_LANGUAGES.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.label}
        </option>
      ))}
    </select>
  );
}