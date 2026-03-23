import React, { useMemo } from "react";
import { useTranslation, SUPPORTED_LANGS } from "@/components/i18n/safeTranslation";
import { normalizeLng } from "@/components/i18n/normalizeLng";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function LanguageSwitcher({ className = "" }) {
  const { lang } = useTranslation();

  const current = useMemo(() => {
    const normalized = normalizeLng(lang || "en");
    return SUPPORTED_LANGS.some((item) => item.code === normalized) ? normalized : "en";
  }, [lang]);

  const setLang = (code) => {
    const normalized = normalizeLng(code);
    try {
      localStorage.setItem("pk_lang", normalized);
      document.documentElement.lang = normalized;
      window.dispatchEvent(new CustomEvent("pk:language-changed", { detail: normalized }));
      window.location.reload();
    } catch (error) {
      console.error("[LanguageSwitcher] Failed to change language:", error);
    }
  };

  return (
    <div className={cn("w-[140px]", className)}>
      <Select value={current} onValueChange={setLang}>
        <SelectTrigger className="h-9 rounded-lg border-[rgba(180,140,75,0.35)] bg-[rgba(28,21,16,0.88)] text-[#F5F1E7]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-lg border-[rgba(180,140,75,0.35)] bg-[rgba(22,17,13,0.98)]">
          {SUPPORTED_LANGS.map((item) => (
            <SelectItem key={item.code} value={item.code}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}