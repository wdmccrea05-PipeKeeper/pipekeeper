import React from "react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/components/i18n/safeTranslation";

const languages = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "pt-BR", label: "Português (BR)" },
  { code: "nl", label: "Nederlands" },
  { code: "pl", label: "Polski" },
  { code: "ja", label: "日本語" },
  { code: "zh-CN", label: "中文 (简体)" },
];

export default function LanguageSwitcher({ className = "" }) {
  const { i18n } = useTranslation();

  return (
    <Select
      value={i18n.language}
      onValueChange={(value) => i18n.changeLanguage(value)}
    >
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
        {languages.map((lang) => (
          <SelectItem
            key={lang.code}
            value={lang.code}
            className="text-[#F5F1E7] hover:bg-white/10"
          >
            {lang.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}