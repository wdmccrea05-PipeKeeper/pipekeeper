/* eslint-disable */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { classifyIntent } from '@/lib/curator/curatorChatIntent.js';
import {
  isRecommendationRequest,
  detectRejection,
  resolveReference,
  extractRecommendationsFromResponse,
  mergeConversationState,
  buildEffectiveQuery,
} from '@/lib/curator/conversationState.js';

// ─── Test collection ──────────────────────────────────────────────────────────
const TEST_PIPES = [
  { id: 'p1', name: 'Boswell Jumbo', maker: 'Boswell', shape: 'Freehand', bowl_material: 'Briar', focus: ['Aromatic'], chamber_volume: 'Large' },
  { id: 'p2', name: 'Savinelli 320 EX', maker: 'Savinelli', shape: 'Bent Apple', bowl_material: 'Briar', focus: ['Virginia', 'English'], chamber_volume: 'Medium' },
  { id: 'p3', name: 'Peterson System Standard', maker: 'Peterson', shape: 'Bent', bowl_material: 'Briar', focus: ['Aromatic', 'Virginia'], chamber_volume: 'Medium' },
  { id: 'p4', name: 'Falcon', maker: 'Falcon', shape: 'Other', bowl_material: 'Briar', focus: [], chamber_volume: 'Medium' },
];

const TEST_BLENDS = [
  { id: 'b1', name: 'Captain Black Gold', manufacturer: 'Captain Black', blend_type: 'Aromatic', is_aromatic: true, strength: 'Mild' },
  { id: 'b2', name: 'English Luxury', manufacturer: 'McClelland', blend_type: 'English', is_aromatic: false, strength: 'Medium-Full' },
  { id: 'b3', name: 'Virginia No. 1', manufacturer: 'F&T', blend_type: 'Virginia', is_aromatic: false, strength: 'Mild-Medium' },
  { id: 'b4', name: 'Aromatic Cherry', manufacturer: 'Lane', blend_type: 'Aromatic', is_aromatic: true, strength: 'Mild' },
];

// ─── Multi-turn test conversation ─────────────────────────────────────────────
const TURNS = [
  {
    label: 'Turn 1 — initial travel pipe recommendation',
    message: 'I have a trip coming up and would like to take 1 pipe and a couple blends, an aromatic and a non-aromatic. What would be the best pipe to take from my collection that can accommodate both, has a medium to large bowl, is not the Falcon?',
    expectedIntent: 'DIRECT_RECOMMENDATION',
    shouldNotBeConstraint: true,
  },
  {
    label: 'Turn 2 — same question, different phrasing',
    message: 'Which pipe should I take?',
    expectedIntent: 'DIRECT_RECOMMENDATION',
  },
  {
    label: 'Turn 3 — reject first choice, ask for next best',
    message: "The Jumbo is a bit bulky. What's the next best choice?",
    expectedIntent: 'FOLLOW_UP_NEXT_CANDIDATE',
    expectRejection: true,
    rejectedItemName: 'Boswell Jumbo',
  },
  {
    label: 'Turn 4 — narrow down by bowl size',
    message: 'Which of those has the smaller bowl?',
    // "which of those" doesn't match a specific intent pattern, so it falls
    // through to UNKNOWN → LLM, which is correct (the LLM has conversation history)
  },
  {
    label: 'Turn 5 — ask for blend recommendations',
    message: 'Okay, what two blends would you take with that one?',
    // "what two blends" → may match SESSION_RECOMMENDATION or UNKNOWN → LLM
  },
  {
    label: 'Turn 6 — modify blend selection',
    message: "Make the aromatic one something I haven't smoked recently.",
    // "haven't smoked recently" → UNUSED_QUERY → LLM
    expectedIntent: 'UNUSED_QUERY',
  },
  {
    label: 'Turn 7 — remove aromatic, request two non-aromatics',
    message: 'Actually, forget the aromatic. Give me two non-aromatics instead.',
    // "Give me" triggers isRecommendationRequest → NOT FOLLOW_UP_CONSTRAINT
    shouldNotBeConstraint: true,
  },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Curator Console — conversational continuity regression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══ Failure 1: Intent parser misclassification ═══════════════════════════════

  describe('Failure 1 — intent parser: qualifier not extracted as standalone constraint', () => {
    it('classifies the travel pipe request as DIRECT_RECOMMENDATION, not FOLLOW_UP_CONSTRAINT', () => {
      const msg = TURNS[0].message;
      const intent = classifyIntent(msg);
      expect(intent).not.toBe('FOLLOW_UP_CONSTRAINT');
      expect(intent).toBe('DIRECT_RECOMMENDATION');
    });

    it('does NOT classify "an aromatic and a non-aromatic" as a constraint when part of a recommendation request', () => {
      const msg = 'What would be the best pipe that can handle an aromatic and a non-aromatic?';
      expect(classifyIntent(msg)).not.toBe('FOLLOW_UP_CONSTRAINT');
    });

    it('still classifies "keep it non-aromatic" as FOLLOW_UP_CONSTRAINT (no recommendation request)', () => {
      const msg = 'keep it non-aromatic';
      expect(classifyIntent(msg)).toBe('FOLLOW_UP_CONSTRAINT');
    });

    it('still classifies "I want to leave it non-aromatic" as FOLLOW_UP_CONSTRAINT', () => {
      const msg = 'I want to leave it non-aromatic';
      expect(classifyIntent(msg)).toBe('FOLLOW_UP_CONSTRAINT');
    });

    it('classifies "Give me two non-aromatics instead" as a recommendation, not a constraint', () => {
      const msg = 'Actually, forget the aromatic. Give me two non-aromatics instead.';
      expect(classifyIntent(msg)).not.toBe('FOLLOW_UP_CONSTRAINT');
    });

    it('isRecommendationRequest correctly identifies the travel pipe message', () => {
      expect(isRecommendationRequest(TURNS[0].message)).toBe(true);
    });

    it('isRecommendationRequest rejects constraint-only messages', () => {
      expect(isRecommendationRequest('keep it non-aromatic')).toBe(false);
      expect(isRecommendationRequest('I want to leave it non-aromatic')).toBe(false);
      expect(isRecommendationRequest('exclude Falcons')).toBe(false);
    });
  });

  // ═══ Failure 2: Lost conversational state ═════════════════════════════════════

  describe('Failure 2 — conversational state: rejection and reference resolution', () => {
    it('detects rejection of "the Jumbo" and resolves to Boswell Jumbo', () => {
      const recommendations = [{ name: 'Boswell Jumbo', rank: 1 }];
      const rejection = detectRejection(TURNS[2].message, recommendations, TEST_PIPES);
      expect(rejection).not.toBeNull();
      expect(rejection.rejectedItemName).toBe('Boswell Jumbo');
      expect(rejection.reason).toBe('too bulky/large');
      expect(rejection.newPreference).toBe('portability');
    });

    it('detects "not that one" rejection of the most recent recommendation', () => {
      const recommendations = [{ name: 'Boswell Jumbo', rank: 1 }, { name: 'Savinelli 320 EX', rank: 2 }];
      const rejection = detectRejection("I don't want to take that one", recommendations, TEST_PIPES);
      expect(rejection).not.toBeNull();
      expect(rejection.rejectedItemName).toBe('Savinelli 320 EX');
    });

    it('detects "forget the aromatic" criterion removal', () => {
      const recommendations = [{ name: 'Captain Black Gold', rank: 1 }];
      const rejection = detectRejection('Actually, forget the aromatic.', recommendations, TEST_BLENDS);
      expect(rejection).not.toBeNull();
      expect(rejection.reason).toBe('criterion removed');
    });

    it('resolves "that one" to the most recent recommendation', () => {
      const recommendations = [{ name: 'Boswell Jumbo', rank: 1 }, { name: 'Savinelli 320 EX', rank: 2 }];
      expect(resolveReference('What blends with that one?', recommendations, TEST_PIPES)).toBe('Savinelli 320 EX');
    });

    it('resolves "which of those" to all recommendation names', () => {
      const recommendations = [{ name: 'Boswell Jumbo', rank: 1 }, { name: 'Savinelli 320 EX', rank: 2 }];
      const result = resolveReference('Which of those has the smaller bowl?', recommendations, TEST_PIPES);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContain('Boswell Jumbo');
      expect(result).toContain('Savinelli 320 EX');
    });
  });

  // ═══ Full multi-turn intent classification ═════════════════════════════════════

  describe('multi-turn intent classification — all 7 turns', () => {
    TURNS.forEach((turn, idx) => {
      it(`Turn ${idx + 1}: ${turn.label}`, () => {
        const intent = classifyIntent(turn.message);

        if (turn.expectedIntent) {
          expect(intent).toBe(turn.expectedIntent);
        }

        if (turn.shouldNotBeConstraint) {
          expect(intent).not.toBe('FOLLOW_UP_CONSTRAINT');
        }
      });
    });

    it('Turn 3 (FOLLOW_UP_NEXT_CANDIDATE) does NOT produce a dead-end "re-ask" response', () => {
      // The FOLLOW_UP_NEXT_CANDIDATE handler now returns null when
      // rankedCandidates is empty, which triggers LLM escalation.
      // This test verifies the intent is correctly classified as
      // FOLLOW_UP_NEXT_CANDIDATE (which will escalate to LLM).
      const intent = classifyIntent(TURNS[2].message);
      expect(intent).toBe('FOLLOW_UP_NEXT_CANDIDATE');
    });
  });

  // ═══ Conversation state merging ═══════════════════════════════════════════════

  describe('conversation state — inherited vs newly changed constraints', () => {
    it('follow-ups inherit prior constraints unless explicitly changed', () => {
      // Initial state: medium/large preferred, aromatic + non-aromatic required, Falcon excluded
      const initialState = {
        criteria: {
          bowlSize: 'medium-to-large',
          versatility: 'aromatic + non-aromatic',
        },
        exclusions: ['Falcon'],
        rejectedItems: [],
        preferences: {},
      };

      // Follow-up: "The Jumbo is too bulky" — adds rejection + portability preference
      const rejection = detectRejection(
        TURNS[2].message,
        [{ name: 'Boswell Jumbo', rank: 1 }],
        TEST_PIPES
      );
      const updatedState = mergeConversationState(initialState, {
        rejectedItems: [{ name: rejection.rejectedItemName, reason: rejection.reason }],
        preferences: { [rejection.newPreference]: 'high' },
      });

      // Original criteria are preserved
      expect(updatedState.criteria.bowlSize).toBe('medium-to-large');
      expect(updatedState.criteria.versatility).toBe('aromatic + non-aromatic');
      // Original exclusion is preserved
      expect(updatedState.exclusions).toContain('Falcon');
      // New rejection is added
      expect(updatedState.rejectedItems.length).toBe(1);
      expect(updatedState.rejectedItems[0].name).toBe('Boswell Jumbo');
      // New preference is added
      expect(updatedState.preferences.portability).toBe('high');
    });

    it('effective query includes all inherited constraints', () => {
      const state = {
        goal: 'recommend_travel_pipe',
        criteria: { bowlSize: 'medium-to-large', versatility: 'aromatic + non-aromatic' },
        exclusions: ['Falcon'],
        rejectedItems: [{ name: 'Boswell Jumbo', reason: 'too bulky/large' }],
        preferences: { portability: 'high' },
      };
      const query = buildEffectiveQuery(state);
      expect(query).toContain('medium-to-large');
      expect(query).toContain('aromatic + non-aromatic');
      expect(query).toContain('Falcon');
      expect(query).toContain('Boswell Jumbo');
      expect(query).toContain('portability: high');
    });
  });

  // ═══ Recommendation extraction from LLM responses ═════════════════════════════

  describe('recommendation extraction — preserves ranked items for follow-ups', () => {
    it('extracts numbered list items from LLM response', () => {
      const response = 'Here are my recommendations:\n1. Boswell Jumbo — great for travel\n2. Savinelli 320 EX — versatile\n3. Peterson System Standard — compact';
      const recs = extractRecommendationsFromResponse(response, { pipes: TEST_PIPES, blends: TEST_BLENDS });
      expect(recs.length).toBe(3);
      expect(recs[0].name).toBe('Boswell Jumbo');
      expect(recs[0].rank).toBe(1);
    });

    it('falls back to collection item names when no numbered list', () => {
      const response = 'I would recommend the Boswell Jumbo for your trip. It has a medium-to-large bowl and works well for both aromatic and non-aromatic blends.';
      const recs = extractRecommendationsFromResponse(response, { pipes: TEST_PIPES, blends: TEST_BLENDS });
      expect(recs.length).toBe(1);
      expect(recs[0].name).toBe('Boswell Jumbo');
    });
  });

  // ═══ Grounding: do not invent collection facts ═════════════════════════════════

  describe('grounding — recommendations must come from actual collection data', () => {
    it('extractRecommendationsFromResponse only returns items that appear in the response', () => {
      const response = 'The Savinelli 320 EX is the best pipe for your trip.';
      const recs = extractRecommendationsFromResponse(response, { pipes: TEST_PIPES, blends: TEST_BLENDS });
      expect(recs.length).toBe(1);
      expect(recs[0].name).toBe('Savinelli 320 EX');
      // Does not invent items not in the collection
      expect(recs.some(r => r.name === 'Dunhill')).toBe(false);
    });
  });
});