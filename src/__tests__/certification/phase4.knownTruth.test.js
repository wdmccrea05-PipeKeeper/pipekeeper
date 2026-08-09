/**
 * Phase 4 — Known Truth Validation
 *
 * Validates recommendations against accepted pipe-smoking knowledge.
 * These tests compare against domain expertise, NOT previous engine output.
 */

import { describe, test, expect } from 'vitest';
import { scorePipeBlend, rankPipesForBlend } from '@/components/utils/pairingScoreCanonical';
import { CERTIFICATION_BLENDS_BY_ARCHETYPE } from './fixtures/tobaccoDataset';
import { CERTIFICATION_PIPES } from './fixtures/pipeDataset';
import { USER_PROFILES } from './fixtures/userProfiles';

const pipes = CERTIFICATION_PIPES;
const profile = USER_PROFILES.empty;

function scoreAll(blend) {
  return pipes
    .filter((p) => !p.bowl_variants)
    .map((p) => ({ pipe: p, result: scorePipeBlend(p, blend, profile) }))
    .sort((a, b) => (b.result.finalScore || 0) - (a.result.finalScore || 0));
}

describe('Phase 4 — Known Truth Validation', () => {
  describe('Autumn Evening (Heavy Aromatic)', () => {
    const blend = CERTIFICATION_BLENDS_BY_ARCHETYPE['Heavy Aromatic'];

    test('aromatic-dedicated pipe scores highest', () => {
      const ranked = scoreAll(blend);
      const top = ranked[0];
      expect(
        top.pipe._archetype === 'Aromatic Dedicated' ||
        top.pipe._archetype === 'Meerschaum Pipe' ||
        (top.pipe.focus || []).some((f) => /aromatic/i.test(f))
      ).toBe(true);
    });

    test('english-dedicated pipe does not rank first', () => {
      const ranked = scoreAll(blend);
      const englishPipe = pipes.find((p) => p._archetype === 'English Dedicated');
      const englishRank = ranked.findIndex((r) => r.pipe.pipe_id === englishPipe?.pipe_id);
      const aromaticRank = ranked.findIndex((r) => r.pipe._archetype === 'Aromatic Dedicated');
      expect(aromaticRank).toBeLessThan(englishRank);
    });

    test('english pipe scores lower than general purpose for heavy aromatic', () => {
      const englishScore = scorePipeBlend(
        pipes.find((p) => p._archetype === 'English Dedicated'), blend, profile
      ).finalScore;
      const generalScore = scorePipeBlend(
        pipes.find((p) => p._archetype === 'General Purpose Pipe'), blend, profile
      ).finalScore;
      expect(generalScore).toBeGreaterThanOrEqual(englishScore);
    });
  });

  describe('Escudo (True VaPer)', () => {
    const blend = CERTIFICATION_BLENDS_BY_ARCHETYPE['True VaPer'];

    test('Virginia-dedicated pipe ranks above english-dedicated', () => {
      const virginiaScore = scorePipeBlend(
        pipes.find((p) => p._archetype === 'Virginia Dedicated'), blend, profile
      ).finalScore;
      const englishScore = scorePipeBlend(
        pipes.find((p) => p._archetype === 'English Dedicated'), blend, profile
      ).finalScore;
      expect(virginiaScore).toBeGreaterThanOrEqual(englishScore);
    });

    test('aromatic-dedicated pipe does not top the ranking for VaPer', () => {
      const ranked = scoreAll(blend);
      const aromaticRank = ranked.findIndex((r) => r.pipe._archetype === 'Aromatic Dedicated');
      const virginiaRank = ranked.findIndex((r) => r.pipe._archetype === 'Virginia Dedicated');
      expect(virginiaRank).toBeLessThanOrEqual(aromaticRank);
    });
  });

  describe('Early Morning Pipe (English)', () => {
    const blend = CERTIFICATION_BLENDS_BY_ARCHETYPE['English'];

    test('english-dedicated pipe scores higher than aromatic-dedicated', () => {
      const englishScore = scorePipeBlend(
        pipes.find((p) => p._archetype === 'English Dedicated'), blend, profile
      ).finalScore;
      const aromaticScore = scorePipeBlend(
        pipes.find((p) => p._archetype === 'Aromatic Dedicated'), blend, profile
      ).finalScore;
      expect(englishScore).toBeGreaterThan(aromaticScore);
    });

    test('english pipe ranks in top 2 for early morning pipe blend', () => {
      const ranked = scoreAll(blend);
      const englishRank = ranked.findIndex((r) => r.pipe._archetype === 'English Dedicated');
      expect(englishRank).toBeLessThan(2);
    });
  });

  describe('Nightcap (Full English)', () => {
    const blend = CERTIFICATION_BLENDS_BY_ARCHETYPE['English Aromatic'];

    test('large english pipe scores highest for nightcap', () => {
      const largeEnglishScore = scorePipeBlend(
        pipes.find((p) => p._archetype === 'Large English'), blend, profile
      ).finalScore;
      const aromaticScore = scorePipeBlend(
        pipes.find((p) => p._archetype === 'Aromatic Dedicated'), blend, profile
      ).finalScore;
      expect(largeEnglishScore).toBeGreaterThan(aromaticScore);
    });

    test('english-dedicated pipes score highly for nightcap', () => {
      const englishScore = scorePipeBlend(
        pipes.find((p) => p._archetype === 'English Dedicated'), blend, profile
      ).finalScore;
      expect(englishScore).toBeGreaterThan(5.0);
    });
  });

  describe('Orlik Golden Sliced (Straight Virginia)', () => {
    const blend = CERTIFICATION_BLENDS_BY_ARCHETYPE['Straight Virginia'];

    test('virginia-dedicated pipe scores highest for Orlik Golden Sliced', () => {
      const virginiaScore = scorePipeBlend(
        pipes.find((p) => p._archetype === 'Virginia Dedicated'), blend, profile
      ).finalScore;
      const aromaticScore = scorePipeBlend(
        pipes.find((p) => p._archetype === 'Aromatic Dedicated'), blend, profile
      ).finalScore;
      expect(virginiaScore).toBeGreaterThan(aromaticScore);
    });

    test('aromatic-dedicated pipe is penalized for virginia', () => {
      const aromaticScore = scorePipeBlend(
        pipes.find((p) => p._archetype === 'Aromatic Dedicated'), blend, profile
      ).finalScore;
      const virginiaScore = scorePipeBlend(
        pipes.find((p) => p._archetype === 'Virginia Dedicated'), blend, profile
      ).finalScore;
      expect(virginiaScore).toBeGreaterThan(aromaticScore);
    });
  });

  describe('Haunted Bookshop (Burley)', () => {
    const blend = CERTIFICATION_BLENDS_BY_ARCHETYPE['Burley'];

    test('general purpose pipe is viable for burley blend', () => {
      const generalScore = scorePipeBlend(
        pipes.find((p) => p._archetype === 'General Purpose Pipe'), blend, profile
      ).finalScore;
      expect(generalScore).toBeGreaterThan(5.0);
    });

    test('english-dedicated pipe does not dominate for burley', () => {
      const englishScore = scorePipeBlend(
        pipes.find((p) => p._archetype === 'English Dedicated'), blend, profile
      ).finalScore;
      const generalScore = scorePipeBlend(
        pipes.find((p) => p._archetype === 'General Purpose Pipe'), blend, profile
      ).finalScore;
      expect(generalScore).toBeGreaterThanOrEqual(englishScore);
    });
  });

  describe('Unknown Family blend', () => {
    const blend = CERTIFICATION_BLENDS_BY_ARCHETYPE['Unknown Family'];

    test('unknown family never behaves identically to Virginia', () => {
      const unknownScore = scorePipeBlend(
        pipes.find((p) => p._archetype === 'Virginia Dedicated'), blend, profile
      ).finalScore;
      const virginiaBlend = { ...CERTIFICATION_BLENDS_BY_ARCHETYPE['Straight Virginia'] };
      const virginiaScore = scorePipeBlend(
        pipes.find((p) => p._archetype === 'Virginia Dedicated'), virginiaBlend, profile
      ).finalScore;
      expect(unknownScore).not.toBe(virginiaScore);
    });

    test('unknown family never behaves identically to Aromatic', () => {
      const unknownScore = scorePipeBlend(
        pipes.find((p) => p._archetype === 'Aromatic Dedicated'), blend, profile
      ).finalScore;
      const aromaticBlend = CERTIFICATION_BLENDS_BY_ARCHETYPE['Heavy Aromatic'];
      const aromaticScore = scorePipeBlend(
        pipes.find((p) => p._archetype === 'Aromatic Dedicated'), aromaticBlend, profile
      ).finalScore;
      expect(unknownScore).not.toBe(aromaticScore);
    });
  });
});
