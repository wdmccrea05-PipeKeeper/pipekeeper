import React, { useMemo } from "react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { setHtmlLang } from "@/components/i18n/ui";
import i18n from "@/components/i18n";

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
  { code: "zh-Hans", label: "中文（简体）" },
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
    // normalize to your shipped resource keys
    const normalized =
      (lng || "").startsWith("pt") ? "pt" :
      (lng || "").startsWith("zh") ? "zh" :
      (lng || "").split("-")[0] || "en";

    try {
      await i18n.changeLanguage(normalized);
      localStorage.setItem("pk_lang", normalized);
      setHtmlLang(normalized);

      // optional: if you want a hard refresh so every page re-renders immediately
      // window.location.reload();
    } catch (err) {
      console.error("[LanguageSwitcher] Failed to change language:", err);
      try {
        await i18n.changeLanguage("en");
        localStorage.setItem("pk_lang", "en");
        setHtmlLang("en");
      } catch {}
    }
  };

  return (
    <div className={`flex items-center ${className}`}>
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
    </div>
  );
}