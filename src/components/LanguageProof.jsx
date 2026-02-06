import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

export default function LanguageProof() {
  const { i18n } = useTranslation();
  const [lastChange, setLastChange] = useState(null);

  useEffect(() => {
    const handleLanguageChanged = () => {
      setLastChange(new Date().toLocaleTimeString());
    };

    i18n.on("languageChanged", handleLanguageChanged);
    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
  }, [i18n]);

  const isDevOrAdmin = import.meta.env.DEV || localStorage.getItem("pk_is_admin") === "true";
  if (!isDevOrAdmin) return null;

  return (
    <div
      className="fixed bottom-2 right-2 text-xs bg-slate-900/90 text-slate-200 px-2 py-1 rounded font-mono z-[9999] pointer-events-none"
      style={{ fontSize: "10px", lineHeight: "1.2" }}
    >
      <div>Lang: {i18n.language}</div>
      {lastChange && <div>Changed: {lastChange}</div>}
    </div>
  );
}