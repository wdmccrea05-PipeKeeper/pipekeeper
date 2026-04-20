import React, { useMemo } from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { setLanguage, translate, useTranslation } from '@/components/i18n/index.jsx';

function LangProbe() {
  const { t } = useTranslation();
  return <span data-testid="label">{t('nav.profile')}</span>;
}

function StaleMemoLangProbe() {
  const { t } = useTranslation();
  const label = useMemo(() => t('nav.profile'), []);
  return <span data-testid="stale-label">{label}</span>;
}

function KeyedLangProbe() {
  const { lang } = useTranslation();
  return <StaleMemoLangProbe key={lang} />;
}

describe('language reactivity', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = 'en';
    setLanguage('en');
  });

  it('setLanguage persists locale and updates document lang', () => {
    const next = setLanguage('es');
    expect(next).toBe('es');
    expect(window.localStorage.getItem('pk_lang')).toBe('es');
    expect(document.documentElement.lang).toBe('es');
  });

  it('active UI translations rerender after language change event', () => {
    render(<LangProbe />);
    expect(screen.getByTestId('label').textContent).toBe(translate('nav.profile', {}, 'en'));

    act(() => {
      setLanguage('es');
    });

    expect(screen.getByTestId('label').textContent).toBe(translate('nav.profile', {}, 'es'));
  });

  it('language-keyed remount updates stale memoized translation surfaces', () => {
    render(<KeyedLangProbe />);
    expect(screen.getByTestId('stale-label').textContent).toBe(translate('nav.profile', {}, 'en'));

    act(() => {
      setLanguage('es');
    });

    expect(screen.getByTestId('stale-label').textContent).toBe(translate('nav.profile', {}, 'es'));
  });
});
