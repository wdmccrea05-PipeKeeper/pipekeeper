import { describe, expect, it } from 'vitest';
import { getCigarQuickActionPatch } from '@/platform/cigarQuickActions';

describe('getCigarQuickActionPatch', () => {
  it('decrements singles_equivalent for smoked_one when present', () => {
    const patch = getCigarQuickActionPatch(
      { id: 'c1', unit_type: 'box', quantity: 1, cigars_per_package: 20, singles_equivalent: 12 },
      'smoked_one'
    );

    expect(patch).toEqual({ singles_equivalent: 11 });
  });

  it('derives singles_equivalent from quantity and package size when missing', () => {
    const patch = getCigarQuickActionPatch(
      { id: 'c2', unit_type: 'box', quantity: 1, cigars_per_package: 20, singles_equivalent: null },
      'smoked_one'
    );

    expect(patch).toEqual({ singles_equivalent: 19 });
  });

  it('derives singles_equivalent when singles_equivalent is undefined', () => {
    const patch = getCigarQuickActionPatch(
      { id: 'c4', unit_type: 'box', quantity: 2, cigars_per_package: 10 },
      'smoked_one'
    );

    expect(patch).toEqual({ singles_equivalent: 19 });
  });

  it('decrements quantity and singles_equivalent for single-unit cigars', () => {
    const patch = getCigarQuickActionPatch(
      { id: 'c3', unit_type: 'single', quantity: 3, singles_equivalent: 3 },
      'smoked_one'
    );

    expect(patch).toEqual({ singles_equivalent: 2, quantity: 2 });
  });
});
