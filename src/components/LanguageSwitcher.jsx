import React, { useMemo } from 'react';
import { useTranslation, SUPPORTED_LANGS } from '@/components/i18n/safeTranslation';
import { normalizeLng } from '@/components/i18n/normalizeLng';

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
    <select
      value={current}
      onChange={(e) => setLang(e.target.value)}
      className={className || 'h-10 flex items-center bg-[rgba(28,21,16,0.72)] border border-[rgba(140,105,65,0.28)] text-black rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[rgba(163,92,92,0.55)] focus:border-[rgba(163,92,92,0.55)]'}
      aria-label={t('common.language', 'Language')}
    >
      {SUPPORTED_LANGS.map((item) => (
        <option key={item.code} value={item.code}>
          {item.label}
        </option>
      ))}
    </select>
  );
}