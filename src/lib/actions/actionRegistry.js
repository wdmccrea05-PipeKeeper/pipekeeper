/**
 * Client catalogue for the Universal Action Framework.
 *
 * This mirrors base44/shared/actionRegistry.ts for display and for deciding how
 * much confirmation an action needs. It is NOT the authority: the server refuses
 * any type it does not know and re-derives the confirmation level, so a stale or
 * tampered client cannot grant itself an easier path.
 *
 * Parity between the two files is asserted by
 * src/__tests__/universalActionFramework.test.js.
 */

export const ACTION_TYPES = {
  record_update: {
    id: 'record_update',
    label: 'Update record details',
    confirmation: 'review',
    undo: true,
    destructive: false,
    financial: false,
    privacy: false,
  },
  storage_assign: {
    id: 'storage_assign',
    label: 'Assign storage location',
    confirmation: 'review',
    undo: true,
    destructive: false,
    financial: false,
    privacy: false,
  },
  lifecycle_change: {
    id: 'lifecycle_change',
    label: 'Change lifecycle status',
    confirmation: 'explicit',
    undo: true,
    destructive: true,
    financial: false,
    privacy: false,
  },
  record_merge: {
    id: 'record_merge',
    label: 'Merge duplicate records',
    confirmation: 'explicit',
    undo: false,
    destructive: true,
    financial: false,
    privacy: false,
  },
  valuation_record: {
    id: 'valuation_record',
    label: 'Record a valuation',
    confirmation: 'explicit',
    undo: true,
    destructive: false,
    financial: true,
    privacy: false,
  },
};

export const CONFIRMATION_ORDER = ['immediate', 'review', 'explicit'];

export const CONFIRMATION_COPY = {
  immediate: 'Runs straight away.',
  review: 'Shows a preview of the change before anything is written.',
  explicit: 'Needs a deliberate confirmation because it is hard to reverse or has real consequences.',
};

export function getActionType(id) {
  return ACTION_TYPES[String(id || '')] || null;
}

export function confirmationFor(type) {
  return getActionType(type)?.confirmation || 'explicit';
}

/** Destructive, financial or privacy-sensitive: never preselected. */
export function isHighImpact(type) {
  const entry = getActionType(type);
  if (!entry) return true;
  return entry.destructive || entry.financial || entry.privacy;
}

export function undoEligible(type) {
  return getActionType(type)?.undo === true;
}

export function actionTypeLabel(type) {
  return getActionType(type)?.label || 'Change';
}