import { describe, expect, it } from 'vitest';
import { buildQuickAddPayload, normalizeIdentifiedItem } from './normalizeIdentifiedItem';

describe('normalizeIdentifiedItem barcode flows', () => {
  it('preserves scanned barcode in normalized UPC candidate for cigars', () => {
    const result = normalizeIdentifiedItem(
      {
        confidence: 'high',
        confidence_score: 92,
        _inputBarcode: '012345678905',
        brand: 'Oliva',
        line: 'Serie V',
        vitola: 'Robusto',
      },
      'cigar',
      'upc'
    );

    expect(result.confidence).toBe('high');
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].details.barcode).toBe('012345678905');

    const payload = buildQuickAddPayload(result.candidates[0], 'cigar');
    expect(payload.barcode).toBe('012345678905');
    expect(payload.brand).toBe('Oliva');
  });

  it('returns a safe low-confidence empty result when no raw data exists', () => {
    const result = normalizeIdentifiedItem(null, 'bottle', 'upc');

    expect(result.confidence).toBe('low');
    expect(result.confidenceScore).toBe(0);
    expect(result.candidates).toEqual([]);
    expect(result.selected).toBeNull();
  });
});
