import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { translate } from '@/components/i18n/index.jsx';

const source = readFileSync('src/components/subscription/ModuleUpgradeFlow.jsx', 'utf8');

describe('existing subscriber bundle upgrade safety', () => {
  it('prevents selecting bundle checkout without a safe billing migration', () => {
    expect(source).toContain("const requiresMigration = path.type.startsWith('bundle') && currentState.paidModules.length > 0");
    expect(source).toContain("if (!requiresMigration) handleSelectOption(path)");
    expect(source).toContain("aria-disabled={requiresMigration}");
    expect(source).toContain("if (isBundleUpgrade) {");
    expect(source).toContain("setError(t('subscription.bundleMigrationRequired'))");
    expect(source).not.toContain("base44.functions.invoke('handleBundleUpgrade'");
  });
  it('localizes bundle warnings and checkout actions in all supported offer languages', () => {
    for (const lang of ['en', 'es', 'fr', 'de', 'ja', 'pl']) {
      for (const key of ['bundleMigrationRequired','moduleBundleCount','monthlyLabel','annualLabel','proceedToCheckout','processingCheckout','currentModules','fourModuleBundleDescription']) {
        const translated = translate('subscription.' + key, { count: 4 }, lang);
        expect(translated, lang + ':' + key).toBeTruthy();
        expect(translated, lang + ':' + key).not.toBe('subscription.' + key);
      }
    }
  });
});
