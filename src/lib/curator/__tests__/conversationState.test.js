import { describe, expect, it } from 'vitest';
import {
  isRecommendationRequest,
  detectRejection,
  resolveReference,
  extractRecommendationsFromResponse,
  mergeConversationState,
  buildEffectiveQuery,
  isFollowUpMessage,
} from '../conversationState.js';

describe('conversationState — isRecommendationRequest', () => {
  it('identifies explicit recommendation requests', () => {
    expect(isRecommendationRequest('What would be the best pipe to take from my collection?')).toBe(true);
    expect(isRecommendationRequest('Which pipe should I take?')).toBe(true);
    expect(isRecommendationRequest('Give me two non-aromatics instead')).toBe(true);
    expect(isRecommendationRequest('What two blends would you take with that one?')).toBe(true);
    expect(isRecommendationRequest('Recommend a good Virginia flake')).toBe(true);
    expect(isRecommendationRequest('Suggest something for tonight')).toBe(true);
  });

  it('rejects constraint-only messages', () => {
    expect(isRecommendationRequest('keep it non-aromatic')).toBe(false);
    expect(isRecommendationRequest('I want to leave it non-aromatic')).toBe(false);
    expect(isRecommendationRequest('exclude Falcons')).toBe(false);
    expect(isRecommendationRequest('non-aromatic only')).toBe(false);
  });

  it('handles the exact Failure 1 message as a recommendation request', () => {
    const msg = 'I have a trip coming up and would like to take 1 pipe and a couple blends, an aromatic and a non-aromatic. What would be the best pipe to take from my collection that can accommodate both, has a medium to large bowl, is not the Falcon?';
    expect(isRecommendationRequest(msg)).toBe(true);
  });
});

describe('conversationState — detectRejection', () => {
  const recommendations = [
    { name: 'Boswell Jumbo', rank: 1 },
    { name: 'Savinelli 320 EX', rank: 2 },
  ];
  const collectionItems = [
    { name: 'Boswell Jumbo' },
    { name: 'Savinelli 320 EX' },
    { name: 'Falcon' },
  ];

  it('detects "too bulky" rejection and resolves the item by name fragment', () => {
    const result = detectRejection('The Jumbo is a bit bulky. What is the next best choice?', recommendations, collectionItems);
    expect(result).not.toBeNull();
    expect(result.rejectedItemName).toBe('Boswell Jumbo');
    expect(result.reason).toBe('too bulky/large');
    expect(result.newPreference).toBe('portability');
  });

  it('detects "not that one" rejection of the most recent recommendation', () => {
    const result = detectRejection('I don\'t want to take that one', recommendations, collectionItems);
    expect(result).not.toBeNull();
    expect(result.rejectedItemName).toBe('Savinelli 320 EX');
    expect(result.reason).toBe('not wanted');
  });

  it('detects "something smaller" preference without a specific item', () => {
    const result = detectRejection('something smaller and more portable', recommendations, collectionItems);
    expect(result).not.toBeNull();
    expect(result.newPreference).toBe('portability');
  });

  it('detects "forget the" criterion removal', () => {
    const result = detectRejection('Actually, forget the aromatic.', recommendations, collectionItems);
    expect(result).not.toBeNull();
    expect(result.reason).toBe('criterion removed');
  });

  it('returns null for non-rejection messages', () => {
    expect(detectRejection('Which pipe should I take?', recommendations, collectionItems)).toBeNull();
    expect(detectRejection('What is the best pipe?', recommendations, collectionItems)).toBeNull();
    expect(detectRejection('Tell me about Virginia flakes', recommendations, collectionItems)).toBeNull();
  });

  it('returns null when there are no prior recommendations and no specific item match', () => {
    expect(detectRejection('that one is too bulky', [], [])).toBeNull();
  });
});

describe('conversationState — resolveReference', () => {
  const recommendations = [
    { name: 'Boswell Jumbo', rank: 1 },
    { name: 'Savinelli 320 EX', rank: 2 },
    { name: 'Peterson System', rank: 3 },
  ];
  const collectionItems = [
    { name: 'Boswell Jumbo' },
    { name: 'Savinelli 320 EX' },
  ];

  it('resolves "the first one" to the first recommendation', () => {
    expect(resolveReference('Which of the first one?', recommendations, collectionItems)).toBe('Boswell Jumbo');
  });

  it('resolves "that one" to the most recent recommendation', () => {
    expect(resolveReference('What blends would you take with that one?', recommendations, collectionItems)).toBe('Peterson System');
  });

  it('resolves "the jumbo" by name fragment', () => {
    expect(resolveReference('The Jumbo is a bit bulky', recommendations, collectionItems)).toBe('Boswell Jumbo');
  });

  it('resolves "which of those" to all recommendation names', () => {
    const result = resolveReference('Which of those has the smaller bowl?', recommendations, collectionItems);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toContain('Boswell Jumbo');
    expect(result).toContain('Savinelli 320 EX');
    expect(result).toContain('Peterson System');
  });

  it('returns null when no reference is found', () => {
    expect(resolveReference('What should I smoke tonight?', recommendations, collectionItems)).toBeNull();
  });
});

describe('conversationState — extractRecommendationsFromResponse', () => {
  const collectionContext = {
    pipes: [{ name: 'Boswell Jumbo' }, { name: 'Savinelli 320 EX' }],
    blends: [{ name: 'Captain Black Gold' }, { name: 'English Luxury' }],
  };

  it('extracts numbered list items from LLM response', () => {
    const response = 'Here are my recommendations:\n1. Boswell Jumbo — great for travel\n2. Savinelli 320 EX — versatile\n3. Peterson System — compact';
    const recs = extractRecommendationsFromResponse(response, collectionContext);
    expect(recs.length).toBe(3);
    expect(recs[0].name).toBe('Boswell Jumbo');
    expect(recs[0].rank).toBe(1);
    expect(recs[1].name).toBe('Savinelli');
    expect(recs[2].name).toBe('Peterson System');
  });

  it('falls back to collection item names when no numbered list', () => {
    const response = 'I would recommend the Boswell Jumbo for your trip. It has a medium-to-large bowl and works well for both aromatic and non-aromatic blends.';
    const recs = extractRecommendationsFromResponse(response, collectionContext);
    expect(recs.length).toBe(1);
    expect(recs[0].name).toBe('Boswell Jumbo');
  });

  it('returns empty array for empty response', () => {
    expect(extractRecommendationsFromResponse('', collectionContext)).toEqual([]);
    expect(extractRecommendationsFromResponse(null, collectionContext)).toEqual([]);
  });
});

describe('conversationState — mergeConversationState', () => {
  it('accumulates exclusions and rejected items', () => {
    const existing = {
      exclusions: ['Falcon'],
      rejectedItems: [{ name: 'Boswell Jumbo', reason: 'too bulky' }],
    };
    const newInfo = {
      exclusions: ['Peterson'],
      rejectedItems: [{ name: 'Savinelli 320 EX', reason: 'not wanted' }],
    };
    const merged = mergeConversationState(existing, newInfo);
    expect(merged.exclusions).toContain('Falcon');
    expect(merged.exclusions).toContain('Peterson');
    expect(merged.rejectedItems.length).toBe(2);
  });

  it('merges criteria with new overriding old', () => {
    const existing = { criteria: { bowlSize: 'medium', versatility: 'both' } };
    const newInfo = { criteria: { bowlSize: 'large' } };
    const merged = mergeConversationState(existing, newInfo);
    expect(merged.criteria.bowlSize).toBe('large');
    expect(merged.criteria.versatility).toBe('both');
  });

  it('removes criteria when explicitly requested', () => {
    const existing = { criteria: { aromatic: true, nonAromatic: true } };
    const newInfo = { removedCriteria: ['aromatic'] };
    const merged = mergeConversationState(existing, newInfo);
    expect(merged.criteria.aromatic).toBeUndefined();
    expect(merged.criteria.nonAromatic).toBe(true);
  });

  it('deduplicates recommendations by name', () => {
    const existing = { recommendations: [{ name: 'Boswell Jumbo', rank: 1 }] };
    const newInfo = { recommendations: [{ name: 'Boswell Jumbo', rank: 1 }, { name: 'Savinelli 320 EX', rank: 2 }] };
    const merged = mergeConversationState(existing, newInfo);
    expect(merged.recommendations.length).toBe(2);
    expect(merged.recommendations[0].name).toBe('Boswell Jumbo');
    expect(merged.recommendations[1].name).toBe('Savinelli 320 EX');
  });
});

describe('conversationState — buildEffectiveQuery', () => {
  it('builds a query string from conversation state', () => {
    const state = {
      goal: 'recommend_travel_pipe',
      criteria: { bowlSize: 'medium-to-large', versatility: 'aromatic + non-aromatic' },
      exclusions: ['Falcon'],
      rejectedItems: [{ name: 'Boswell Jumbo', reason: 'too bulky' }],
      preferences: { portability: 'high' },
    };
    const query = buildEffectiveQuery(state);
    expect(query).toContain('recommend_travel_pipe');
    expect(query).toContain('Excluding: Falcon');
    expect(query).toContain('Boswell Jumbo');
    expect(query).toContain('portability: high');
  });

  it('returns empty string for empty state', () => {
    expect(buildEffectiveQuery({})).toBe('');
  });
});

describe('conversationState — isFollowUpMessage', () => {
  it('detects follow-up signals when there are prior recommendations', () => {
    const state = { recommendations: [{ name: 'Boswell Jumbo' }] };
    expect(isFollowUpMessage('The Jumbo is a bit bulky. What\'s the next best choice?', state)).toBe(true);
    expect(isFollowUpMessage('Which of those has the smaller bowl?', state)).toBe(true);
    expect(isFollowUpMessage('Give me another option', state)).toBe(true);
  });

  it('returns false when there are no prior recommendations', () => {
    expect(isFollowUpMessage('What is the next best choice?', {})).toBe(false);
  });
});