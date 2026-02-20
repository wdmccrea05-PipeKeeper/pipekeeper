import React, { useMemo } from "react";
import { useTranslation } from "@/components/i18n/safeTranslation";

const LANGS = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "pt-BR", label: "Português (BR)" },
  { code: "nl", label: "Nederlands" },
  { code: "pl", label: "Polski" },
  { code: "ja", label: "日本語" },
  { code: "zh-Hans", label: "中文 (简体)" },
];

export default function LanguageSwitcher({ className = "" }) {
  const { i18n } = useTranslation();

  const current = useMemo(() => {
    const raw = (i18n.language || "en").replace("_", "-");
    if (raw.startsWith("pt")) return "pt-BR";
    if (raw.startsWith("zh")) return "zh-Hans";
    if (LANGS.some((l) => l.code === raw)) return raw;
    const base = raw.split("-")[0];
    return LANGS.some((l) => l.code === base) ? base : "en";
  }, [i18n.language]);

  const setLang = async (lng) => {
    try {
      await i18n.changeLanguage(lng);
      try {
        localStorage.setItem("pk_lang", lng);
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
      aria-label="Language"
    >
      {LANGS.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  );
}