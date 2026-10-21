import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const src = readFileSync('src/pages/SubscriptionFull.jsx', 'utf8');
describe('SubscriptionFull existing subscriber migration safety', () => {
  it('does not cancel subscriptions before checkout', () => {
    expect(src).not.toContain('handleBundleUpgrade');
    expect(src).not.toContain('cancelableIds');
    expect(src).not.toContain('cancel existing subscription first');
  });
  it('directs existing subscriber bundle upgrades to support without new checkout', () => {
    expect(src).toContain('option.actionType === "upgrade_existing"');
    expect(src).toContain('setUpgradeError(t("subscription.bundleMigrationRequired"))');
    expect(src).toContain('mailto:admin@pipekeeperapp.com?subject=CollectionKeeper%20Bundle%20Upgrade');
    expect(src).toContain('t("subscription.contactSupportForUpgrade")');
  });
});
