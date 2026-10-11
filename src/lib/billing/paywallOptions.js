/** Deterministic purchase choices for all combinations of launched modules. */
export const PAYWALL_BUNDLES = Object.freeze([
  { plan: 'founders', modules: ['pipekeeper', 'whiskeykeeper'], title: 'Founders Bundle', monthly: '4.99', annual: '49.99' },
  { plan: 'three', modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'], title: 'Three-Module Bundle', monthly: '7.99', annual: '79.99' },
  { plan: 'four', modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'], title: 'Four-Module Bundle', monthly: '8.99', annual: '89.99' },
]);
export function getPaywallOptions(selectedModules = []) {
  const selected = [...new Set(selectedModules)];
  return {
    coveringBundles: PAYWALL_BUNDLES.filter(({ modules }) => selected.length > 0 && selected.every((module) => modules.includes(module))),
    individualModules: selected,
  };
}
