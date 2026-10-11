import { describe, it, expect } from 'vitest';
import { getPaywallOptions } from '../paywallOptions';
const modules = ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];
describe('all 15 nonempty module combinations', () => {
  for (let mask = 1; mask < 16; mask++) {
    const selected = modules.filter((_, i) => mask & (1 << i));
    for (const period of ['monthly', 'annual']) {
      it(`${selected.join('+')} ${period} offers a complete, priced checkout choice`, () => {
        const options = getPaywallOptions(selected);
        expect(options.individualModules).toEqual(selected);
        expect(options.coveringBundles.length + options.individualModules.length).toBeGreaterThan(0);
        for (const bundle of options.coveringBundles) {
          expect(selected.every(module => bundle.modules.includes(module))).toBe(true);
          expect(Number(bundle[period])).toBeGreaterThan(0);
        }
      });
    }
  }
});
