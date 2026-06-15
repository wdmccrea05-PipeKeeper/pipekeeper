import { describe, expect, it } from 'vitest';
import { answerCuratorDeterministicQuery } from '../curatorDeterministicChat.js';

const pairingContext = {
  pairingMatrixPairings: [
    {
      pipe_id: 'pipe_1',
      pipe_name: 'Dublin Pipe',
      recommendations: [
        { tobacco_name: 'Five Brothers', score: 8 },
        { tobacco_name: 'Nightcap', score: 4 },
        { tobacco_name: 'Old Joe Krantz', score: null },
      ],
    },
    {
      pipe_id: 'pipe_2',
      pipe_name: 'Billiard Pipe',
      recommendations: [
        { tobacco_name: 'Five Brothers', score: 3 },
      ],
    },
  ],
  pipes: [{ id: 'pipe_1', name: 'Dublin Pipe' }, { id: 'pipe_2', name: 'Billiard Pipe' }],
  blends: [{ id: 'blend_1', name: 'Five Brothers' }, { id: 'blend_2', name: 'Nightcap' }],
};

describe('answerCuratorDeterministicQuery', () => {
  it('filters pairings by normalized score threshold', () => {
    const result = answerCuratorDeterministicQuery('Show pairings scored 4 or lower', pairingContext);
    expect(result.handled).toBe(true);
    expect(result.reply).toContain('Nightcap (4)');
    expect(result.reply).toContain('Five Brothers (3)');
    expect(result.reply).not.toContain('Five Brothers (8)');
  });

  it('returns best pairings from actual pairing matrix rows', () => {
    const result = answerCuratorDeterministicQuery('Best pipe and tobacco pairings', pairingContext);
    expect(result.handled).toBe(true);
    expect(result.reply).toContain('Dublin Pipe × Five Brothers (8)');
  });

  it('returns best pipe for a named tobacco', () => {
    const result = answerCuratorDeterministicQuery('Which pipe pairs best with Five Brothers?', pairingContext);
    expect(result.handled).toBe(true);
    expect(result.reply).toContain('Dublin Pipe pairs best with Five Brothers at 8');
  });

  it('returns lowest-scoring tobaccos for the current pipe subject', () => {
    const result = answerCuratorDeterministicQuery(
      'Which tobaccos pair poorly with this pipe?',
      pairingContext,
      { subject: { id: 'pipe_1', name: 'Dublin Pipe', type: 'pipe' } }
    );
    expect(result.handled).toBe(true);
    expect(result.reply).toContain('Nightcap (4)');
  });

  it('uses the required empty-state message when the pairing matrix is absent', () => {
    const result = answerCuratorDeterministicQuery('Show pairings below 5', { pairingMatrixPairings: [] });
    expect(result.handled).toBe(true);
    expect(result.reply).toBe('I don’t see a generated pairing matrix yet. Generate one from Pairings and I can analyze the scores.');
  });

  it('uses the required empty-state message when scores are missing', () => {
    const result = answerCuratorDeterministicQuery('Show pairings below 5', {
      pairingMatrixPairings: [
        { pipe_name: 'Pipe A', recommendations: [{ tobacco_name: 'Blend A' }] },
      ],
    });
    expect(result.handled).toBe(true);
    expect(result.reply).toBe('You have saved pairings, but I don’t see ratings on them yet.');
  });

  it('answers deterministic inventory questions without the LLM', () => {
    const result = answerCuratorDeterministicQuery('How many unopened bottles do I have?', {
      bottles: [{ id: 'b1', name: 'Bottle A', is_open: false }, { id: 'b2', name: 'Bottle B', is_open: true }],
      inventoryUnits: [],
    });
    expect(result.handled).toBe(true);
    expect(result.reply).toBe('You have 1 unopened bottle.');
  });

  it('answers open bottle listing deterministically', () => {
    const result = answerCuratorDeterministicQuery('Which bottles are open?', {
      bottles: [{ id: 'b1', name: 'Bottle A', is_open: true }, { id: 'b2', name: 'Bottle B', is_open: false }],
      inventoryUnits: [],
    });
    expect(result.handled).toBe(true);
    expect(result.reply).toContain('Open bottles: Bottle A');
  });

  it('answers cigars under threshold deterministically', () => {
    const result = answerCuratorDeterministicQuery('Which cigars are under 5 sticks?', {
      cigars: [{ id: 'c1', name: 'Cigar A', quantity: 4 }, { id: 'c2', name: 'Cigar B', quantity: 8 }],
    });
    expect(result.handled).toBe(true);
    expect(result.reply).toContain('Cigar A (4)');
    expect(result.reply).not.toContain('Cigar B');
  });

  it('handles valuation ranking deterministically', () => {
    const result = answerCuratorDeterministicQuery('What are my most valuable records?', {
      bottles: [{ id: 'b1', name: 'Bottle A', estimated_value: 120 }],
      wines: [{ id: 'w1', name: 'Wine A', purchase_price: 30 }],
      cigars: [{ id: 'c1', name: 'Cigar A', estimated_value: 40 }],
    });
    expect(result.handled).toBe(true);
    expect(result.reply).toContain('Bottle A (120.00)');
  });

  it('handles missing pairing ratings deterministically', () => {
    const result = answerCuratorDeterministicQuery('Show missing pairing matrix rows', {
      pairingMatrixPairings: [
        { pipe_name: 'Pipe A', recommendations: [{ tobacco_name: 'Blend A', score: null }] },
      ],
    });
    expect(result.handled).toBe(true);
    expect(result.reply).toContain('missing ratings');
  });
});
