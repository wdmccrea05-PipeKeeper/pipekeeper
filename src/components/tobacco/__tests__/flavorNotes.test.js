import { describe, expect, it } from 'vitest';

import { normalizeFlavorProfile } from '@/components/tobacco/flavorNotes';

describe('normalizeFlavorProfile', () => {
  it('preserves custom values and trims entries', () => {
    expect(normalizeFlavorProfile(['  Molasses  ', 'Sweet'])).toEqual(['Molasses', 'Sweet']);
  });

  it('dedupes values case-insensitively', () => {
    expect(normalizeFlavorProfile(['molasses', 'Molasses', 'MOLASSES'])).toEqual(['molasses']);
  });

  it('migrates comma-separated legacy string data to an array safely', () => {
    expect(normalizeFlavorProfile('Sweet, Molasses, sweet')).toEqual(['Sweet', 'Molasses']);
  });
});
