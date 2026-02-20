import React, { useMemo } from "react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { SUPPORTED_LANGS } from "@/components/i18n/index";

export default function LanguageSwitcher({ className = "" }) {
  const { i18n } = useTranslation();

  const current = useMemo(() => {
    const raw = (i18n.language || "en").trim();
    if (SUPPORTED_LANGS.some((l) => l.code === raw)) return raw;
    return "en";
  }, [i18n.language]);

  const setLang = async (code) => {
    try {
      await i18n.changeLanguage(code);
      try {
        localStorage.setItem("pk_lang", code);
      } catch {}
    } catch (error) {
      console.error("[LanguageSwitcher] Failed to change language:", error);
      try {
        await i18n.changeLanguage("en");
        localStorage.setItem("pk_lang", "en");
      } catch {}
    }
  };

  return (
    <select
      value={current}
      onChange={(e) => setLang(e.target.value)}
      className={
        className ||
        "bg-[#1A2B3A]/90 border border-[#A35C5C]/40 text-[#E0D8C8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A35C5C]/50"
      }
      aria-label={i18n.t("common.language") || "Language"}
    >
      {SUPPORTED_LANGS.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.label}
        </option>
      ))}
    </select>
  );
}