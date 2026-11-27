import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  ACTION_TYPES,
  confirmationFor,
  isHighImpact,
  undoEligible,
} from '@/lib/actions/actionRegistry.js';
import {
  buildExecutionPayload,
  createAction,
  describeReason,
  effectiveTargets,
  newActionId,
  selectionMode,
  summarizeExecution,
} from '@/lib/actions/actionModel.js';

/**
 * Behavioural audit for the Universal Action Framework.
 *
 * The point of this suite is that every feature shares ONE write path: a single
 * registry of permitted action types, one executor that re-validates everything,
 * one confirmation model and one result shape. Where a claim can only be checked
 * by reading the executor (because it needs a signed-in session and live records
 * to run), the assertion is made against the source and named as such.
 */

const read = (path) => readFileSync(path, 'utf8');

const SERVER_REGISTRY = 'base44/shared/actionRegistry.ts';
const EXECUTOR = 'base44/functions/actionExecute/entry.ts';

function serverDefinitionBlock(actionId) {
  const source = read(SERVER_REGISTRY);
  const start = source.indexOf(`${actionId}: {`);
  expect(start, `${actionId} is missing from the server registry`).toBeGreaterThan(-1);
  return source.slice(start, start + 700);
}

describe('action registry', () => {
  it('declares the same action types, confirmation levels and undo rules on both sides', () => {
    const ids = Object.keys(ACTION_TYPES);
    expect(ids.length).toBeGreaterThan(0);

    for (const id of ids) {
      const block = serverDefinitionBlock(id);
      const client = ACTION_TYPES[id];
      expect(block, `${id} confirmation drifted`).toContain(`confirmation: '${client.confirmation}'`);
      expect(block, `${id} undo drifted`).toContain(`undo: ${client.undo}`);
      expect(block, `${id} destructive flag drifted`).toContain(`destructive: ${client.destructive}`);
      expect(block, `${id} financial flag drifted`).toContain(`financial: ${client.financial}`);
    }
  });

  it('treats an unknown action type as needing explicit confirmation and as high impact', () => {
    expect(confirmationFor('something_invented')).toBe('explicit');
    expect(isHighImpact('something_invented')).toBe(true);
    expect(undoEligible('something_invented')).toBe(false);
  });

  it('marks merge and lifecycle changes as high impact, routine updates as not', () => {
    expect(isHighImpact('record_merge')).toBe(true);
    expect(isHighImpact('lifecycle_change')).toBe(true);
    expect(isHighImpact('valuation_record')).toBe(true);
    expect(isHighImpact('record_update')).toBe(false);
    expect(isHighImpact('storage_assign')).toBe(false);
  });

  it('refuses to undo a merge', () => {
    expect(undoEligible('record_merge')).toBe(false);
    expect(undoEligible('record_update')).toBe(true);
  });
});

describe('action selection', () => {
  const target = { entity: 'Pipe', recordId: 'p1', name: 'Dunhill', patch: { condition: 'Good' } };

  it('never preselects destructive, financial or privacy-sensitive actions', () => {
    const merge = createAction({ type: 'record_merge', targets: [target] });
    const lifecycle = createAction({ type: 'lifecycle_change', targets: [target] });
    const valuation = createAction({ type: 'valuation_record', targets: [target] });
    const update = createAction({ type: 'record_update', targets: [target] });

    expect(merge.defaultSelected).toBe(false);
    expect(lifecycle.defaultSelected).toBe(false);
    expect(valuation.defaultSelected).toBe(false);
    expect(update.defaultSelected).toBe(true);
  });

  it('uses radio buttons for mutually exclusive options and checkboxes otherwise', () => {
    expect(selectionMode(createAction({ type: 'record_update', targets: [target] }))).toBe('checkbox');
    expect(selectionMode(createAction({
      type: 'record_update',
      targets: [target],
      alternatives: [{ id: 'a1', label: 'Good' }],
    }))).toBe('checkbox');
    expect(selectionMode(createAction({
      type: 'record_update',
      targets: [target],
      alternatives: [{ id: 'a1', label: 'Good' }, { id: 'a2', label: 'Excellent' }],
    }))).toBe('radio');
  });

  it('applies the chosen alternative to the patch it would write', () => {
    const action = createAction({
      type: 'record_update',
      targets: [target],
      alternatives: [
        { id: 'a1', label: 'Good', patch: { condition: 'Good' } },
        { id: 'a2', label: 'Excellent', patch: { condition: 'Excellent' } },
      ],
    });

    expect(effectiveTargets(action)[0].patch.condition).toBe('Good');
    expect(effectiveTargets(action, 'a2')[0].patch.condition).toBe('Excellent');
    // An unknown choice must fall back to the action's own targets, not to nothing.
    expect(effectiveTargets(action, 'nope')[0].patch.condition).toBe('Good');
  });

  it('gives each action a distinct identifier', () => {
    expect(newActionId()).not.toBe(newActionId());
  });
});

describe('execution payload', () => {
  const base = { entity: 'Pipe', recordId: 'p1', name: 'Dunhill', expected: { condition: null }, patch: { condition: 'Good' } };

  it('sends only the accepted actions, with the state they were built against', () => {
    const keep = createAction({ id: 'keep', type: 'record_update', origin: 'curator', targets: [base] });
    const drop = createAction({ id: 'drop', type: 'record_update', origin: 'curator', targets: [base] });
    const deferred = {
      ...createAction({ id: 'deferred', type: 'record_update', origin: 'curator', targets: [base] }),
      deferred: true,
    };

    const payload = buildExecutionPayload([keep, drop, deferred], {
      selections: { keep: true, drop: false, deferred: true },
      idempotencyKey: 'key-1',
    });

    expect(payload.idempotency_key).toBe('key-1');
    expect(payload.actions).toHaveLength(1);
    expect(payload.actions[0].id).toBe('keep');
    expect(payload.actions[0].targets[0].expected).toEqual({ condition: null });
    expect(payload.actions[0].targets[0].patch).toEqual({ condition: 'Good' });
  });

  it('drops a deferred or dismissed action even if it was selected', () => {
    const deferred = { ...createAction({ id: 'd', type: 'record_update', targets: [base] }), deferred: true };
    const rejected = { ...createAction({ id: 'r', type: 'record_update', targets: [base] }), rejected: true };

    const payload = buildExecutionPayload([deferred, rejected], {
      selections: { d: true, r: true },
      idempotencyKey: 'key-2',
    });

    expect(payload.actions).toHaveLength(0);
  });

  it('carries dependencies so the server can order dependent actions', () => {
    const first = createAction({ id: 'first', type: 'record_update', targets: [base] });
    const second = createAction({ id: 'second', type: 'record_update', targets: [base], dependsOn: ['first'] });

    const payload = buildExecutionPayload([first, second], {
      selections: { first: true, second: true },
      idempotencyKey: 'key-3',
    });

    expect(payload.actions[1].depends_on).toEqual(['first']);
  });
});

describe('execution results', () => {
  it('reports a partial failure as partial and counts each outcome separately', () => {
    const summary = summarizeExecution({
      actions: [
        {
          id: 'a1',
          type: 'record_update',
          execution_id: 'run-1',
          undo_eligible: true,
          status: 'partial',
          results: [
            { recordId: 'p1', name: 'Dunhill', status: 'completed', changed_fields: ['condition'] },
            { recordId: 'p2', name: 'Savinelli', status: 'failed', reason: 'record_changed_since_proposal' },
            { recordId: 'p3', name: 'Peterson', status: 'skipped', reason: 'already_matches' },
          ],
        },
      ],
    });

    expect(summary.completed).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.skipped).toBe(1);
    expect(summary.status).toBe('partial');
    expect(summary.undoableExecutionIds).toEqual(['run-1']);
  });

  it('does not offer undo for a run that changed nothing', () => {
    const summary = summarizeExecution({
      actions: [
        {
          id: 'a1',
          type: 'record_update',
          execution_id: 'run-2',
          undo_eligible: true,
          status: 'skipped',
          results: [{ recordId: 'p1', status: 'skipped', reason: 'already_matches' }],
        },
      ],
    });

    expect(summary.status).toBe('skipped');
    expect(summary.undoableExecutionIds).toEqual([]);
  });

  it('counts a repeated submission as already applied rather than as a success', () => {
    const summary = summarizeExecution({
      actions: [{ id: 'a1', type: 'record_update', status: 'completed', duplicate_prevented: true, results: [] }],
    });
    expect(summary.duplicates).toBe(1);
    expect(summary.completed).toBe(0);
  });

  it('explains why a record was not changed in plain words', () => {
    expect(describeReason('record_changed_since_proposal')).toMatch(/changed since/i);
    expect(describeReason('not_authorized')).toMatch(/permission/i);
    expect(describeReason('already_matches')).toMatch(/already holds/i);
  });
});

describe('server-side authority', () => {
  const executor = read(EXECUTOR);

  it('re-checks identity, ownership, entitlement and record state before writing', () => {
    expect(executor).toContain('auth.me()');
    expect(executor).toContain('isAuthorizedForRecord');
    expect(executor).toContain('resolveCuratorAccess');
    expect(executor).toContain('record_changed_since_proposal');
    expect(executor).toContain('verification_failed');
    expect(executor).toContain('planUndo');
  });

  it('prevents duplicate execution with an idempotency key', () => {
    expect(executor).toContain('idempotency_key');
    expect(executor).toContain('duplicate_prevented');
    expect(executor).toContain('ActionExecution.filter');
  });

  it('only executes registered action types', () => {
    expect(executor).toContain('getActionDefinition');
    expect(executor).toContain('That action type is not supported');
    // No arbitrary code path: nothing evaluates strings or dynamic module names.
    expect(executor).not.toContain('eval(');
    expect(executor).not.toContain('new Function');
  });

  it('records an audit row and blocks dependent actions whose prerequisite failed', () => {
    expect(executor).toContain('ActionExecution.create');
    expect(executor).toContain('blocked');
    expect(executor).toContain('depends_on');
  });

  it('keeps the audit trail private to its owner and administrators', () => {
    const entity = read('base44/entities/ActionExecution.jsonc');
    expect(entity).toContain('data.user_email');
    expect(entity).toContain('"role": "admin"');
  });
});

describe('migrated features', () => {
  it('sends Curator proposals through the shared executor, not its own writer', () => {
    const hook = read('src/components/curator/useCuratorRecordProposals.js');
    expect(hook).toContain('executeActions');
    expect(hook).toContain('undoActionExecution');
    expect(hook).not.toContain('curatorRecordChange');

    // The actions themselves are built by the presenter, which stamps every one
    // of them with Curator as the origin and the framework's own shape.
    const presenter = read('src/lib/curator/curatorActionPresenter.js');
    expect(presenter).toContain('createAction');
    expect(presenter).toContain("export const CURATOR_ORIGIN = 'curator'");
    expect(presenter).toContain('origin: CURATOR_ORIGIN');
  });

  it('sends duplicate merges through the shared preview and executor', () => {
    const panel = read('src/components/collection/DuplicateReviewPanel.jsx');
    expect(panel).toContain('createAction');
    expect(panel).toContain('ActionReviewDialog');
    expect(panel).toContain('useActionExecution');
    expect(panel).not.toContain('collectionItemMerge');
  });

  it('sends bulk documentation edits through the shared executor', () => {
    const page = read('src/pages/CollectionTools.jsx');
    expect(page).toContain('useActionExecution');
    expect(page).toContain("origin: 'collection_tools'");
    expect(page).toContain('ActionReviewDialog');
    expect(page).not.toContain('collectionItemBulkUpdate');
  });

  it('requires an explicit acknowledgement for high-impact actions', () => {
    const dialog = read('src/components/actions/ActionReviewDialog.jsx');
    expect(dialog).toContain('requiresExplicitConfirm');
    expect(dialog).toContain('acknowledged');
    expect(dialog).toContain('disabled={busy || blocked}');
  });

  it('has exactly one client module that writes through the framework', () => {
    const client = read('src/lib/actions/actionClient.js');
    expect(client).toContain("invoke('actionExecute'");
    expect(client).not.toContain('.update(');
    expect(client).not.toContain('.create(');
    expect(client).not.toContain('.delete(');
  });
});