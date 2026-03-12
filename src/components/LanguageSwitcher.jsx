import React, { useMemo } from "react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { SUPPORTED_LANGS } from "@/components/i18n/index";

export default function LanguageSwitcher({ className = "" }) {
  const { t, lang } = useTranslation();

  const current = useMemo(() => {
    const raw = (lang || "en").trim();
    if (SUPPORTED_LANGS.some((l) => l.code === raw)) return raw;
    return "en";
  }, [lang]);

  const setLang = (code) => {
    try {
      localStorage.setItem("pk_lang", code);
      window.location.reload();
    } catch (error) {
      console.error("[LanguageSwitcher] Failed to change language:", error);
    }
  };

  return (
    <select
      value={current}
      onChange={(e) => setLang(e.target.value)}
      className={
        className ||
        "bg-gradient-to-br from-[#3a2a20] to-[#2a1a10] border border-[#8b6239]/30 text-[#E0D8C8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A574]/50"
      }
      aria-label={t("common.language")}
    >
      {SUPPORTED_LANGS.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.label}
        </option>
      ))}
    </select>
  );
}