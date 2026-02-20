import React, { useMemo } from "react";
import i18n from "@/components/i18n"; // must be the actual i18n instance used by ui()
import { ui, setHtmlLang } from "@/components/i18n/ui";

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

function normalizeToBase(lng) {
  if (!lng) return "en";
  const raw = String(lng).replace("_", "-");
  const base = raw.split("-")[0].toLowerCase();
  // Keep this list tight to languages we actually ship
  if (["en","es","fr","de","it","pt","nl","pl","ja","zh"].includes(base)) return base;
  return "en";
}

export default function LanguageSwitcher({ className = "" }) {
  const current = useMemo(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("pk_lang") : null;
    return normalizeToBase(saved || i18n?.language || "en");
  }, []);

  const setLang = async (lng) => {
    const normalized = normalizeToBase(lng);

    try {
      // 1) persist language
      localStorage.setItem("pk_lang", normalized);

      // 2) set html lang (important for accessibility + some libs)
      setHtmlLang(normalized);
      if (typeof document !== "undefined") document.documentElement.lang = normalized;

      // 3) switch translation engine
      if (i18n?.changeLanguage) {
        await i18n.changeLanguage(normalized);
      }
    } catch (e) {
      // fallback to English
      try {
        localStorage.setItem("pk_lang", "en");
        setHtmlLang("en");
        if (typeof document !== "undefined") document.documentElement.lang = "en";
        if (i18n?.changeLanguage) await i18n.changeLanguage("en");
      } catch {}
    }

    // 4) force full rerender so ALL pages switch text immediately
    window.location.reload();
  };

  return (
    <div className={className}>
      <select
        value={current}
        onChange={(e) => setLang(e.target.value)}
        className="bg-white/10 text-white text-sm rounded-lg px-3 py-2 border border-white/10 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/20"
        aria-label={ui?.("common.language") || "Language"}
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