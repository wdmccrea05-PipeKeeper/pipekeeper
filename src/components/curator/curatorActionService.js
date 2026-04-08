/**
 * curatorActionService.js
 *
 * Thin orchestration layer that runs a Curator action end-to-end:
 *   1. Calls the provided executor to get a raw LLM result
 *   2. Passes the raw result through the provided normalizer
 *   3. Returns a uniform status envelope: success | empty | error
 *
 * This keeps executor and normalizer independently testable while giving
 * callers a single consistent return shape.
 */

/**
 * Run a Curator action and return a normalised status envelope.
 *
 * @param {{
 *   actionType: string,
 *   executor:   () => Promise<object>,
 *   normalizer: (raw: object, actionType: string) => object | null,
 * }} options
 *
 * @returns {Promise<{
 *   status:  'success' | 'empty' | 'error',
 *   items?:  object[],
 *   summary?: string,
 *   error?:  string,
 * }>}
 */
export async function runCuratorAction({ actionType, executor, normalizer } = {}) {
  let raw;
  try {
    raw = await executor();
  } catch (err) {
    return { status: 'error', error: err?.message || String(err) };
  }

  let normalized;
  try {
    normalized = normalizer(raw, actionType);
  } catch (err) {
    return { status: 'error', error: err?.message || String(err) };
  }

  if (!normalized || typeof normalized !== 'object') {
    return { status: 'error', error: 'Normalizer returned an invalid result.' };
  }

  const items = Array.isArray(normalized.items) ? normalized.items : [];

  if (items.length === 0) {
    return { status: 'empty', summary: normalized.summary || '' };
  }

  return {
    status: 'success',
    items,
    summary: normalized.summary || '',
    actionType: normalized.actionType || actionType,
  };
}
