import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { I18nProvider, setLanguage, useTranslation } from '@/components/i18n/safeTranslation';
import { CurrencyProvider, useCurrency } from '@/lib/currency/useCurrency';

function CurrencyProbe() {
  const { lang, locale } = useTranslation();
  const { selectedCurrency, setSelectedCurrency, formatFromBase } = useCurrency();

  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="locale">{locale}</span>
      <span data-testid="currency">{selectedCurrency}</span>
      <span data-testid="value">{formatFromBase(1234)}</span>
      <button type="button" onClick={() => setSelectedCurrency('EUR')}>
        switch
      </button>
    </div>
  );
}

describe('currency localization reactivity', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = 'en';
    setLanguage('en');
  });

  it('rerenders currency formatting when the selected language changes', () => {
    window.localStorage.setItem('pk_currency', 'EUR');

    render(
      <I18nProvider>
        <CurrencyProvider>
          <CurrencyProbe />
        </CurrencyProvider>
      </I18nProvider>
    );

    const englishValue = screen.getByTestId('value').textContent;
    expect(screen.getByTestId('locale').textContent).toBe('en-US');

    act(() => {
      setLanguage('de');
    });

    expect(screen.getByTestId('lang').textContent).toBe('de');
    expect(screen.getByTestId('locale').textContent).toBe('de-DE');
    expect(screen.getByTestId('value').textContent).not.toBe(englishValue);
  });

  it('rerenders when the selected currency changes', () => {
    render(
      <I18nProvider>
        <CurrencyProvider>
          <CurrencyProbe />
        </CurrencyProvider>
      </I18nProvider>
    );

    const usdValue = screen.getByTestId('value').textContent;
    expect(screen.getByTestId('currency').textContent).toBe('USD');

    fireEvent.click(screen.getByRole('button', { name: 'switch' }));

    expect(screen.getByTestId('currency').textContent).toBe('EUR');
    expect(screen.getByTestId('value').textContent).not.toBe(usdValue);
  });
});
