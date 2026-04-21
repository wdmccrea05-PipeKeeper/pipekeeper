import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { translate } from '@/components/i18n/index.jsx';

const ACTIVE_FILES = [
  'src/pages/CollectionHub.jsx',
  'src/components/hub/CollectionIntelligenceHighlights.jsx',
  'src/components/hub/CollectionStoryCard.jsx',
  'src/components/hub/CuratorHub.jsx',
  'src/components/hub/QuickLaunch.jsx',
  'src/components/hub/TonightSessionCard.jsx',
  'src/components/hub/highlightSelection.js',
  'src/components/modules/PipeKeeperModule.jsx',
  'src/components/modules/WhiskeyKeeperModule.jsx',
  'src/pages/CigarKeeper.jsx',
  'src/pages/Curator.jsx',
  'src/components/subscription/ModulePricingTiers.jsx',
  'src/pages/UserReport.jsx',
];

const REQUIRED_KEYS = [
  'hub.collectionStory',
  'hub.collectorSnapshot',
  'hub.quickLaunch',
  'hub.curatorTitle',
  'nav.hub',
  'nav.curator',
  'nav.userReport',
  'userReport.title',
  'userReport.subscriptions.sectionTitle',
  'userReport.renewals.sectionTitle',
  'curatorPage.title',
  'curatorPage.surfaces.planSession',
  'subscription.title',
  'subscription.manage',
  'subscription.subscribe',
  'subscription.openSubscriptionFailed',
  'whiskey.subtitle',
  'whiskey.searchPlaceholder',
  'whiskey.noBottlesFound',
  'session.tonightTitle',
  'session.recordSession',
  'freeTier.upgradePrompt',
  'hub.restockPriority',
  'hub.cigarCrownJewel',
];

const NON_EN_REQUIRED_KEYS = [
  'nav.curator',
  'nav.userReport',
  'hub.quickLaunch',
  'hub.collectionStory',
  'curatorPage.description',
  'userReport.title',
  'userReport.subscriptions.sectionTitle',
  'subscription.manage',
  'whiskey.searchPlaceholder',
  'session.tonightTitle',
  'freeTier.upgradePrompt',
  'hub.cigarCrownJewel',
];

describe('active screen i18n coverage', () => {
  it('does not use inline english t() fallback literals or OR literals on critical active screens', () => {
    const fallbackPattern = /\bt\(\s*['"][^'"]+['"]\s*,\s*['"]/;
    const orFallbackPattern = /\bt\([^)]+\)\s*\|\|\s*['"]/;
    for (const file of ACTIVE_FILES) {
      const content = readFileSync(file, 'utf8');
      expect(fallbackPattern.test(content), `${file} still contains inline t() fallback text`).toBe(false);
      expect(orFallbackPattern.test(content), `${file} still contains t() || inline fallback text`).toBe(false);
    }
  });

  it('resolves critical active-screen keys for japanese and polish without rendering raw keys', () => {
    for (const lang of ['ja', 'pl']) {
      for (const key of REQUIRED_KEYS) {
        const value = translate(key, {}, lang);
        expect(typeof value, `${lang}:${key}`).toBe('string');
        expect(String(value).trim().length, `${lang}:${key}`).toBeGreaterThan(0);
        expect(value, `${lang}:${key}`).not.toBe(key);
      }
    }
  });

  it('uses non-english copy on critical active-screen keys for japanese and polish', () => {
    for (const lang of ['ja', 'pl']) {
      for (const key of NON_EN_REQUIRED_KEYS) {
        const value = translate(key, {}, lang);
        const english = translate(key, {}, 'en');
        expect(typeof value, `${lang}:${key}`).toBe('string');
        expect(String(value).trim().length, `${lang}:${key}`).toBeGreaterThan(0);
        expect(value, `${lang}:${key}`).not.toBe(english);
      }
    }
  });
});
