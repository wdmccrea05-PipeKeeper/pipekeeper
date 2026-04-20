import React, { useMemo } from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { setLanguage, translate, useTranslation } from '@/components/i18n/index.jsx';

function LangProbe() {
  const { t } = useTranslation();
  return (
    <div>
      <span data-testid="label">{t('nav.profile')}</span>
      <span data-testid="curator-title">{t('curatorPage.title')}</span>
      <span data-testid="subscription-title">{t('subscriptionFull.yourSubscription')}</span>
    </div>
  );
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
    expect(screen.getByTestId('curator-title').textContent).toBe(translate('curatorPage.title', {}, 'en'));
    expect(screen.getByTestId('subscription-title').textContent).toBe(translate('subscriptionFull.yourSubscription', {}, 'en'));

    act(() => {
      setLanguage('es');
    });

    expect(screen.getByTestId('label').textContent).toBe(translate('nav.profile', {}, 'es'));
    expect(screen.getByTestId('curator-title').textContent).toBe(translate('curatorPage.title', {}, 'es'));
    expect(screen.getByTestId('subscription-title').textContent).toBe(translate('subscriptionFull.yourSubscription', {}, 'es'));
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
