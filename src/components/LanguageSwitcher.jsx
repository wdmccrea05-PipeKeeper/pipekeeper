import React, { useMemo } from "react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import i18n from "@/components/i18n";

const LANGS = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
  { code: "nl", label: "Nederlands" },
  { code: "pl", label: "Polski" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
  { code: "sv", label: "Svenska" },
];

export default function LanguageSwitcher({ className = "" }) {
  const { i18n } = useTranslation();

  const current = useMemo(() => {
    const raw = (i18n.language || "en").replace("_", "-");
    // Normalize variants to base codes
    if (raw.startsWith("pt")) return "pt";
    if (raw.startsWith("zh")) return "zh";
    if (LANGS.some((l) => l.code === raw)) return raw;
    const base = raw.split("-")[0];
    return LANGS.some((l) => l.code === base) ? base : "en";
  }, [i18n.language]);

  const setLang = async (lng) => {
    try {
      await i18n.changeLanguage(lng);
      try {
        localStorage.setItem("pk_lang", lng);
        // Force entitlement refresh after language change
        localStorage.setItem("pk_force_entitlement_refresh", Date.now().toString());
      } catch {}
    } catch (error) {
      console.error('[LanguageSwitcher] Failed to change language:', error);
      // Fallback to English if language change fails
      try {
        await i18n.changeLanguage('en');
        localStorage.setItem("pk_lang", 'en');
      } catch {}
    }
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <select
        value={current}
        onChange={(e) => setLang(e.target.value)}
        aria-label="Language"
        className="
          h-9
          rounded-lg
          px-3
          text-sm
          bg-black/40
          border border-white/10
          text-[#e8d5b7]
          shadow-sm
          outline-none
          hover:bg-black/50
          focus:ring-2 focus:ring-[#e8d5b7]/30
          focus:border-[#e8d5b7]/30
          transition
        "
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code} className="bg-[#0b0b0b] text-[#e8d5b7]">
            {l.label}
          </option>
        ))}
      </select>
      <div className="text-[10px] text-[#e8d5b7]/50 mt-1">Current: {i18n.language}</div>
    </div>
  );
}