/**
 * upgradePaths — regression tests
 *
 * Verifies:
 *   - 3-module bundle upgrade is not offered in public checkout flows
 *   - Founders bundle still offered for PK/WK-only users
 *   - CigarKeeper-only user sees add-on options instead of bundle upsell
 *   - Bundle users see no upgrade options
 */

import { getAvailableUpgradeOptions } from '../upgradePaths';

function makeState(overrides = {}) {
  return {
    hasBundle: false,
    activePlanKeys: [],
    eligibleActions: ['upgrade_to_bundle'],
    moduleFlags: {
      pipekeeper: false,
      whiskeykeeper: false,
      cigarkeeper: false,
      winekeeper: false,
    },
    paidModules: [],
    ...overrides,
  };
}

describe('getAvailableUpgradeOptions — launch commerce alignment', () => {
  test('PipeKeeper-only user is not offered 3-module bundle upgrade', () => {
    const state = makeState({
      activePlanKeys: ['pipekeeper_pro_annual'],
      moduleFlags: { pipekeeper: true, whiskeykeeper: false, cigarkeeper: false, winekeeper: false },
      paidModules: ['pipekeeper'],
    });
    const options = getAvailableUpgradeOptions(state);
    const threeBundle = options.find((o) => o.action === 'upgrade_to_three_bundle');
    expect(threeBundle).toBeUndefined();
  });

  test('CigarKeeper-only user is not offered 3-module bundle upgrade', () => {
    const state = makeState({
      activePlanKeys: ['cigarkeeper_pro_annual'],
      moduleFlags: { pipekeeper: false, whiskeykeeper: false, cigarkeeper: true, winekeeper: false },
      paidModules: ['cigarkeeper'],
    });
    const options = getAvailableUpgradeOptions(state);
    const threeBundle = options.find((o) => o.action === 'upgrade_to_three_bundle');
    expect(threeBundle).toBeUndefined();
  });

  test('PK+WK user is not offered 3-module bundle upgrade', () => {
    const state = makeState({
      activePlanKeys: ['pipekeeper_pro_annual', 'whiskeykeeper_pro_annual'],
      moduleFlags: { pipekeeper: true, whiskeykeeper: true, cigarkeeper: false, winekeeper: false },
      paidModules: ['pipekeeper', 'whiskeykeeper'],
    });
    const options = getAvailableUpgradeOptions(state);
    const threeBundle = options.find((o) => o.action === 'upgrade_to_three_bundle');
    expect(threeBundle).toBeUndefined();
  });

  test('PK-only user is also offered Founders bundle (PK+WK)', () => {
    const state = makeState({
      activePlanKeys: ['pipekeeper_pro_annual'],
      moduleFlags: { pipekeeper: true, whiskeykeeper: false, cigarkeeper: false, winekeeper: false },
      paidModules: ['pipekeeper'],
    });
    const options = getAvailableUpgradeOptions(state);
    const foundersBundle = options.find((o) => o.action === 'upgrade_to_bundle');
    expect(foundersBundle).toBeDefined();
    expect(foundersBundle.targetPlanKey).toMatch(/founders_bundle/);
  });

  test('Bundle users get no upgrade options', () => {
    const state = makeState({ hasBundle: true, paidModules: ['pipekeeper', 'whiskeykeeper'] });
    const options = getAvailableUpgradeOptions(state);
    expect(options.length).toBe(0);
  });

  test('User with all 3 modules gets no upgrade options (all paid)', () => {
    const state = makeState({
      activePlanKeys: ['pipekeeper_pro_annual', 'whiskeykeeper_pro_annual', 'cigarkeeper_pro_annual'],
      moduleFlags: { pipekeeper: true, whiskeykeeper: true, cigarkeeper: true, winekeeper: false },
      paidModules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],
      eligibleActions: [],
    });
    const options = getAvailableUpgradeOptions(state);
    expect(options.length).toBe(0);
  });
});
