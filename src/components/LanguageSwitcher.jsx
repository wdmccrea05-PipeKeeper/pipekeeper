import React, { useEffect, useMemo, useState } from "react";
import i18n from "@/components/i18n";

const LANGS = [
  { code: "en", label: "English" },
  { code: "nl", label: "Nederlands" },
  { code: "sv", label: "Svenska" },
  { code: "ja", label: "日本語" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "es", label: "Español" },
  { code: "pt-BR", label: "Português" },
  { code: "pl", label: "Polski" },
  { code: "zh-Hans", label: "中文" },
];

function normalizeLang(raw) {
  const v = (raw || "").toString().trim();
  if (!v) return "en";
  if (v === "pt") return "pt-BR";
  if (v === "zh") return "zh-Hans";
  if (v.toLowerCase() === "zh-cn") return "zh-Hans";
  if (v.toLowerCase() === "pt-br") return "pt-BR";
  return v;
}

export default function LanguageSwitcher() {
  const [lang, setLang] = useState("en");
  const options = useMemo(() => LANGS, []);

  useEffect(() => {
    const stored = normalizeLang(
      localStorage.getItem("pk_lang") || localStorage.getItem("pipekeeper_language")
    );
    setLang(stored);
    if (i18n.language !== stored) i18n.changeLanguage(stored);

    const handler = (lng) => setLang(normalizeLang(lng));
    i18n.on("languageChanged", handler);
    return () => i18n.off("languageChanged", handler);
  }, []);

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
      className="text-sm bg-transparent border border-white/10 rounded-md px-2 py-1 text-white"
      aria-label="Language"
      title="Language"
    >
      {options.map((l) => (
        <option key={l.code} value={l.code} className="text-black">
          {l.label}
        </option>
      ))}
    </select>
  );
}