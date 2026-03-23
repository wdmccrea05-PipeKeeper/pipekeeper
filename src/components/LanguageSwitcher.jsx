import React, { useMemo } from 'react';
import { useTranslation, SUPPORTED_LANGS } from '@/components/i18n/safeTranslation';
import { normalizeLng } from '@/components/i18n/normalizeLng';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function LanguageSwitcher({ className = '' }) {
  const { t, lang } = useTranslation();

  const current = useMemo(() => {
    const normalized = normalizeLng(lang || 'en');
    return SUPPORTED_LANGS.some((item) => item.code === normalized) ? normalized : 'en';
  }, [lang]);

  const setLang = (code) => {
    const normalized = normalizeLng(code);
    try {
      localStorage.setItem('pk_lang', normalized);
      document.documentElement.lang = normalized;
      window.dispatchEvent(new CustomEvent('pk:language-changed', { detail: normalized }));
      window.location.reload();
    } catch (error) {
      console.error('[LanguageSwitcher] Failed to change language:', error);
    }
  };

  return (
    <Select value={current} onValueChange={setLang}>
      <SelectTrigger className={className || 'h-9 bg-[rgba(28,21,16,0.85)] text-[#F5F1E7] border border-[rgba(180,140,75,0.35)] rounded-lg px-3 focus:ring-1 focus:ring-[#D4A574] focus:outline-none'}>
        <SelectValue className="text-[#F5F1E7]" />
      </SelectTrigger>
      <SelectContent className="bg-[rgba(28,21,16,0.95)] border-[rgba(180,140,75,0.35)]">
        {SUPPORTED_LANGS.map((item) => (
          <SelectItem key={item.code} value={item.code} className="text-[#F5F1E7] focus:bg-[rgba(180,140,75,0.25)]">
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}