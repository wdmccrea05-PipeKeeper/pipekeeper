import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";

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

export default function LanguageSwitcher({ compact = false }) {
  const { i18n } = useTranslation();

  const current = useMemo(() => {
    // Normalize to our supported codes
    const raw = (i18n.language || "en").replace("_", "-");
    if (raw.startsWith("pt")) return "pt-BR";
    if (raw.startsWith("zh")) return "zh-Hans";
    const base = raw.split("-")[0];
    return LANGS.some((l) => l.code === raw) ? raw : base;
  }, [i18n.language]);

  const setLang = async (lng) => {
    await i18n.changeLanguage(lng);
    try {
      localStorage.setItem("pk_lang", lng);
    } catch {}
  };

  return (
    <div className="flex items-center gap-2">
      {!compact && <span className="text-xs text-muted-foreground">Language</span>}
      <select
        className="h-9 rounded-md border bg-background px-2 text-sm"
        value={current}
        onChange={(e) => setLang(e.target.value)}
        aria-label="Language selector"
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </div>
  );
}