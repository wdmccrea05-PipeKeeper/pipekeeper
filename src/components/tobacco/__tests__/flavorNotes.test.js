import { describe, expect, it } from 'vitest';

import { normalizeFlavorNotes, removeFlavorNote } from '@/components/tobacco/flavorNotes';

describe('flavor note normalization', () => {
  it('trims values and ignores duplicates case-insensitively', () => {
    expect(normalizeFlavorNotes(['  Molasses ', 'molasses', ' Sweet ', '', null])).toEqual([
      'Molasses',
      'Sweet',
    ]);
  });

  it('normalizes comma, semicolon, and newline separated strings', () => {
    expect(normalizeFlavorNotes('Sweet, smoky; Citrus\nHoney')).toEqual([
      'Sweet',
      'smoky',
      'Citrus',
      'Honey',
    ]);
  });

  it('removes notes case-insensitively', () => {
    expect(removeFlavorNote(['Sweet', 'Molasses', 'Citrus'], 'molasses')).toEqual([
      'Sweet',
      'Citrus',
    ]);
  });
});

