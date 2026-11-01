import { describe, it, expect } from 'vitest';
import enUI from '../components/i18n/locales/en.ui.jsx';
import esUI from '../components/i18n/locales/es.ui.jsx';
import { readFileSync } from 'node:fs';

describe('subscription screen translation regression', () => {
  it('has the currently-on-Pro label in English and Spanish', () => {
    expect(enUI.subscriptionFull.currentlyOnPro).toMatch(/Pro/);
    expect(esUI.subscriptionFull.currentlyOnPro).toMatch(/Pro/);
  });
  it('covers all subscription screen translation keys in Spanish and English', () => {
    const source = readFileSync('src/pages/SubscriptionFull.jsx', 'utf8');
    const keys = [...source.matchAll(/\bt\([\x27\x22](subscription(?:Full)?\.[\w.]+)/g)].map(match => match[1]);
    for (const key of keys) {
      const [namespace, ...path] = key.split('.');
      const lookup = (locale) => path.reduce((value, part) => value?.[part], locale[namespace]);
      expect(lookup(enUI), `Missing English translation: ${key}`).toBeTruthy();
      expect(lookup(esUI), `Missing Spanish translation: ${key}`).toBeTruthy();
    }
  });
  it('keeps the subscription UI using a translation key rather than a literal', () => {
    const source = readFileSync('src/pages/SubscriptionFull.jsx', 'utf8');
    expect(source).toContain('t("subscriptionFull.currentlyOnPro")');
  });
});
