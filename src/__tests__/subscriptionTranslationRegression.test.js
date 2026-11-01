import { describe, it, expect } from 'vitest';
import enUI from '../components/i18n/locales/en.ui.jsx';
import esUI from '../components/i18n/locales/es.ui.jsx';
import { readFileSync } from 'node:fs';

describe('subscription screen translation regression', () => {
  it('has the currently-on-Pro label in English and Spanish', () => {
    expect(enUI.subscriptionFull.currentlyOnPro).toMatch(/Pro/);
    expect(esUI.subscriptionFull.currentlyOnPro).toMatch(/Pro/);
  });
  it('keeps the subscription UI using a translation key rather than a literal', () => {
    const source = readFileSync('src/pages/SubscriptionFull.jsx', 'utf8');
    expect(source).toContain('t("subscriptionFull.currentlyOnPro")');
  });
});
