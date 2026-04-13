/**
 * valuationHistory.js
 *
 * Utilities for reading, writing, and summarising value history snapshots.
 *
 * Snapshots are stored in localStorage keyed by item id so the history
 * survives page reloads without a database round-trip.
 *
 * Shape of a single snapshot:
 *   {
 *     date:       '2026-04-13',      // ISO date string
 *     value:      125.00,            // USD base value at the time
 *     confidence: 'medium',          // 'high' | 'medium' | 'low'
 *     source:     'retailer_current' // source key
 *   }
 *
 * Storage key pattern: 'pk_val_history_<itemId>'
 */

const STORAGE_PREFIX = 'pk_val_history_';
const MAX_SNAPSHOTS  = 24; // keep the last 24 data points per item

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function storageKey(itemId) {
  return `${STORAGE_PREFIX}${itemId}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Read / write
// ---------------------------------------------------------------------------

/**
 * Load the snapshot history for an item.
 * @param {string} itemId
 * @returns {Array<{ date: string, value: number, confidence: string, source: string }>}
 */
export function loadValueHistory(itemId) {
  if (!itemId) return [];
  try {
    const raw = localStorage.getItem(storageKey(itemId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

/**
 * Append a new snapshot to the item's history, de-duplicating same-day entries
 * (last write wins) and trimming to MAX_SNAPSHOTS.
 * @param {string} itemId
 * @param {number} value     - USD base value
 * @param {string} confidence
 * @param {string} [source]
 */
export function recordValueSnapshot(itemId, value, confidence = 'low', source = 'formula_derived') {
  if (!itemId || typeof value !== 'number' || !isFinite(value)) return;

  const history = loadValueHistory(itemId);
  const today   = todayISO();

  // Remove any existing entry for today, then append the new one
  const filtered = history.filter(s => s.date !== today);
  filtered.push({ date: today, value: Math.round(value * 100) / 100, confidence, source });

  // Keep only the most recent MAX_SNAPSHOTS
  const trimmed = filtered.slice(-MAX_SNAPSHOTS);

  try {
    localStorage.setItem(storageKey(itemId), JSON.stringify(trimmed));
  } catch {
    // Silently ignore storage errors
  }
}

/**
 * Clear value history for an item (e.g. when the item is deleted).
 * @param {string} itemId
 */
export function clearValueHistory(itemId) {
  if (!itemId) return;
  try {
    localStorage.removeItem(storageKey(itemId));
  } catch {
    // Silently ignore
  }
}

// ---------------------------------------------------------------------------
// Analytics helpers
// ---------------------------------------------------------------------------

/**
 * Compute the percentage change between the oldest and newest snapshot value.
 * Returns null if fewer than 2 snapshots exist.
 * @param {string} itemId
 * @returns {{ delta: number, pct: number, direction: 'up'|'down'|'flat' }|null}
 */
export function computeValueTrend(itemId) {
  const history = loadValueHistory(itemId);
  if (history.length < 2) return null;

  const oldest = history[0].value;
  const newest = history[history.length - 1].value;
  if (!oldest || oldest === 0) return null;

  const delta = newest - oldest;
  const pct   = (delta / oldest) * 100;

  return {
    delta: Math.round(delta * 100) / 100,
    pct:   Math.round(pct * 10) / 10,
    direction: Math.abs(pct) < 1 ? 'flat' : pct > 0 ? 'up' : 'down',
  };
}

/**
 * Return the most recent snapshot for an item, or null if none.
 * @param {string} itemId
 * @returns {{ date: string, value: number, confidence: string, source: string }|null}
 */
export function getLatestSnapshot(itemId) {
  const history = loadValueHistory(itemId);
  return history.length > 0 ? history[history.length - 1] : null;
}
