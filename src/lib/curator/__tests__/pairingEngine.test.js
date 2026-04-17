import { describe, it, expect } from 'vitest';
import { generatePairingRecommendations } from '@/lib/curator/pairingEngine';

function baseContext(overrides = {}) {
  return {
    activeModules: {
      pipekeeper: true,
      whiskeykeeper: true,
      winekeeper: true,
      cigarkeeper: true,
      ...(overrides.activeModules || {}),
    },
    pipes: [{ id: 'p1', name: 'Pipe One', rating: 4 }],
    blends: [{ id: 't1', name: 'Blend One', blend_type: 'English', rating: 4 }],
    bottles: [{ id: 'w1', name: 'Whiskey One', type: 'Islay', quantity: 1, rating: 4 }],
    wines: [{ id: 'v1', name: 'Wine One', style: 'red', quantity: 1, rating: 4 }],
    cigars: [{ id: 'c1', name: 'Cigar One', singles_equivalent: 3, rating: 4 }],
    smokingLogs: [],
    tastingLogs: [],
    cigarSessions: [],
    ...overrides,
  };
}

describe('generatePairingRecommendations', () => {
  it('builds whiskey + cigar recommendations when whiskey and cigar data are available', () => {
    const pairings = generatePairingRecommendations(
      baseContext({ activeModules: { pipekeeper: false, winekeeper: false } })
    );

    const whiskeyCigar = pairings.filter((p) => p.pairingFamily === 'whiskey_cigar');
    expect(whiskeyCigar.length).toBeGreaterThan(0);
    whiskeyCigar.forEach((pairing) => {
      expect(pairing.smokingSessionType).toBe('cigar');
      expect(pairing.liquidType).toBe('whiskey');
      expect(pairing.cigar?.id).toBe('c1');
      expect(pairing.bottle?.id).toBe('w1');
    });
  });

  it('always chooses pipe + tobacco + liquid together for pipe session families', () => {
    const pairings = generatePairingRecommendations(
      baseContext({ activeModules: { winekeeper: false, cigarkeeper: false } })
    );

    const whiskeyPipe = pairings.filter((p) => p.pairingFamily === 'whiskey_pipe_session');
    expect(whiskeyPipe.length).toBeGreaterThan(0);
    whiskeyPipe.forEach((pairing) => {
      expect(pairing.smokingSessionType).toBe('pipe_session');
      expect(pairing.pipe?.id).toBeTruthy();
      expect(pairing.blend?.id).toBeTruthy();
      expect(pairing.bottle?.id).toBeTruthy();
      expect(pairing.blendBridge?.id).toBeTruthy();
    });
  });

  it('supports wine + cigar and wine + pipe session families when wine module is enabled', () => {
    const pairings = generatePairingRecommendations(baseContext());

    const families = new Set(pairings.map((p) => p.pairingFamily));
    expect(families.has('wine_cigar')).toBe(true);
    expect(families.has('wine_pipe_session')).toBe(true);

    pairings
      .filter((p) => p.liquidType === 'wine')
      .forEach((pairing) => {
        expect(pairing.wine?.recordType).toBe('wine');
        expect(pairing.rightItem?.recordType).toBe('wine');
      });
  });

  it('respects ai_excluded, not_for_me, and zero inventory constraints', () => {
    const pairings = generatePairingRecommendations(
      baseContext({
        bottles: [
          { id: 'w0', name: 'Excluded Whiskey', ai_excluded: true, quantity: 1 },
          { id: 'w2', name: 'Out Whiskey', quantity: 0 },
          { id: 'w3', name: 'Eligible Whiskey', quantity: 1 },
        ],
        cigars: [
          { id: 'c0', name: 'Not For Me', not_for_me: true, singles_equivalent: 4 },
          { id: 'c2', name: 'Out Cigar', singles_equivalent: 0 },
          { id: 'c3', name: 'Eligible Cigar', singles_equivalent: 2 },
        ],
        activeModules: { pipekeeper: false, winekeeper: false },
      })
    );

    const whiskeyCigar = pairings.filter((p) => p.pairingFamily === 'whiskey_cigar');
    expect(whiskeyCigar.length).toBeGreaterThan(0);
    whiskeyCigar.forEach((pairing) => {
      expect(pairing.cigar?.id).toBe('c3');
      expect(pairing.bottle?.id).toBe('w3');
    });
  });

  it('does not generate unsupported or arbitrary pairing family combinations', () => {
    const allowed = new Set([
      'whiskey_cigar',
      'whiskey_pipe_session',
      'wine_cigar',
      'wine_pipe_session',
    ]);

    const pairings = generatePairingRecommendations(baseContext());
    pairings.forEach((pairing) => {
      expect(allowed.has(pairing.pairingFamily)).toBe(true);
    });
  });

  it('hides families when required modules are disabled even if data exists', () => {
    const pairings = generatePairingRecommendations(
      baseContext({
        activeModules: {
          pipekeeper: true,
          whiskeykeeper: true,
          winekeeper: false,
          cigarkeeper: false,
        },
      })
    );

    expect(pairings.every((p) => p.pairingFamily === 'whiskey_pipe_session')).toBe(true);
  });
});
