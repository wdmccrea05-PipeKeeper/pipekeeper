import { describe, expect, it } from 'vitest';
import { buildQuickAddPayload, normalizeIdentifiedItem } from '@/components/identify/normalizeIdentifiedItem';

describe('normalizeIdentifiedItem (pipe)', () => {
  it('normalizes and confidence-ranks multiple pipe candidates', () => {
    const result = normalizeIdentifiedItem(
      {
        confidence: 'medium',
        confidence_score: 58,
        candidates: [
          {
            identified_maker: 'Maker A',
            model_or_series: '320',
            shape: 'Author',
            shape_number: '320',
            line_or_series: 'KS',
            stamping_text: 'MAKER A KS 320',
            confidence: 'medium',
            confidence_score: 55,
          },
          {
            identified_maker: 'Maker B',
            model_or_series: '999',
            shape: 'Rhodesian',
            confidence: 'high',
            confidence_score: 83,
            evidence_used: ['Visible stem logo', 'Shank stamping'],
          },
        ],
      },
      'pipe',
      'photo'
    );

    expect(result.candidates).toHaveLength(2);
    expect(result.candidates[0].maker).toBe('Maker B');
    expect(result.candidates[0].details.evidence_used).toEqual(['Visible stem logo', 'Shank stamping']);
    expect(result.candidates[1].details.shape_number).toBe('320');
    expect(result.confidence).toBe('medium');
  });

  it('includes pipe extraction fields in quick-add payload', () => {
    const normalized = normalizeIdentifiedItem(
      {
        identified_maker: 'Savinelli',
        model_or_series: '320',
        line_or_series: 'KS',
        shape_number: '320',
        stem_logo: 'S shield',
        shape: 'Author',
        stamping_text: 'Savinelli KS 320',
        confidence: 'high',
      },
      'pipe',
      'photo'
    );

    const payload = buildQuickAddPayload(normalized.candidates[0], 'pipe');
    expect(payload.line_series).toBe('KS');
    expect(payload.shape_number).toBe('320');
    expect(payload.stem_logo).toBe('S shield');
    expect(payload.stamping).toBe('Savinelli KS 320');
  });
});
