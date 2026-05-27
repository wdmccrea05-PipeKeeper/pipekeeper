import { describe, expect, it } from 'vitest';
import { applyIdentifyConfidencePolicy } from '@/components/addflow/identifyPrefillPolicy';

describe('applyIdentifyConfidencePolicy', () => {
  const payload = {
    name: 'Savinelli 320',
    maker: 'Savinelli',
    shape: 'Author',
    line_series: 'KS',
    shape_number: '320',
    stem_logo: 'S shield',
    country_of_origin: 'Italy',
    bowl_material: 'Briar',
    notes: 'Stamped KS 320',
  };

  it('keeps full prefill for high confidence', () => {
    const out = applyIdentifyConfidencePolicy('pipe', payload, { confidence: 'high' });
    expect(out.bowl_material).toBe('Briar');
    expect(out._identifyConfidence).toBe('high');
  });

  it('does not blindly prefill low-confidence fields', () => {
    const out = applyIdentifyConfidencePolicy('pipe', payload, { confidence: 'low' });
    expect(out.line_series).toBeUndefined();
    expect(out.shape_number).toBeUndefined();
    expect(out.bowl_material).toBeUndefined();
    expect(out._identifySuggestedValues).toEqual(payload);
  });
});
