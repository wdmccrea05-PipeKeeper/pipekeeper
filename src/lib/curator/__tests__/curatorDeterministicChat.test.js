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
  it('returns all logged sessions and notes for a named pipe', () => {
    const result = answerCuratorDeterministicQuery('Pull all of my logged sessions for Missouri Meerschaum Legend, along with the notes for those sessions', {
      pipes: [{ id: 'p1', name: 'Missouri Meerschaum Legend', bowl_material: 'Corn Cob' }],
      blends: [{ id: 'b1', name: 'Carter Hall' }],
      smokingLogs: [
        { id: 's1', pipe_id: 'p1', blend_id: 'b1', date: '2026-09-01T12:00:00Z', notes: 'Sweet and cool.' },
        { id: 's2', pipe_id: 'p1', blend_id: 'b1', date: '2026-09-10T12:00:00Z', notes: 'Great outdoors.' },
      ],
    });
    expect(result.handled).toBe(true);
    expect(result.reply).toContain('2 logged sessions');
    expect(result.reply).toContain('Carter Hall');
    expect(result.reply).toContain('Sweet and cool.');
    expect(result.reply).toContain('Great outdoors.');
  });

  it('returns session history across all corn cob pipes', () => {
    const result = answerCuratorDeterministicQuery('What are all the dates that I smoked a cob and what notes did I log?', {
      pipes: [
        { id: 'p1', name: 'Legend', bowl_material: 'Corn Cob' },
        { id: 'p2', name: 'Country Gentleman', bowl_material: 'Corn Cob' },
        { id: 'p3', name: 'Briar Billiard', bowl_material: 'Briar' },
      ],
      blends: [],
      smokingLogs: [
        { pipe_id: 'p1', date: '2026-08-01T12:00:00Z', notes: 'Legend note' },
        { pipe_id: 'p2', date: '2026-08-02T12:00:00Z', notes: 'CG note' },
        { pipe_id: 'p3', date: '2026-08-03T12:00:00Z', notes: 'Briar note' },
      ],
    });
    expect(result.handled).toBe(true);
    expect(result.reply).toContain('2 logged sessions');
    expect(result.reply).toContain('Legend note');
    expect(result.reply).toContain('CG note');
    expect(result.reply).not.toContain('Briar note');
  });

  it('returns all history for a named blend across pipes', () => {
    const result = answerCuratorDeterministicQuery('Show every time I smoked Nightcap and the notes', {
      pipes: [{ id: 'p1', name: 'Dublin', bowl_material: 'Briar' }, { id: 'p2', name: 'Legend', bowl_material: 'Corn Cob' }],
      blends: [{ id: 'b1', name: 'Nightcap' }],
      smokingLogs: [
        { pipe_id: 'p1', blend_id: 'b1', date: '2026-07-01T12:00:00Z', notes: 'Rich evening smoke' },
        { pipe_id: 'p2', blend_id: 'b1', date: '2026-07-02T12:00:00Z', notes: 'Cob softened it' },
      ],
    });
    expect(result.handled).toBe(true);
    expect(result.reply).toContain('2 logged sessions');
    expect(result.reply).toContain('Dublin');
    expect(result.reply).toContain('Legend');
    expect(result.reply).toContain('Rich evening smoke');
  });

  it('compares cob and briar session histories with notes', () => {
    const result = answerCuratorDeterministicQuery('Compare my notes from my cobs versus briars', {
      pipes: [{ id: 'p1', name: 'Legend', bowl_material: 'Corn Cob' }, { id: 'p2', name: 'Billiard', bowl_material: 'Briar' }],
      blends: [{ id: 'b1', name: 'Carter Hall' }],
      smokingLogs: [
        { pipe_id: 'p1', blend_id: 'b1', date: '2026-06-01T12:00:00Z', notes: 'Dry and sweet' },
        { pipe_id: 'p2', blend_id: 'b1', date: '2026-06-02T12:00:00Z', notes: 'Deeper flavor' },
      ],
    });
    expect(result.handled).toBe(true);
    expect(result.reply).toContain('corn cob pipes');
    expect(result.reply).toContain('briar pipes');
    expect(result.reply).toContain('Dry and sweet');
    expect(result.reply).toContain('Deeper flavor');
  });


  it('returns whiskey tasting history with notes ratings serving and pairings', () => {
    const result = answerCuratorDeterministicQuery('Show every tasting of Rare Breed with notes ratings and pairings', {
      bottles: [{ id: 'w1', name: 'Rare Breed' }],
      tastingLogs: [{ bottle_id: 'w1', bottle_name: 'Rare Breed', tasting_date: '2026-05-01T12:00:00Z', notes: 'Caramel and oak', rating: 4.5, serving_method: 'Neat', pairing: 'Dark chocolate' }],
    });
    expect(result.handled).toBe(true);
    expect(result.reply).toContain('Rare Breed');
    expect(result.reply).toContain('Caramel and oak');
    expect(result.reply).toContain('4.5/5');
    expect(result.reply).toContain('Dark chocolate');
  });

  it('returns cigar session history including detailed session notes', () => {
    const result = answerCuratorDeterministicQuery('Pull all sessions for Padron 1964 with notes', {
      cigars: [{ id: 'c1', name: 'Padron 1964' }],
      cigarSessions: [{ cigar_id: 'c1', cigar_name: 'Padron 1964', date: '2026-04-01', notes: 'Excellent', first_third_notes: 'Cocoa', final_third_notes: 'Espresso', rating: 5 }],
    });
    expect(result.handled).toBe(true);
    expect(result.reply).toContain('Padron 1964');
    expect(result.reply).toContain('Cocoa');
    expect(result.reply).toContain('Espresso');
  });

  it('returns wine tasting history with sensory notes and food pairing', () => {
    const result = answerCuratorDeterministicQuery('Show all tastings of Caymus with notes and pairings', {
      wines: [{ id: 'v1', name: 'Caymus' }],
      wineTastingLogs: [{ wine_id: 'v1', wine_name: 'Caymus', date: '2026-03-01', notes: 'Rich', aroma_notes: 'Cassis', palate_notes: 'Dark fruit', finish_notes: 'Long', food_pairing: 'Steak', rating: 4 }],
    });
    expect(result.handled).toBe(true);
    expect(result.reply).toContain('Caymus');
    expect(result.reply).toContain('Cassis');
    expect(result.reply).toContain('Dark fruit');
    expect(result.reply).toContain('Steak');
  });

  it('returns module-wide whiskey history when no bottle is named', () => {
    const result = answerCuratorDeterministicQuery('Show all my whiskey tasting history with notes', {
      bottles: [{ id: 'w1', name: 'Bottle A' }, { id: 'w2', name: 'Bottle B' }],
      tastingLogs: [
        { bottle_id: 'w1', bottle_name: 'Bottle A', tasting_date: '2026-01-01', notes: 'A note' },
        { bottle_id: 'w2', bottle_name: 'Bottle B', tasting_date: '2026-01-02', notes: 'B note' },
      ],
    });
    expect(result.handled).toBe(true);
    expect(result.reply).toContain('Bottle A');
    expect(result.reply).toContain('Bottle B');
  });

  it('returns module-wide cigar history when no cigar is named', () => {
    const result = answerCuratorDeterministicQuery('Show all my cigar sessions with notes', {
      cigars: [{ id: 'c1', name: 'Cigar A' }],
      cigarSessions: [{ cigar_id: 'c1', cigar_name: 'Cigar A', date: '2026-01-03', notes: 'Cigar note' }],
    });
    expect(result.handled).toBe(true);
    expect(result.reply).toContain('Cigar A');
    expect(result.reply).toContain('Cigar note');
  });

  it('returns module-wide wine history when no wine is named', () => {
    const result = answerCuratorDeterministicQuery('Show all my wine tasting history with notes', {
      wines: [{ id: 'v1', name: 'Wine A' }],
      wineTastingLogs: [{ wine_id: 'v1', wine_name: 'Wine A', date: '2026-01-04', notes: 'Wine note' }],
    });
    expect(result.handled).toBe(true);
    expect(result.reply).toContain('Wine A');
    expect(result.reply).toContain('Wine note');
  });

});
