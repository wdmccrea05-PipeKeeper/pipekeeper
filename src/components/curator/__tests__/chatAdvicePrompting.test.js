import { describe, it, expect } from 'vitest';
import { buildCuratorChatSystemPrompt, buildCuratorActivitySummary } from '@/components/curator/chatAdvicePrompting';

describe('buildCuratorChatSystemPrompt', () => {
  it('includes cigar-native guidance and cigar-capable record schema', () => {
    const prompt = buildCuratorChatSystemPrompt();

    expect(prompt).toContain('Treat cigar users as first-class');
    expect(prompt).toContain('recordType": "pipe | blend | bottle | cigar | wine"');
    expect(prompt).toContain('humidor_maintenance');
    expect(prompt).toContain('cigar_restock');
  });
});

describe('buildCuratorActivitySummary', () => {
  it('includes pipe-tobacco pairing counts when pairings are present', () => {
    const summary = buildCuratorActivitySummary({
      pipes: [{ id: 'p1' }],
      blends: [{ id: 'b1' }],
      pairingMatrixPairings: [
        {
          pipe_id: 'p1',
          pipe_name: 'My Pipe',
          recommendations: [
            { tobacco_name: 'Blend A', score: 8 },
            { tobacco_name: 'Blend B', score: 3 },
          ],
        },
      ],
    });

    expect(summary).toContain('Pipe-Tobacco Pairing Rows: 1');
    expect(summary).toContain('2 scored pairs');
  });

  it('reports zero pairing rows when pairingMatrixPairings is absent', () => {
    const summary = buildCuratorActivitySummary({ pipes: [], blends: [] });
    expect(summary).toContain('Pipe-Tobacco Pairing Rows: 0');
  });

  it('correctly counts only recommendations that have a score', () => {
    const summary = buildCuratorActivitySummary({
      pairingMatrixPairings: [
        {
          pipe_id: 'p1',
          recommendations: [
            { tobacco_name: 'Blend A', score: 9 },
            { tobacco_name: 'Blend B' }, // no score
          ],
        },
      ],
    });
    expect(summary).toContain('1 scored pairs');
  });
});
