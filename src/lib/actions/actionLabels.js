/**
 * The one vocabulary every action surface uses.
 *
 * Curator, the hub, reports, collection health and the module panels all say the
 * same thing for the same operation. Adding a second word for a known operation
 * is a defect, so components read these strings instead of writing their own.
 */

export const ACTION_LABELS = {
  viewRecords: 'View records',
  explain: 'Explain',
  hideExplanation: 'Hide explanation',
  reviewChanges: 'Review changes',
  accept: 'Accept',
  applySelected: 'Apply selected',
  cancel: 'Cancel',
  undo: 'Undo',
  done: 'Done',
  defer: 'Defer',
  dismiss: 'Dismiss',
  resolved: 'Resolved',
  deferred: 'Deferred',
  dismissed: 'Dismissed',
  nothingChanged: 'Nothing was changed.',
};

/** "Apply selected (3)" — the bulk label, always with the count. */
export function applySelectedLabel(count) {
  return `${ACTION_LABELS.applySelected} (${count})`;
}

export const ACTION_TERMS = Object.freeze({ ...ACTION_LABELS });