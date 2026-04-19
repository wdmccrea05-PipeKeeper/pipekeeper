/**
 * upgradePaths — regression tests
 *
 * Verifies:
 *   - 3-module bundle upgrade is offered to single-module and dual-module users
 *   - Founders bundle still offered for PK/WK-only users
 *   - CigarKeeper-only user sees upgrade to all 3 modules
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

describe('getAvailableUpgradeOptions — 3-module bundle', () => {
  test('PipeKeeper-only user is offered 3-module bundle upgrade', () => {
    const state = makeState({
      activePlanKeys: ['pipekeeper_pro_annual'],
      moduleFlags: { pipekeeper: true, whiskeykeeper: false, cigarkeeper: false, winekeeper: false },
      paidModules: ['pipekeeper'],
    });
    const options = getAvailableUpgradeOptions(state);
    const threeBundle = options.find((o) => o.action === 'upgrade_to_three_bundle');
    expect(threeBundle).toBeDefined();
    expect(threeBundle.targetPlanKey).toBe('three_module_bundle_annual');
  });

  test('CigarKeeper-only user is offered 3-module bundle upgrade', () => {
    const state = makeState({
      activePlanKeys: ['cigarkeeper_pro_annual'],
      moduleFlags: { pipekeeper: false, whiskeykeeper: false, cigarkeeper: true, winekeeper: false },
      paidModules: ['cigarkeeper'],
    });
    const options = getAvailableUpgradeOptions(state);
    const threeBundle = options.find((o) => o.action === 'upgrade_to_three_bundle');
    expect(threeBundle).toBeDefined();
  });

  test('PK+WK user is offered 3-module bundle upgrade', () => {
    const state = makeState({
      activePlanKeys: ['pipekeeper_pro_annual', 'whiskeykeeper_pro_annual'],
      moduleFlags: { pipekeeper: true, whiskeykeeper: true, cigarkeeper: false, winekeeper: false },
      paidModules: ['pipekeeper', 'whiskeykeeper'],
    });
    const options = getAvailableUpgradeOptions(state);
    const threeBundle = options.find((o) => o.action === 'upgrade_to_three_bundle');
    expect(threeBundle).toBeDefined();
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