/**
 * upgradePaths — regression tests
 *
 * Verifies:
 *   - Founders bundle is still offered for PK/WK-only users
 *   - 3-module bundle upgrade is offered when coverage is incomplete
 *   - Missing individual module add-ons are offered when applicable
 *   - Full-coverage users get no upgrade options
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
  test('PipeKeeper-only user is offered 3-module bundle upgrade', () => {
    const state = makeState({
      activePlanKeys: ['pipekeeper_pro_annual'],
      moduleFlags: { pipekeeper: true, whiskeykeeper: false, cigarkeeper: false, winekeeper: false },
      paidModules: ['pipekeeper'],
      eligibleActions: [
        'upgrade_to_bundle',
        'add_whiskeykeeper_module',
        'add_cigarkeeper_module',
        'upgrade_to_three_module_bundle',
      ],
    });
    const options = getAvailableUpgradeOptions(state);
    const threeBundle = options.find((o) => o.action === 'upgrade_to_three_module_bundle');
    expect(threeBundle).toBeDefined();
  });

  test('CigarKeeper-only user is offered 3-module bundle upgrade', () => {
    const state = makeState({
      activePlanKeys: ['cigarkeeper_pro_annual'],
      moduleFlags: { pipekeeper: false, whiskeykeeper: false, cigarkeeper: true, winekeeper: false },
      paidModules: ['cigarkeeper'],
      eligibleActions: [
        'add_pipekeeper_module',
        'add_whiskeykeeper_module',
        'upgrade_to_three_module_bundle',
      ],
    });
    const options = getAvailableUpgradeOptions(state);
    const threeBundle = options.find((o) => o.action === 'upgrade_to_three_module_bundle');
    expect(threeBundle).toBeDefined();
  });

  test('PK+WK user is offered 3-module bundle upgrade to complete coverage', () => {
    const state = makeState({
      activePlanKeys: ['pipekeeper_pro_annual', 'whiskeykeeper_pro_annual'],
      moduleFlags: { pipekeeper: true, whiskeykeeper: true, cigarkeeper: false, winekeeper: false },
      paidModules: ['pipekeeper', 'whiskeykeeper'],
      eligibleActions: ['add_cigarkeeper_module', 'upgrade_to_three_module_bundle'],
    });
    const options = getAvailableUpgradeOptions(state);
    const threeBundle = options.find((o) => o.action === 'upgrade_to_three_module_bundle');
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

  test('Founders bundle users can add CigarKeeper or upgrade to 3-module bundle', () => {
    const state = makeState({
      hasBundle: true,
      isFoundersOnlyBundle: true,
      paidModules: ['pipekeeper', 'whiskeykeeper'],
      moduleFlags: { pipekeeper: true, whiskeykeeper: true, cigarkeeper: false, winekeeper: false },
      activePlanKeys: ['founders_bundle_annual'],
      eligibleActions: ['add_cigarkeeper_module', 'upgrade_to_three_module_bundle'],
    });
    const options = getAvailableUpgradeOptions(state);
    expect(options.map((o) => o.action)).toEqual(
      expect.arrayContaining(['add_cigarkeeper_module', 'upgrade_to_three_module_bundle'])
    );
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
