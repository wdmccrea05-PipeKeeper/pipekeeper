/**
 * curatorApplyHandlers.js
 *
 * Canonical handlers for accepting and rejecting Curator action recommendations.
 * Re-exported by actionApplyHandlers.jsx and curatorActionApply.jsx for backward compat.
 */

/**
 * Apply an accepted Curator recommendation by invoking the provided callback.
 *
 * @param {{ item: object, onApply: function }} options
 * @returns {Promise<{ status: 'accepted' } | { status: 'error', error: string }>}
 */
export async function applyAcceptedCuratorAction({ item, onApply } = {}) {
  try {
    if (typeof onApply === 'function') {
      await onApply(item);
    }
    return { status: 'accepted', item };
  } catch (err) {
    return { status: 'error', error: err?.message || String(err) };
  }
}

/**
 * Apply a rejected Curator recommendation by invoking the provided callback.
 *
 * @param {{ item: object, onReject: function }} options
 * @returns {Promise<{ status: 'rejected' } | { status: 'error', error: string }>}
 */
export async function applyRejectedCuratorAction({ item, onReject } = {}) {
  try {
    if (typeof onReject === 'function') {
      await onReject(item);
    }
    return { status: 'rejected', item };
  } catch (err) {
    return { status: 'error', error: err?.message || String(err) };
  }
}
