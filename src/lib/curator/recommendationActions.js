/**
 * Recommendation Actions
 *
 * Executes actions triggered from recommendation cards.
 * All mutations happen here — no navigation.
 */

import { base44 } from '@/api/base44Client';
import { ACTION_TYPE } from './recommendationSchema.js';

// ─── Field allow-lists ────────────────────────────────────────────────────────

const SAFE_BLEND_FIELDS = new Set([
  'blend_type', 'blend_family', 'strength', 'cut', 'flavor_notes',
  'tobacco_components', 'room_note', 'notes',
]);

const SAFE_BOTTLE_FIELDS = new Set([
  'distillery', 'region', 'age', 'abv', 'type', 'whiskey_type',
  'retail_price', 'aftermarket_price', 'collector_value', 'notes',
]);

const SAFE_PIPE_FIELDS = new Set([
  'specialization', 'shape', 'bowl_style', 'shank_shape', 'bend',
  'sizeClass', 'notes', 'condition',
]);

// ─── Apply helpers ────────────────────────────────────────────────────────────

function filterToSafeFields(changes, allowedSet) {
  const result = {};
  for (const [k, v] of Object.entries(changes || {})) {
    if (allowedSet.has(k) && v !== null && v !== undefined && v !== '') {
      result[k] = v;
    }
  }
  return result;
}

async function applyBlendChanges(recordId, changes) {
  const safe = filterToSafeFields(changes, SAFE_BLEND_FIELDS);
  if (!Object.keys(safe).length) throw new Error('No safe blend fields to apply.');
  return base44.entities.TobaccoBlend.update(recordId, safe);
}

async function applyBottleChanges(recordId, changes) {
  const safe = filterToSafeFields(changes, SAFE_BOTTLE_FIELDS);
  if (!Object.keys(safe).length) throw new Error('No safe bottle fields to apply.');
  return base44.entities.Bottle.update(recordId, safe);
}

async function applyPipeChanges(recordId, changes) {
  const safe = filterToSafeFields(changes, SAFE_PIPE_FIELDS);
  if (!Object.keys(safe).length) throw new Error('No safe pipe fields to apply.');
  return base44.entities.Pipe.update(recordId, safe);
}

// ─── Specialization apply ─────────────────────────────────────────────────────

/**
 * Apply a single pipe specialization.
 *
 * @param {string} pipeId
 * @param {string} specialization
 */
export async function applyPipeSpecialization(pipeId, specialization) {
  if (!pipeId || !specialization) throw new Error('pipeId and specialization are required.');
  return base44.entities.Pipe.update(pipeId, { specialization });
}

// ─── Single item fix apply ────────────────────────────────────────────────────

/**
 * Apply a proposed change to a single item.
 *
 * @param {{ recordId: string, recordType: string, proposedChange: object }} item
 * @returns {Promise<{ ok: boolean }>}
 */
export async function applySingleItemFix(item) {
  const { recordId, recordType, proposedChange } = item || {};
  if (!recordId) throw new Error('Item is missing recordId.');
  if (!recordType) throw new Error('Item is missing recordType.');

  const changes = proposedChange?.payload || {};

  switch (recordType) {
    case 'blend':
    case 'tobacco':
      return applyBlendChanges(recordId, changes);
    case 'bottle':
    case 'whiskey':
      return applyBottleChanges(recordId, changes);
    case 'pipe':
      return applyPipeChanges(recordId, changes);
    default:
      throw new Error(`Unsupported record type for fix: ${recordType}`);
  }
}

// ─── Recommendation-level actions ────────────────────────────────────────────

/**
 * Execute an action for a recommendation.
 *
 * @param {object}  recommendation  - The structured recommendation object
 * @param {string}  action          - 'apply_fix' | 'acknowledge' | 'approve_changes' | 'treat_individually'
 * @param {object}  [opts]          - { itemId, changes, specialization }
 * @returns {Promise<{ ok: boolean, message?: string }>}
 */
export async function executeRecommendationAction(recommendation, action, opts = {}) {
  if (!recommendation) throw new Error('recommendation is required.');

  switch (action) {
    case 'apply_fix': {
      // For auto_fix recommendations — apply the proposed change to all items
      const items = recommendation.items || [];
      const toApply = opts.itemId
        ? items.filter((i) => i.id === opts.itemId || i.recordId === opts.itemId)
        : items;

      if (!toApply.length) {
        throw new Error('No items found to apply fix to.');
      }

      let applied = 0;
      const errors = [];

      for (const item of toApply) {
        try {
          await applySingleItemFix(item);
          applied++;
        } catch (err) {
          errors.push({ item: item.recordName, error: err.message });
        }
      }

      if (applied === 0 && errors.length > 0) {
        throw new Error(errors.map((e) => `${e.item}: ${e.error}`).join('; '));
      }

      return { ok: true, applied, errors, message: `Applied to ${applied} item${applied > 1 ? 's' : ''}.` };
    }

    case 'apply_specialization': {
      const { pipeId, specialization } = opts;
      await applyPipeSpecialization(pipeId, specialization);
      return { ok: true, message: `Specialization set to ${specialization}.` };
    }

    case 'acknowledge':
    case 'dismiss':
      // Advisory acknowledgements are UI-only — no DB write needed
      return { ok: true, message: 'Acknowledged.' };

    case 'approve_changes': {
      // For review_required — same as apply_fix but explicit user confirmation
      const items = recommendation.items || [];
      const toApply = opts.itemId
        ? items.filter((i) => i.id === opts.itemId || i.recordId === opts.itemId)
        : items;

      let applied = 0;
      for (const item of toApply) {
        await applySingleItemFix(item);
        applied++;
      }
      return { ok: true, applied, message: `Changes approved for ${applied} item${applied > 1 ? 's' : ''}.` };
    }

    default:
      return { ok: true, message: `Action '${action}' acknowledged.` };
  }
}
