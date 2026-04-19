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

  test.each([
    {
      name: 'Pipe -> Founders',
      state: makeState({
        activePlanKeys: ['pipekeeper_pro_annual'],
        moduleFlags: { pipekeeper: true, whiskeykeeper: false, cigarkeeper: false, winekeeper: false },
        paidModules: ['pipekeeper'],
        eligibleActions: ['upgrade_to_bundle', 'add_whiskeykeeper_module', 'add_cigarkeeper_module', 'upgrade_to_three_module_bundle'],
      }),
      requiredAction: 'upgrade_to_bundle',
      requiredTargetPrefix: 'founders_bundle',
    },
    {
      name: 'Pipe -> Three Bundle',
      state: makeState({
        activePlanKeys: ['pipekeeper_pro_annual'],
        moduleFlags: { pipekeeper: true, whiskeykeeper: false, cigarkeeper: false, winekeeper: false },
        paidModules: ['pipekeeper'],
        eligibleActions: ['upgrade_to_three_module_bundle'],
      }),
      requiredAction: 'upgrade_to_three_module_bundle',
      requiredTargetPrefix: 'three_module_bundle',
    },
    {
      name: 'Whiskey -> Founders',
      state: makeState({
        activePlanKeys: ['whiskeykeeper_pro_annual'],
        moduleFlags: { pipekeeper: false, whiskeykeeper: true, cigarkeeper: false, winekeeper: false },
        paidModules: ['whiskeykeeper'],
        eligibleActions: ['upgrade_to_bundle', 'add_pipekeeper_module', 'add_cigarkeeper_module', 'upgrade_to_three_module_bundle'],
      }),
      requiredAction: 'upgrade_to_bundle',
      requiredTargetPrefix: 'founders_bundle',
    },
    {
      name: 'Whiskey -> Three Bundle',
      state: makeState({
        activePlanKeys: ['whiskeykeeper_pro_annual'],
        moduleFlags: { pipekeeper: false, whiskeykeeper: true, cigarkeeper: false, winekeeper: false },
        paidModules: ['whiskeykeeper'],
        eligibleActions: ['upgrade_to_three_module_bundle'],
      }),
      requiredAction: 'upgrade_to_three_module_bundle',
      requiredTargetPrefix: 'three_module_bundle',
    },
    {
      name: 'Cigar -> Three Bundle',
      state: makeState({
        activePlanKeys: ['cigarkeeper_pro_annual'],
        moduleFlags: { pipekeeper: false, whiskeykeeper: false, cigarkeeper: true, winekeeper: false },
        paidModules: ['cigarkeeper'],
        eligibleActions: ['upgrade_to_three_module_bundle'],
      }),
      requiredAction: 'upgrade_to_three_module_bundle',
      requiredTargetPrefix: 'three_module_bundle',
    },
    {
      name: 'Founders -> Add CigarKeeper',
      state: makeState({
        hasBundle: true,
        isFoundersOnlyBundle: true,
        activePlanKeys: ['founders_bundle_annual'],
        moduleFlags: { pipekeeper: true, whiskeykeeper: true, cigarkeeper: false, winekeeper: false },
        paidModules: ['pipekeeper', 'whiskeykeeper'],
        eligibleActions: ['add_cigarkeeper_module', 'upgrade_to_three_module_bundle'],
      }),
      requiredAction: 'add_cigarkeeper_module',
      requiredTargetPrefix: 'cigarkeeper_pro',
    },
    {
      name: 'Founders -> Three Bundle',
      state: makeState({
        hasBundle: true,
        isFoundersOnlyBundle: true,
        activePlanKeys: ['founders_bundle_annual'],
        moduleFlags: { pipekeeper: true, whiskeykeeper: true, cigarkeeper: false, winekeeper: false },
        paidModules: ['pipekeeper', 'whiskeykeeper'],
        eligibleActions: ['add_cigarkeeper_module', 'upgrade_to_three_module_bundle'],
      }),
      requiredAction: 'upgrade_to_three_module_bundle',
      requiredTargetPrefix: 'three_module_bundle',
    },
    {
      name: 'Pipe + Cigar -> Three Bundle',
      state: makeState({
        activePlanKeys: ['pipekeeper_pro_annual', 'cigarkeeper_pro_annual'],
        moduleFlags: { pipekeeper: true, whiskeykeeper: false, cigarkeeper: true, winekeeper: false },
        paidModules: ['pipekeeper', 'cigarkeeper'],
        eligibleActions: ['add_whiskeykeeper_module', 'upgrade_to_three_module_bundle'],
      }),
      requiredAction: 'upgrade_to_three_module_bundle',
      requiredTargetPrefix: 'three_module_bundle',
    },
    {
      name: 'Whiskey + Cigar -> Three Bundle',
      state: makeState({
        activePlanKeys: ['whiskeykeeper_pro_annual', 'cigarkeeper_pro_annual'],
        moduleFlags: { pipekeeper: false, whiskeykeeper: true, cigarkeeper: true, winekeeper: false },
        paidModules: ['whiskeykeeper', 'cigarkeeper'],
        eligibleActions: ['add_pipekeeper_module', 'upgrade_to_three_module_bundle'],
      }),
      requiredAction: 'upgrade_to_three_module_bundle',
      requiredTargetPrefix: 'three_module_bundle',
    },
  ])('$name scenario keeps expected upgrade path available', ({ state, requiredAction, requiredTargetPrefix }) => {
    const options = getAvailableUpgradeOptions(state);
    const match = options.find((o) => o.action === requiredAction);
    expect(match).toBeDefined();
    expect(match.targetPlanKey).toMatch(new RegExp(`^${requiredTargetPrefix}`));
  });

  test('founders users get add-cigar path marked as recommended', () => {
    const state = makeState({
      hasBundle: true,
      isFoundersOnlyBundle: true,
      activePlanKeys: ['founders_bundle_annual'],
      moduleFlags: { pipekeeper: true, whiskeykeeper: true, cigarkeeper: false, winekeeper: false },
      paidModules: ['pipekeeper', 'whiskeykeeper'],
      eligibleActions: ['add_cigarkeeper_module', 'upgrade_to_three_module_bundle'],
    });

    const options = getAvailableUpgradeOptions(state);
    const recommended = options.filter((o) => o.recommended);

    expect(recommended).toHaveLength(1);
    expect(recommended[0].action).toBe('add_cigarkeeper_module');
    expect(options[0].action).toBe('add_cigarkeeper_module');
  });

  test('pipe-only users get founders upgrade as recommended first step', () => {
    const state = makeState({
      activePlanKeys: ['pipekeeper_pro_annual'],
      moduleFlags: { pipekeeper: true, whiskeykeeper: false, cigarkeeper: false, winekeeper: false },
      paidModules: ['pipekeeper'],
      eligibleActions: ['upgrade_to_bundle', 'add_whiskeykeeper_module', 'add_cigarkeeper_module', 'upgrade_to_three_module_bundle'],
    });

    const options = getAvailableUpgradeOptions(state);
    expect(options[0].action).toBe('upgrade_to_bundle');
    expect(options[0].recommended).toBe(true);
  });
});
