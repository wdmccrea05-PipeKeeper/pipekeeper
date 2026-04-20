import React, { useMemo } from "react";
import { useTranslation, SUPPORTED_LANGS, setLanguage } from "@/components/i18n/safeTranslation";
import { normalizeLng } from "@/components/i18n/normalizeLng";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

export default function LanguageSwitcher({ className = "" }) {
  const { lang } = useTranslation();

  const current = useMemo(() => {
    const normalized = normalizeLng(lang || "en");
    return SUPPORTED_LANGS.some((item) => item.code === normalized) ? normalized : "en";
  }, [lang]);

  const handleLanguageChange = (code) => {
    try {
      setLanguage(normalizeLng(code));
    } catch (error) {
      console.error("[LanguageSwitcher] Failed to change language:", error);
    }
  };

  return (
    <Select value={current} onValueChange={handleLanguageChange}>
      <SelectTrigger
        className={`h-9 min-w-[130px] 
        bg-[rgba(28,21,16,0.9)] 
        text-[#F5F1E7] 
        border border-[rgba(180,140,75,0.35)]
        rounded-lg
        px-3
        focus:ring-1 focus:ring-[#D4A574]
        ${className}`}
      >
        <SelectValue className="text-[#F5F1E7]" />
      </SelectTrigger>

      <SelectContent>
        {SUPPORTED_LANGS.map((item) => (
          <SelectItem
            key={item.code}
            value={item.code}
            className="text-[#F5F1E7] hover:bg-white/10"
          >
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
