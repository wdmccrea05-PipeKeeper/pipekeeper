/**
 * The canonical action object shared by Curator, the hub, modules, reports and
 * collection tools.
 *
 * A proposal is data, never code: it names a registered action type, the records
 * it targets, the values it would replace and the values it would write. The
 * server re-validates every one of those facts, so this model exists to present
 * and to select — never to authorise.
 */

import { confirmationFor, isHighImpact, undoEligible } from './actionRegistry';

let sequence = 0;

export function newActionId(prefix = 'act') {
  sequence += 1;
  return `${prefix}_${Date.now().toString(36)}_${sequence.toString(36)}`;
}

export function newIdempotencyKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `idem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeTarget(target) {
  return {
    entity: target?.entity || null,
    recordId: target?.recordId || null,
    name: target?.name || '',
    role: target?.role || 'target',
    expected: target?.expected || null,
    patch: target?.patch || {},
  };
}

/**
 * Build one action.
 *
 * @param {object} input
 * @param {string} input.type          registered action type
 * @param {string} input.origin        feature the action came from
 * @param {string} [input.module]      collection module key
 * @param {Array}  input.targets       [{ entity, recordId, name, expected, patch, role }]
 */
export function createAction(input) {
  const type = String(input?.type || '');
  const targets = (Array.isArray(input?.targets) ? input.targets : []).map(normalizeTarget);

  return {
    id: input?.id || newActionId(),
    type,
    origin: input?.origin || 'unknown',
    module: input?.module || null,
    title: input?.title || '',
    description: input?.description || '',
    rationale: input?.rationale || '',
    evidence: Array.isArray(input?.evidence) ? input.evidence : [],
    confidence: input?.confidence || null,
    currentValues: input?.currentValues || [],
    proposedValues: input?.proposedValues || [],
    alternatives: Array.isArray(input?.alternatives) ? input.alternatives : [],
    selectionGroup: input?.selectionGroup || null,
    dependsOn: Array.isArray(input?.dependsOn) ? input.dependsOn : [],
    requiredInput: input?.requiredInput || null,
    input: input?.input || null,
    targets,
    confirmation: confirmationFor(type),
    undoEligible: undoEligible(type),
    highImpact: isHighImpact(type),
    // Destructive, financial and privacy-sensitive actions start unselected.
    defaultSelected: !isHighImpact(type) && confirmationFor(type) !== 'explicit',
    // Navigation targets offered alongside the action.
    recordLinks: Array.isArray(input?.recordLinks) ? input.recordLinks : [],
  };
}

/**
 * Mutually exclusive options are chosen with radio buttons; independent actions
 * are chosen with checkboxes.
 */
export function selectionMode(action) {
  const alternatives = action?.alternatives || [];
  return alternatives.length > 1 ? 'radio' : 'checkbox';
}

export function requiresExplicitConfirm(action) {
  return action?.confirmation === 'explicit';
}

/** The patch an action would write, taking a chosen alternative into account. */
export function effectiveTargets(action, chosenAlternativeId) {
  const targets = action?.targets || [];
  if (!chosenAlternativeId) return targets;
  const alternative = (action?.alternatives || []).find((entry) => entry.id === chosenAlternativeId);
  if (!alternative) return targets;
  if (Array.isArray(alternative.targets)) return alternative.targets.map(normalizeTarget);
  return targets.map((target) => ({ ...target, patch: { ...target.patch, ...(alternative.patch || {}) } }));
}

/**
 * Translate accepted actions into the payload the executor expects.
 * Only selected actions are sent; deferrals and rejections never leave the client.
 */
export function buildExecutionPayload(actions, { selections = {}, alternatives = {}, idempotencyKey }) {
  const selected = (Array.isArray(actions) ? actions : []).filter((action) => {
    if (action?.deferred || action?.rejected) return false;
    if (selections[action.id] !== undefined) return Boolean(selections[action.id]);
    return Boolean(action.defaultSelected);
  });

  return {
    mode: 'execute',
    idempotency_key: idempotencyKey,
    actions: selected.map((action) => ({
      id: action.id,
      type: action.type,
      origin: action.origin,
      module: action.module,
      depends_on: action.dependsOn || [],
      input: action.input || null,
      targets: effectiveTargets(action, alternatives[action.id]).map((target) => ({
        entity: target.entity,
        recordId: target.recordId,
        role: target.role,
        expected: target.expected,
        patch: target.patch,
      })),
    })),
  };
}

/**
 * Turn the executor's response into the counts the interface reports, plus the
 * per-record reasons so a partial failure can be explained rather than hidden.
 */
export function summarizeExecution(response) {
  const actions = Array.isArray(response?.actions) ? response.actions : [];
  const rows = [];
  const undoableExecutionIds = [];
  let completed = 0;
  let failed = 0;
  let skipped = 0;
  let blocked = 0;
  let duplicates = 0;

  for (const action of actions) {
    if (action?.duplicate_prevented) duplicates += 1;
    if (action?.status === 'blocked') blocked += 1;

    for (const result of action?.results || []) {
      const row = {
        actionId: action.id,
        actionType: action.type,
        recordId: result.recordId || null,
        name: result.name || '',
        status: result.status,
        reason: result.reason || null,
        changedFields: result.changed_fields || [],
      };
      rows.push(row);
      if (row.status === 'completed') completed += 1;
      else if (row.status === 'failed') failed += 1;
      else if (row.status === 'skipped') skipped += 1;
    }

    if (action?.undo_eligible && action?.execution_id) {
      const applied = (action.results || []).some((result) => result.status === 'completed');
      if (applied) undoableExecutionIds.push(action.execution_id);
    }
  }

  return {
    completed,
    failed,
    skipped,
    blocked,
    duplicates,
    rows,
    undoableExecutionIds,
    status:
      failed > 0 && completed > 0 ? 'partial'
        : failed > 0 ? 'failed'
          : completed > 0 ? 'completed'
            : 'skipped',
  };
}

export function describeReason(reason) {
  switch (String(reason || '')) {
    case 'record_changed_since_proposal':
      return 'This record changed since the suggestion was made, so nothing was written.';
    case 'not_authorized':
      return 'You do not have permission to change this record.';
    case 'record_not_found':
      return 'This record no longer exists.';
    case 'already_matches':
      return 'It already holds these values.';
    case 'verification_failed':
      return 'The change could not be confirmed after saving, so it was reported as failed.';
    case 'no_supported_fields':
      return 'None of the proposed fields can be changed this way.';
    case 'record_changed_since_apply':
      return 'This record was edited after the change, so it was left as it is.';
    default:
      return reason ? String(reason).replace(/_/g, ' ') : '';
  }
}