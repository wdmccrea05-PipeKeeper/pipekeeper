/**
 * Curator Recommendation History
 *
 * Tracks per-workflow recommendation history to:
 * - Downrank recently suggested items
 * - Track accepted/rejected/dismissed state
 * - Enable novelty/diversity weighting
 * - Drive materially different regeneration
 *
 * Uses localStorage for persistence across sessions.
 */

const STORAGE_KEY = 'ck_curator_rec_history';
const MAX_HISTORY_ENTRIES = 200;
const DOWNRANK_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const STRONG_DOWNRANK_MS = 24 * 60 * 60 * 1000; // 24 hours — very recently seen

/** Load history from localStorage */
function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { entries: [], version: 1 };
  } catch {
    return { entries: [], version: 1 };
  }
}

/** Persist history */
function saveHistory(history) {
  try {
    // Trim to max entries (keep most recent)
    if (history.entries.length > MAX_HISTORY_ENTRIES) {
      history.entries = history.entries
        .sort((a, b) => b.seenAt - a.seenAt)
        .slice(0, MAX_HISTORY_ENTRIES);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Non-fatal — localStorage may be unavailable
  }
}

/**
 * Record that a set of recommendations was shown to the user.
 * @param {string} workflowId  - e.g., 'optimize_collection'
 * @param {Array}  items       - recommendation items (must have id and itemId)
 */
export function recordRecommendationsShown(workflowId, items = []) {
  if (!items.length) return;
  const history = loadHistory();
  const now = Date.now();

  for (const item of items) {
    if (!item.itemId && !item.id) continue;
    history.entries.push({
      workflowId,
      itemId: item.itemId || null,
      recId: item.id,
      itemName: item.itemName,
      itemType: item.type,
      seenAt: now,
      state: 'shown', // shown | accepted | dismissed | excluded
    });
  }

  saveHistory(history);
}

/**
 * Record user action on a recommendation.
 * @param {string} recId   - recommendation id
 * @param {string} state   - 'accepted' | 'dismissed' | 'excluded'
 */
export function recordRecommendationAction(recId, state) {
  const history = loadHistory();
  const entry = history.entries.find(e => e.recId === recId);
  if (entry) {
    entry.state = state;
    entry.actionAt = Date.now();
  }
  saveHistory(history);
}

/**
 * Get recent history for a workflow (items seen within the downrank window).
 * @param {string} workflowId
 * @returns {Array} - recent entries
 */
export function getRecentHistory(workflowId) {
  const history = loadHistory();
  const cutoff = Date.now() - DOWNRANK_WINDOW_MS;
  return history.entries.filter(e => e.workflowId === workflowId && e.seenAt > cutoff);
}

/**
 * Get excluded item IDs (user explicitly excluded from future suggestions).
 * @param {string} workflowId
 * @returns {Set<string>}
 */
export function getExcludedItemIds(workflowId) {
  const history = loadHistory();
  return new Set(
    history.entries
      .filter(e => e.workflowId === workflowId && e.state === 'excluded' && e.itemId)
      .map(e => e.itemId)
  );
}

/**
 * Get accepted item IDs (user applied this recommendation).
 * @param {string} workflowId
 * @returns {Set<string>}
 */
export function getAcceptedItemIds(workflowId) {
  const history = loadHistory();
  return new Set(
    history.entries
      .filter(e => e.workflowId === workflowId && e.state === 'accepted' && e.itemId)
      .map(e => e.itemId)
  );
}

/**
 * Compute a downrank score for a candidate item.
 * Higher score = more recently seen = more aggressively downranked.
 * @returns {number} 0 = never seen, 1 = strong downrank
 */
export function getItemDownrankScore(itemId, workflowId) {
  if (!itemId) return 0;
  const history = loadHistory();
  const now = Date.now();

  const relevant = history.entries.filter(
    e => e.itemId === itemId && e.workflowId === workflowId
  );
  if (!relevant.length) return 0;

  const mostRecent = Math.max(...relevant.map(e => e.seenAt));
  const age = now - mostRecent;

  if (age < STRONG_DOWNRANK_MS) return 1.0;   // Seen in last 24h — strong downrank
  if (age < DOWNRANK_WINDOW_MS) return 0.5;    // Seen in last 7d — moderate downrank

  return 0;
}

/**
 * Build a prompt addendum instructing the AI to prefer novel items,
 * excluding recently dismissed/accepted items and downranking seen items.
 *
 * @param {string} workflowId
 * @param {object} context  - { pipes, blends, bottles }
 * @returns {string} - prompt addendum
 */
export function buildNoveltyPromptAddendum(workflowId, context = {}) {
  const recentHistory = getRecentHistory(workflowId);
  const excludedIds = getExcludedItemIds(workflowId);
  const acceptedIds = getAcceptedItemIds(workflowId);

  if (!recentHistory.length && !excludedIds.size && !acceptedIds.size) {
    return ''; // No history — no addendum needed
  }

  const lines = ['\nHISTORY & NOVELTY INSTRUCTIONS:'];

  if (excludedIds.size > 0) {
    // Resolve names from context
    const allItems = [
      ...(context.pipes || []),
      ...(context.blends || []),
      ...(context.bottles || []),
    ];
    const excludedNames = [...excludedIds]
      .map(id => allItems.find(i => i.id === id)?.name)
      .filter(Boolean);
    if (excludedNames.length > 0) {
      lines.push(`DO NOT recommend these items (user excluded): ${excludedNames.join(', ')}`);
    }
  }

  if (acceptedIds.size > 0) {
    const allItems = [
      ...(context.pipes || []),
      ...(context.blends || []),
      ...(context.bottles || []),
    ];
    const acceptedNames = [...acceptedIds]
      .map(id => allItems.find(i => i.id === id)?.name)
      .filter(Boolean);
    if (acceptedNames.length > 0) {
      lines.push(`These items were already addressed (accepted): ${acceptedNames.join(', ')} — suggest different items.`);
    }
  }

  // Recently seen items — ask AI to prefer alternatives
  const recentShown = recentHistory
    .filter(e => e.state === 'shown' && e.itemName)
    .slice(-10);
  if (recentShown.length > 0) {
    const names = [...new Set(recentShown.map(e => e.itemName))];
    lines.push(`These items were recently suggested — prefer other items from the collection for better variety: ${names.join(', ')}`);
  }

  lines.push('Prioritize items NOT recently recommended to maximize variety and novelty.');

  return lines.join('\n');
}

/**
 * Build a "Broaden Search" prompt addendum that explicitly widens scope.
 * Used when the user clicks "Broaden" or "Regenerate with more variety".
 */
export function buildBroadenPromptAddendum(workflowId, context = {}) {
  const excludedIds = getExcludedItemIds(workflowId);
  const allHistory = getRecentHistory(workflowId);
  const seenIds = new Set(allHistory.map(e => e.itemId).filter(Boolean));

  const allItems = [
    ...(context.pipes || []).map(i => ({ ...i, _type: 'pipe' })),
    ...(context.blends || []).map(i => ({ ...i, _type: 'blend' })),
    ...(context.bottles || []).map(i => ({ ...i, _type: 'bottle' })),
  ];

  // Find items that have NEVER been recommended
  const unseenItems = allItems.filter(i => !seenIds.has(i.id) && !excludedIds.has(i.id));

  if (unseenItems.length === 0) {
    return '\nBROADEN INSTRUCTIONS: All items have been recently suggested. Cast the widest possible net — include items with lower priority and explore secondary improvement opportunities.';
  }

  const sample = unseenItems.slice(0, 10).map(i => i.name).join(', ');
  return `\nBROADEN INSTRUCTIONS: Explicitly prioritize items that have NOT been recently recommended. Never-before-recommended items include: ${sample}${unseenItems.length > 10 ? ` and ${unseenItems.length - 10} others` : ''}. Broaden analysis to secondary opportunities and less-obvious improvements.`;
}

/**
 * Clear history for a specific workflow (used when user clicks "Clear History").
 */
export function clearWorkflowHistory(workflowId) {
  const history = loadHistory();
  history.entries = history.entries.filter(e => e.workflowId !== workflowId);
  saveHistory(history);
}

/**
 * Get a summary of history stats for display.
 */
export function getHistorySummary(workflowId) {
  const history = loadHistory();
  const all = history.entries.filter(e => e.workflowId === workflowId);
  const recent = getRecentHistory(workflowId);
  const excluded = getExcludedItemIds(workflowId);
  const accepted = getAcceptedItemIds(workflowId);

  return {
    totalSeen: all.length,
    recentlySeen: recent.length,
    excluded: excluded.size,
    accepted: accepted.size,
    dismissed: all.filter(e => e.state === 'dismissed').length,
  };
}