import React, { useEffect, useMemo, useState } from "react";
import i18n, { normalizeLang } from "@/components/i18n";

const LANGS = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "pt-BR", label: "Português" },
  { code: "nl", label: "Nederlands" },
  { code: "pl", label: "Polski" },
  { code: "ja", label: "日本語" },
  { code: "zh-Hans", label: "中文" },
  { code: "sv", label: "Svenska" },
];

export default function LanguageSwitcher() {
  const [lang, setLang] = useState("en");

  useEffect(() => {
    const stored = normalizeLang(localStorage.getItem("pk_lang"));
    setLang(stored);
    // ensure i18n matches stored on load
    if (i18n.language !== stored) {
      i18n.changeLanguage(stored);
    }
  }, []);

  const options = useMemo(() => LANGS, []);

  const onChange = async (e) => {
    const next = normalizeLang(e.target.value);
    setLang(next);
    localStorage.setItem("pk_lang", next);
    await i18n.changeLanguage(next);
  };

  return (
    <select
      value={lang}
      onChange={onChange}
      className="text-sm bg-transparent border border-white/10 rounded-md px-2 py-1 text-[#E0D8C8] hover:border-white/20 transition-colors"
      aria-label="Language"
      title="Change language"
    >
      {options.map((l) => (
        <option key={l.code} value={l.code} className="bg-[#1a2c42] text-[#E0D8C8]">
          {l.label}
        </option>
      ))}
    </select>
  );
}