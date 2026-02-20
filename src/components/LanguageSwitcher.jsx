import React, { useMemo } from "react";
import { ui, setPkLanguage, getPkLanguage } from "@/components/i18n/ui";

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
  const current = useMemo(() => getPkLanguage(), []);

  const onChange = (e) => {
    const lng = e.target.value;
    setPkLanguage(lng);
    // Force full rerender so all pages pick it up immediately
    window.location.reload();
  };

  return (
    <div className={className}>
      <select
        value={current}
        onChange={onChange}
        className="bg-white/10 text-white text-sm rounded-lg px-3 py-2 border border-white/10 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/20"
        aria-label={ui("common.language") || "Language"}
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