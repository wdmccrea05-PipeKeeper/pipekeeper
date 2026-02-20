import React, { useMemo } from "react";
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
  { code: "zh", label: "中文（简体）" },
];

export default function LanguageSwitcher({ className = "" }) {
  const current = useMemo(() => {
    const saved = localStorage.getItem("pk_lang");
    return saved || i18n.language || "en";
  }, []);

  const setLang = async (lng) => {
    try {
      await i18n.changeLanguage(lng);

      try {
        localStorage.setItem("pk_lang", lng);

        // keep <html lang> in sync (important for UI + accessibility)
        document.documentElement.lang = lng;

        // optional: helps components that read pk_force_entitlement_refresh
        localStorage.setItem("pk_force_entitlement_refresh", Date.now().toString());
      } catch {}
    } catch (error) {
      console.error("[LanguageSwitcher] Failed to change language:", error);

      // fallback to English
      try {
        await i18n.changeLanguage("en");
        localStorage.setItem("pk_lang", "en");
        document.documentElement.lang = "en";
      } catch {}
    }
  };

  return (
    <div className={className}>
      <select
        value={current}
        onChange={(e) => setLang(e.target.value)}
        className="bg-white/10 text-white text-sm rounded-lg px-3 py-2 border border-white/10 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/20"
        aria-label="Language"
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code} className="text-black">
            {l.label}
          </option>
        ))}
      </select>
    </div>
  );
}