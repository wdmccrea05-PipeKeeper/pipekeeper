/**
 * Recommendation Actions
 *
 * Executes actions triggered from recommendation cards.
 * Mutations and navigation both happen here.
 */

import { base44 } from '@/api/base44Client';
import { ACTION_TYPE, MODULE_KEY } from './recommendationSchema.js';

// ─── Module → page mapping ────────────────────────────────────────────────────

const MODULE_PAGE = {
  [MODULE_KEY.PIPE]:    'Pipes',
  [MODULE_KEY.TOBACCO]: 'Tobacco',
  [MODULE_KEY.WHISKEY]: 'Whiskey',
  [MODULE_KEY.CIGAR]:   'Cigars',
};

const RECORD_TYPE_PAGE = {
  pipe:    'Pipes',
  blend:   'Tobacco',
  tobacco: 'Tobacco',
  bottle:  'Whiskey',
  whiskey: 'Whiskey',
  cigar:   'Cigars',
};

function getNavigationPage(recommendation) {
  const fromModule = MODULE_PAGE[recommendation?.moduleKey];
  if (fromModule) return fromModule;
  const firstItem = recommendation?.items?.[0];
  if (firstItem) return RECORD_TYPE_PAGE[firstItem.recordType] || null;
  return null;
}

/**
 * Build a navigation descriptor for view_items / view_details.
 * Callers (React components) should perform the actual navigation.
 *
 * @returns {{ ok: boolean, navigate: { page: string, path: string, itemIds: string[] } | null, message: string }}
 */
export function buildViewItemsNavigation(recommendation) {
  const page = getNavigationPage(recommendation);
  if (!page) return { ok: false, navigate: null, message: 'No module page found for this recommendation.' };

  const itemIds = (recommendation.items || [])
    .map((i) => i.recordId || i.id)
    .filter(Boolean);

  // Build a path with curator context query params for the module page
  const params = new URLSearchParams();
  if (itemIds.length > 0 && itemIds.length <= 30) {
    params.set('curator_ids', itemIds.join(','));
  }
  if (recommendation.goal) params.set('curator_hint', recommendation.goal);

  const path = `/${page}${params.toString() ? `?${params.toString()}` : ''}`;
  return { ok: true, navigate: { page, path, itemIds }, message: `Opening ${page}.` };
}

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
    case 'view_items':
    case 'view_details': {
      // Navigation is performed by the calling React component via React Router.
      // Return navigation info; do NOT use window.location.href here.
      return buildViewItemsNavigation(recommendation);
    }

    case 'apply_fix': {
      // For auto_fix recommendations — apply the proposed change to items that have proposals.
      // Items without a proposedChange payload are intentionally skipped (not all can be auto-fixed).
      const items = recommendation.items || [];
      const candidates = opts.itemId
        ? items.filter((i) => i.id === opts.itemId || i.recordId === opts.itemId)
        : items;

      // Only apply items that have a concrete proposed payload
      const toApply = candidates.filter(
        (i) => i.proposedChange?.payload && Object.keys(i.proposedChange.payload).length > 0
      );

      if (!toApply.length) {
        // Fall back: navigate to the module page so the user can edit manually
        return buildViewItemsNavigation(recommendation);
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

    case 'add_to_shopping_list': {
      const items = recommendation.items || [];
      const toAdd = opts.itemId
        ? items.filter((i) => i.id === opts.itemId || i.recordId === opts.itemId)
        : items;

      if (!toAdd.length) throw new Error('No items to add to shopping list.');
      if (!opts.userEmail) throw new Error('User email is required to add to shopping list.');

      let added = 0;
      const errors = [];

      for (const item of toAdd) {
        try {
          await base44.entities.ShoppingListItem.create({
            name:          item.recordName || item.itemName || item.name || '—',
            brand:         item.brand || item.manufacturer || '',
            item_type:     item.itemType || item.recordType || 'blend',
            shopping_type: item.shoppingType || recommendation.actionPayload?.shoppingType || 'restock',
            status:        'active',
            priority:      'medium',
            is_manual:     false,
            notes:         '',
            created_by:    opts.userEmail,
          });
          added++;
        } catch (err) {
          errors.push({ item: item.recordName, error: err.message });
        }
      }

      if (added === 0 && errors.length > 0) {
        throw new Error(errors.map((e) => `${e.item}: ${e.error}`).join('; '));
      }

      return {
        ok:      true,
        added,
        errors,
        message: `${added} item${added > 1 ? 's' : ''} added to Shopping List.`,
      };
    }

    case 'approve_changes': {
      // For review_required — apply proposed changes for items that have them.
      // Items without proposedChange are skipped (user must edit manually in the module).
      const items = recommendation.items || [];
      const toApply = (opts.itemId
        ? items.filter((i) => i.id === opts.itemId || i.recordId === opts.itemId)
        : items
      ).filter((i) => i.proposedChange?.payload && Object.keys(i.proposedChange.payload).length > 0);

      if (!toApply.length) {
        // No auto-applicable items — navigate to module so user can edit manually
        return buildViewItemsNavigation(recommendation);
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

      return { ok: true, applied, errors, message: `Changes approved for ${applied} item${applied > 1 ? 's' : ''}.` };
    }

    default:
      return { ok: true, message: `Action '${action}' acknowledged.` };
  }
}
