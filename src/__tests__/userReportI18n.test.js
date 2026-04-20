import { describe, expect, it } from 'vitest';
import { SUPPORTED_LANGS, translate } from '@/components/i18n/index.jsx';

describe('user report i18n coverage', () => {
  const requiredKeys = [
    'userReport.title',
    'userReport.accounts.sectionTitle',
    'userReport.subscriptions.sectionTitle',
    'userReport.runRate.sectionTitle',
    'userReport.renewals.sectionTitle',
    'userReport.diagnostics.sectionTitle',
    'userReport.warningPanel.title',
    'userReport.userTable.planSummary',
    'userReport.userTable.modules',
    'userReport.userTable.renewalContext',
    'userReport.csv.exported',
    'userReport.diagnostics.sampleLabels.multipleActiveSubscriptions',
  ];

  for (const { code } of SUPPORTED_LANGS) {
    it(`resolves required userReport keys for ${code}`, () => {
      for (const key of requiredKeys) {
        const value = translate(key, {}, code);
        expect(typeof value).toBe('string');
        expect(value.trim().length).toBeGreaterThan(0);
        expect(value).not.toBe(key);
      }
    });
  }
});
