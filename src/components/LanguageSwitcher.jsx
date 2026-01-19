import React from "react";
import { useTranslation } from "react-i18next";

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const setLang = async (lng) => {
    await i18n.changeLanguage(lng);
    try {
      localStorage.setItem("pk_lang", lng);
    } catch {}
  };

  return (
    <div className="flex items-center gap-2">
      <button
        className="px-3 py-1 rounded-md border text-sm"
        onClick={() => setLang("en")}
        aria-label="English"
      >
        EN
      </button>
      <button
        className="px-3 py-1 rounded-md border text-sm"
        onClick={() => setLang("es")}
        aria-label="Español"
      >
        ES
      </button>
    </div>
  );
}