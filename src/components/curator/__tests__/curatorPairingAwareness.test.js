/**
 * Curator Pairing Score Awareness Tests
 *
 * Verifies that:
 * 1. Pairing records are included in Curator activity summary context
 * 2. Curator system prompt acknowledges pairing score support
 * 3. Summary correctly counts scored and unscored pairs
 * 4. Curator never globally denies pairing score support
 */

import { describe, it, expect } from 'vitest';
import { buildCuratorActivitySummary } from '@/components/curator/chatAdvicePrompting';
import CURATOR_SYSTEM_PROMPT from '@/lib/curator/curatorSystemPrompt';

// ─── buildCuratorActivitySummary pairing context ────────────────────────────

describe('buildCuratorActivitySummary — pairing matrix integration', () => {
  it('includes pairingMatrixPairings count in summary', () => {
    const summary = buildCuratorActivitySummary({
      pairingMatrixPairings: [
        { pipe_id: 'p1', pipe_name: 'Pipe A', recommendations: [{ tobacco_name: 'Five Brothers', score: 3 }, { tobacco_name: 'Virginia Flake', score: 8 }] },
        { pipe_id: 'p2', pipe_name: 'Pipe B', recommendations: [{ tobacco_name: 'Nightcap', score: 6 }] },
      ],
    });

    expect(summary).toContain('Pipe-Tobacco Pairing Rows: 2');
  });

  it('counts all scored pairs across rows', () => {
    const summary = buildCuratorActivitySummary({
      pairingMatrixPairings: [
        { pipe_id: 'p1', recommendations: [{ tobacco_name: 'Blend A', score: 3 }, { tobacco_name: 'Blend B', score: 8 }] },
        { pipe_id: 'p2', recommendations: [{ tobacco_name: 'Blend C', score: 6 }] },
      ],
    });

    expect(summary).toContain('3 scored pairs');
  });

  it('does not count recommendation entries without a score', () => {
    const summary = buildCuratorActivitySummary({
      pairingMatrixPairings: [
        {
          pipe_id: 'p1',
          recommendations: [
            { tobacco_name: 'Five Brothers', score: 3 },
            { tobacco_name: 'Virginia Flake' }, // no score — must not count
          ],
        },
      ],
    });

    expect(summary).toContain('1 scored pairs');
  });

  it('reports zero rows and zero scored pairs when no pairingMatrixPairings supplied', () => {
    const summary = buildCuratorActivitySummary({});
    expect(summary).toContain('Pipe-Tobacco Pairing Rows: 0');
    expect(summary).toContain('0 scored pairs');
  });

  it('handles rows with empty recommendations arrays gracefully', () => {
    const summary = buildCuratorActivitySummary({
      pairingMatrixPairings: [
        { pipe_id: 'p1', recommendations: [] },
      ],
    });
    expect(summary).toContain('Pipe-Tobacco Pairing Rows: 1');
    expect(summary).toContain('0 scored pairs');
  });
});

// ─── Curator system prompt — pairing score support ──────────────────────────

describe('CURATOR_SYSTEM_PROMPT — pairing score acknowledgment', () => {
  it('does not deny the existence of pairing scores', () => {
    expect(CURATOR_SYSTEM_PROMPT).not.toMatch(/doesn'?t store numerical pairing scores/i);
    expect(CURATOR_SYSTEM_PROMPT).not.toMatch(/no pairing score system/i);
  });

  it('describes PipeKeeper pairing score support', () => {
    expect(CURATOR_SYSTEM_PROMPT).toMatch(/pairing.*score/i);
  });

  it('mentions the 0–10 scoring scale or compatibility scores', () => {
    expect(CURATOR_SYSTEM_PROMPT).toMatch(/0[–-]10|compatibility score|scoring/i);
  });
});
