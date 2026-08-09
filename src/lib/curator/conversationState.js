/**
 * conversationState.js
 *
 * Structured conversation state for Curator Console.
 *
 * Maintains continuity across multi-turn conversations by tracking:
 * - current user goal
 * - collection/module being analyzed
 * - inclusion criteria
 * - exclusions
 * - preferences
 * - previously recommended items
 * - rejected items with reasons
 * - user feedback on recommendations
 *
 * Follow-up messages inherit prior constraints unless the user explicitly
 * changes or removes them. References like "the jumbo", "that one", "next best"
 * are resolved against the existing conversation state.
 */

// ─── Recommendation request detection ─────────────────────────────────────────

/**
 * Determine whether a message is a recommendation REQUEST (asking for a
 * suggestion) rather than a constraint or follow-up modification.
 *
 * When this returns true, qualifier words like "non-aromatic" are part of
 * the recommendation criteria (describing what the user wants), NOT standalone
 * constraints on a pipe/item.
 *
 * @param {string} message
 * @returns {boolean}
 */
export function isRecommendationRequest(message) {
  const t = String(message || '').toLowerCase();
  return /\b(what (is|would be|should|do you|can you|could you)|which (pipe|blend|bottle|tobacco|whiskey|cigar|wine)|recommend|suggest|best (pipe|blend|bottle|tobacco|whiskey|cigar|wine)|give me|what about|how about|what.*take|what.*bring|what.*should i)\b/i.test(t);
}

// ─── Rejection detection ───────────────────────────────────────────────────────

const REJECTION_PHRASES = [
  /\b(too (bulky|big|heavy|large|tall|long|wide))\b/i,
  /\b(a bit (bulky|big|heavy|large|tall|long|wide))\b/i,
  /\b(not that one|don't want that|don't want to take that|pass on that|skip that|i don't want that one)\b/i,
  /\b(not that brand|not that maker|not from them)\b/i,
  /\b(something (smaller|lighter|shorter|more portable|more compact|less bulky))\b/i,
  /\b(forget the|drop the|never mind the|scratch that)\b/i,
];

/**
 * Detect if a message is rejecting a previous recommendation.
 *
 * Returns { rejectedItemName, reason, newPreference } or null.
 *
 * The rejected item is resolved by matching name fragments against the
 * previously recommended items and collection items. If no specific item
 * is matched but a rejection phrase is present, the most recently
 * recommended item is rejected.
 *
 * @param {string} message
 * @param {Array<{name: string, rank?: number}>} recommendations — previously recommended items
 * @param {Array<{name: string}>} collectionItems — all collection items (pipes, blends, etc.)
 * @returns {{ rejectedItemName: string, reason: string, newPreference: string|null } | null}
 */
export function detectRejection(message, recommendations = [], collectionItems = []) {
  const text = String(message || '').toLowerCase();
  if (!text) return null;

  const hasRejectionPhrase = REJECTION_PHRASES.some((p) => p.test(text));
  if (!hasRejectionPhrase) return null;

  // Determine reason and new preference from the rejection phrase
  let reason = 'user rejected';
  let newPreference = null;

  if (/\btoo (bulky|big|heavy|large|tall|long|wide)\b/i.test(text) || /\ba bit (bulky|big|heavy|large|tall|long|wide)\b/i.test(text)) {
    reason = 'too bulky/large';
    newPreference = 'portability';
  } else if (/\bsomething (smaller|lighter|shorter|more portable|more compact|less bulky)\b/i.test(text)) {
    reason = 'user wants something smaller/lighter';
    newPreference = 'portability';
  } else if (/\bnot that (brand|maker)\b/i.test(text)) {
    reason = 'brand/maker rejected';
    newPreference = 'different brand';
  } else if (/\bforget the|drop the|never mind the|scratch that\b/i.test(text)) {
    reason = 'criterion removed';
    newPreference = null;
  } else if (/\bnot that one|don't want that|don't want to take that|pass on that|skip that|i don't want that one\b/i.test(text)) {
    reason = 'not wanted';
    newPreference = null;
  }

  // Try to resolve the rejected item by matching name fragments
  const allCandidates = [...recommendations, ...collectionItems];
  for (const item of allCandidates) {
    const name = String(item?.name || '').toLowerCase();
    if (!name || name.length < 2) continue;

    // Check if the full name appears in the message
    if (text.includes(name)) {
      return { rejectedItemName: item.name, reason, newPreference };
    }

    // Check if significant words from the name appear in the message
    const words = name.split(/\s+/).filter((w) => w.length > 3);
    for (const w of words) {
      if (w.length > 3 && text.includes(w)) {
        return { rejectedItemName: item.name, reason, newPreference };
      }
    }
  }

  // If no specific item matched but there's a generic rejection phrase,
  // reject the most recently recommended item
  if (/\bnot that one|don't want that|don't want to take that|pass on that|skip that|i don't want that one\b/i.test(text)) {
    if (recommendations.length > 0) {
      const last = recommendations[recommendations.length - 1];
      return { rejectedItemName: last.name, reason, newPreference };
    }
  }

  // If a rejection/preference phrase was detected but no specific item was
  // matched, still return the result — the preference applies generally
  // to the ongoing conversation (e.g., "something smaller" or "forget the
  // aromatic"). rejectedItemName is null when no specific item is rejected.
  if (recommendations.length > 0 || /\bforget the|drop the|never mind the|scratch that\b/i.test(text)) {
    return { rejectedItemName: null, reason, newPreference };
  }

  return null;
}

// ─── Reference resolution ──────────────────────────────────────────────────────

/**
 * Resolve a reference in the message to previously recommended items.
 *
 * Handles references like:
 * - "that one" / "this one" → most recent recommendation
 * - "the first one" → first recommendation
 * - "the last one" → last recommendation
 * - "the jumbo" → match by name fragment
 * - "which of those" / "which of these" → all recommendations
 *
 * @param {string} message
 * @param {Array<{name: string, rank?: number}>} recommendations
 * @param {Array<{name: string}>} collectionItems
 * @returns {string|Array<string>|null} — resolved item name, array of names, or null
 */
export function resolveReference(message, recommendations = [], collectionItems = []) {
  const text = String(message || '').toLowerCase();
  if (!text || !recommendations.length) return null;

  // "the first one" → first recommendation
  if (/\b(the first one|first one|the first)\b/i.test(text)) {
    return recommendations[0]?.name || null;
  }

  // "the last one" → last recommendation
  if (/\b(the last one|last one|the last)\b/i.test(text)) {
    return recommendations[recommendations.length - 1]?.name || null;
  }

  // "that one" / "this one" / "that pipe" / "that blend" → most recent recommendation
  if (/\b(that one|this one|that pipe|that blend|that bottle|that cigar|that wine)\b/i.test(text)) {
    return recommendations[recommendations.length - 1]?.name || null;
  }

  // "which of those" / "which of these" → all recommendations
  if (/\bwhich of (those|these)\b/i.test(text)) {
    return recommendations.map((r) => r.name).filter(Boolean);
  }

  // Look for item name fragments from recommendations and collection
  const allCandidates = [...recommendations, ...collectionItems];
  for (const item of allCandidates) {
    const name = String(item?.name || '').toLowerCase();
    if (!name || name.length < 2) continue;

    // Full name match
    if (text.includes(name)) return item.name;

    // All significant words match
    const words = name.split(/\s+/).filter((w) => w.length > 3);
    if (words.length > 0 && words.every((w) => text.includes(w))) return item.name;

    // Single significant word match (e.g., "the jumbo" → "Boswell Jumbo")
    for (const w of words) {
      if (w.length > 3 && text.includes(w)) return item.name;
    }
  }

  return null;
}

// ─── Recommendation extraction from LLM responses ─────────────────────────────

/**
 * Extract recommended items from an LLM response text.
 *
 * Looks for:
 * 1. Numbered list items (1. Item Name — reason)
 * 2. Collection item names mentioned in the response
 *
 * @param {string} responseText
 * @param {object} collectionContext — { pipes, blends, bottles, wines, cigars }
 * @returns {Array<{name: string, rank: number}>}
 */
export function extractRecommendationsFromResponse(responseText, collectionContext = {}) {
  if (!responseText) return [];
  const text = String(responseText);
  const recommendations = [];

  // 1. Look for numbered list items: "1. Item Name" or "1. **Item Name**"
  const numberedRegex = /\d+\.\s+\*{0,2}([A-Z][a-zA-Z]+(?:\s+[A-Z&][a-zA-Z'']+){0,4})\*{0,2}/g;
  let match;
  while ((match = numberedRegex.exec(text)) !== null) {
    const name = match[1].trim();
    if (name && name.length > 2 && !recommendations.some((r) => r.name === name)) {
      recommendations.push({ name, rank: recommendations.length + 1 });
    }
  }

  // 2. If no numbered items found, look for collection item names in the response
  if (recommendations.length === 0) {
    const allItems = [
      ...(collectionContext.pipes || []),
      ...(collectionContext.blends || []),
      ...(collectionContext.bottles || []),
      ...(collectionContext.wines || []),
      ...(collectionContext.cigars || []),
    ];
    for (const item of allItems) {
      const name = item?.name;
      if (name && text.includes(name) && !recommendations.some((r) => r.name === name)) {
        recommendations.push({ name, rank: recommendations.length + 1 });
      }
    }
  }

  return recommendations.slice(0, 5);
}

// ─── Conversation state merging ────────────────────────────────────────────────

/**
 * Merge new information into existing conversation state.
 *
 * Follow-ups inherit prior constraints unless explicitly changed.
 * Exclusions and rejected items are accumulated (never removed except by
 * explicit `removedExclusions` / `removedRejected`).
 *
 * @param {object} existingState
 * @param {object} newInfo
 * @returns {object} — merged state
 */
export function mergeConversationState(existingState = {}, newInfo = {}) {
  const merged = {
    ...existingState,
    ...newInfo,
    // Merge criteria (new overrides, but don't remove existing unless explicitly cleared)
    criteria: { ...(existingState.criteria || {}), ...(newInfo.criteria || {}) },
    // Accumulate exclusions
    exclusions: [...new Set([
      ...(existingState.exclusions || []),
      ...(newInfo.exclusions || []),
    ])],
    // Accumulate rejected items
    rejectedItems: [...(existingState.rejectedItems || []), ...(newInfo.rejectedItems || [])],
    // Merge preferences (new overrides)
    preferences: { ...(existingState.preferences || {}), ...(newInfo.preferences || {}) },
    // Keep recommendation history (append new, dedupe by name)
    recommendations: [
      ...(existingState.recommendations || []),
      ...(newInfo.recommendations || []),
    ].filter((r, idx, arr) => arr.findIndex((x) => x.name === r.name) === idx),
  };

  // Explicitly remove criteria (e.g., "forget the aromatic")
  if (newInfo.removedCriteria) {
    for (const key of newInfo.removedCriteria) {
      delete merged.criteria[key];
    }
  }

  // Explicitly remove exclusions
  if (newInfo.removedExclusions) {
    merged.exclusions = merged.exclusions.filter(
      (e) => !newInfo.removedExclusions.includes(e)
    );
  }

  return merged;
}

// ─── Effective query builder ──────────────────────────────────────────────────

/**
 * Build an effective query string from the conversation state.
 * Used when re-running analysis for a follow-up.
 *
 * @param {object} state — conversation state
 * @returns {string}
 */
export function buildEffectiveQuery(state = {}) {
  const parts = [];

  if (state.goal) parts.push(state.goal);

  if (state.criteria && Object.keys(state.criteria).length > 0) {
    const criteriaStr = Object.entries(state.criteria)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    if (criteriaStr) parts.push(`Criteria: ${criteriaStr}`);
  }

  if (state.exclusions?.length) {
    parts.push(`Excluding: ${state.exclusions.join(', ')}`);
  }

  if (state.rejectedItems?.length) {
    parts.push(`Already recommended and rejected: ${state.rejectedItems.map((r) => r.name).join(', ')}`);
  }

  if (state.preferences && Object.keys(state.preferences).length > 0) {
    const prefStr = Object.entries(state.preferences)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    if (prefStr) parts.push(`Preferences: ${prefStr}`);
  }

  return parts.join('. ');
}

// ─── Follow-up detection ──────────────────────────────────────────────────────

/**
 * Determine if a message is a follow-up that should inherit prior constraints.
 *
 * @param {string} message
 * @param {object} state — conversation state (must have recommendations or lastQuery)
 * @returns {boolean}
 */
export function isFollowUpMessage(message, state = {}) {
  const text = String(message || '').toLowerCase();
  if (!state.recommendations?.length && !state.lastQuery) return false;

  const followUpSignals = [
    /\b(next best|next one|next choice|what's next|after that|give me another|another option)\b/i,
    /\b(that one|this one|the first one|the last one|which of those|which of these)\b/i,
    /\b(too (bulky|big|heavy|large|tall|long)|a bit (bulky|big|heavy|large))\b/i,
    /\b(not that one|don't want that|pass on that|skip that|forget the)\b/i,
    /\b(something (smaller|lighter|shorter|more portable|more compact))\b/i,
  ];

  return followUpSignals.some((p) => p.test(text));
}