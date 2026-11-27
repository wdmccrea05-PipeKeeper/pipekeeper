/* eslint-disable */
/**
 * Acceptance scenarios for the Universal Action and Acceptance Framework.
 *
 * One test per release scenario: the ones that can be decided from the shared
 * model are asserted as behaviour, and the ones that need a signed-in session,
 * live records or a rendered tree are asserted against the source that governs
 * them — the executor's checks, the hook's retry and refresh rules, and the
 * surface that builds the request. Where a scenario needs both, both are tested.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  buildExecutionPayload,
  createAction,
  describeReason,
  effectiveTargets,
  summarizeExecution,
} from '@/lib/actions/actionModel';
import {
  buildActionsFromProposals,
  buildSpecializationActions,
  withCustomValue,
} from '@/lib/curator/curatorActionPresenter';
import { initialActionState } from '@/lib/curator/curatorActionPresenter';
import { resolveActionReference } from '@/lib/curator/curatorActionReferences';
import { buildFindings } from '@/lib/actions/collectionFindings';
import { isHighImpact, undoEligible } from '@/lib/actions/actionRegistry';

const read = (path) => readFileSync(path, 'utf8');

const target = (overrides = {}) => ({
  entity: 'Pipe',
  recordId: 'pipe-1',
  name: 'Savinelli 320',
  patch: { condition: 'Excellent' },
  ...overrides,
});

const proposal = (overrides = {}) => ({
  entityName: 'Pipe',
  moduleKey: 'pipekeeper',
  ids: ['pipe-1'],
  recordNames: ['Savinelli 320'],
  summary: 'Set condition to Excellent',
  patch: { condition: 'Excellent' },
  changes: [{ field: 'condition', label: 'Condition', from: 'Good', to: 'Excellent', fromRaw: 'Good' }],
  ...overrides,
});

describe('1. one valid recommendation', () => {
  it('presents exactly one action, preselected because it is routine', () => {
    const actions = buildActionsFromProposals([proposal()]);
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe('record_update');
    expect(actions[0].defaultSelected).toBe(true);
    expect(actions[0].origin).toBe('curator');
  });
});

describe('2. mutually exclusive alternatives', () => {
  const storageProposal = proposal({
    patch: { storage_location_id: 'loc-1' },
    changes: [{ field: 'storage_location_id', label: 'Storage', from: 'Study cabinet', to: 'Cellar', fromRaw: 'loc-9' }],
  });

  it('offers every recorded location as a radio choice and preselects one', () => {
    const [action] = buildActionsFromProposals([storageProposal], {
      storageLocations: [
        { id: 'loc-1', name: 'Study cabinet', module: 'pipes' },
        { id: 'loc-2', name: 'Living room rack', module: 'pipes' },
      ],
    });

    expect(action.alternatives.map((entry) => entry.label)).toEqual(['Study cabinet', 'Living room rack']);
    const state = initialActionState([action]);
    expect(state.actionAlternatives[action.id]).toBe(action.alternatives[0].id);
  });
});

describe('3. multiple independent actions', () => {
  it('keeps independent proposals as separate selectable actions', () => {
    const actions = buildActionsFromProposals([
      proposal({ ids: ['pipe-1'], recordNames: ['Savinelli 320'] }),
      proposal({ ids: ['pipe-2'], recordNames: ['Dunhill 5102'], patch: { notes: 'Smokes cool' }, changes: [] }),
    ]);
    expect(actions).toHaveLength(2);
    expect(new Set(actions.map((entry) => entry.id)).size).toBe(2);

    const payload = buildExecutionPayload(actions, {
      selections: Object.fromEntries(actions.map((entry) => [entry.id, true])),
      idempotencyKey: 'k',
    });
    expect(payload.actions).toHaveLength(2);
  });
});

describe('4 & 5. choosing the recommended or a different option', () => {
  const action = () =>
    createAction({
      type: 'record_update',
      targets: [target()],
      alternatives: [
        { id: 'a1', label: 'Virginia', patch: { focus: ['Virginia'] } },
        { id: 'a2', label: 'Burley', patch: { focus: ['Burley'] } },
      ],
    });

  it('writes the recommended option when nothing else is chosen', () => {
    const entry = action();
    expect(effectiveTargets(entry, 'a1')[0].patch.focus).toEqual(['Virginia']);
  });

  it('writes the option the collector actually chose', () => {
    const entry = action();
    const payload = buildExecutionPayload([entry], {
      selections: { [entry.id]: true },
      alternatives: { [entry.id]: 'a2' },
      idempotencyKey: 'k',
    });
    expect(payload.actions[0].targets[0].patch.focus).toEqual(['Burley']);
  });
});

describe('6. a valid custom alternative', () => {
  it('lets a typed value win over the option sitting beside it', () => {
    const entry = createAction({
      type: 'record_update',
      customField: 'focus',
      customLabel: 'specialization',
      targets: [target({ patch: { focus: ['Virginia'] } })],
      alternatives: [
        { id: 'a1', label: 'Virginia', patch: { focus: ['Virginia'] } },
        { id: 'a2', label: 'Burley', patch: { focus: ['Burley'] } },
      ],
    });

    const typed = withCustomValue(entry, 'Oriental');
    // Even with an alternative still selected, the typed value is what is sent.
    const payload = buildExecutionPayload([typed], {
      selections: { [typed.id]: true },
      alternatives: { [typed.id]: 'a1' },
      idempotencyKey: 'k',
    });

    expect(payload.actions[0].targets[0].patch.focus).toEqual(['Oriental']);
  });

  it('adds a typed tag to the ones already recorded rather than replacing them', () => {
    const entry = createAction({
      type: 'record_update',
      customField: 'tags',
      targets: [target({ patch: { tags: ['estate'] } })],
      currentValues: [{ label: 'Tags', from: 'estate, unsmoked' }],
    });
    const typed = withCustomValue(entry, 'gift');
    expect(typed.customValue).toEqual(['estate', 'unsmoked', 'gift']);
  });
});

describe('7 & 8. accepting, deferring and dismissing', () => {
  it('sends only what was accepted', () => {
    const keep = createAction({ id: 'keep', type: 'record_update', targets: [target()] });
    const defer = { ...createAction({ id: 'defer', type: 'record_update', targets: [target()] }), deferred: true };
    const reject = { ...createAction({ id: 'reject', type: 'record_update', targets: [target()] }), rejected: true };

    const payload = buildExecutionPayload([keep, defer, reject], {
      selections: { keep: true, defer: true, reject: true },
      idempotencyKey: 'k',
    });

    expect(payload.actions.map((entry) => entry.id)).toEqual(['keep']);
  });

  it('treats a reviewed high-impact action as accepted', () => {
    // High-impact actions start unselected, so accepting one from its own review
    // must force the selection — otherwise the dialog would accept nothing.
    const merge = createAction({ type: 'record_merge', targets: [target({ role: 'survivor' })] });
    expect(merge.defaultSelected).toBe(false);

    const payload = buildExecutionPayload([merge], { selections: { [merge.id]: true }, idempotencyKey: 'k' });
    expect(payload.actions).toHaveLength(1);

    const list = read('src/components/actions/ActionList.jsx');
    expect(list).toContain('for (const action of reviewing) accepted[action.id] = true');
  });
});

describe('9. supporting explanations', () => {
  const action = createAction({
    id: 'a1',
    type: 'record_update',
    targets: [target()],
    rationale: 'Blend family drives pairing.',
    alternatives: [
      { id: 'o1', label: 'Virginia', description: 'single family', rationale: 'Most sessions used it.' },
      { id: 'o2', label: 'Burley', description: 'second family', rationale: 'Two sessions used it.' },
    ],
  });

  it('explains an option without changing anything', () => {
    const resolved = resolveActionReference('explain the second option', { actions: [action] });
    expect(resolved.kind).toBe('explain');
    expect(resolved.message).toContain('Burley');
    expect(resolved.message).toMatch(/Nothing has been changed/);
  });
});

describe('conversational references to presented options', () => {
  const multi = [
    createAction({ id: 'a1', type: 'record_update', targets: [target({ recordId: 'p1' })], title: 'Set condition' }),
    createAction({
      id: 'a2',
      type: 'storage_assign',
      targets: [target({ recordId: 'p2', patch: { storage_location_id: 'loc-1' } })],
      title: 'Assign storage',
    }),
  ];

  it('asks instead of guessing when "apply it" could mean either change', () => {
    const resolved = resolveActionReference('apply it', { actions: multi });
    expect(resolved.kind).toBe('clarify');
    expect(resolved.message).toMatch(/which one|all of them|specific/i);
  });

  it('applies the option named by number, and only that action', () => {
    const action = createAction({
      id: 'one',
      type: 'record_update',
      targets: [target()],
      alternatives: [
        { id: 'o1', label: 'Virginia', patch: { focus: ['Virginia'] } },
        { id: 'o2', label: 'Burley', patch: { focus: ['Burley'] } },
      ],
    });

    const resolved = resolveActionReference('apply the second option', { actions: [action] });
    expect(resolved.kind).toBe('apply');
    expect(resolved.alternativeId).toBe('o2');
    expect(resolved.selections).toEqual({ one: true });
  });

  it('leaves out the change the collector excluded', () => {
    const resolved = resolveActionReference('apply everything except the storage change', { actions: multi });
    expect(resolved.kind).toBe('apply');
    expect(resolved.actionIds).toEqual(['a1']);
    expect(resolved.selections).toEqual({ a1: true, a2: false });
  });
});

describe('10. applying from the Curator conversation', () => {
  it('sends the conversation’s actions through the one executor with a stable key', () => {
    const hook = read('src/components/curator/useCuratorRecordProposals.js');
    expect(hook).toContain("executeActions(actions");
    expect(hook).toContain('idempotencyKey: `curator_${message.id}`');
    expect(hook).not.toContain('curatorRecordChange');

    const set = read('src/components/curator/CuratorActionSet.jsx');
    expect(set).toContain('ActionReviewDialog');
    expect(set).toContain('onApply');
  });
});

describe('11 & 12. resolving a finding from a report or a drill-down', () => {
  const findings = () =>
    buildFindings({
      collections: [{ moduleKey: 'pipekeeper', records: [{ id: 'pipe-1', name: 'Savinelli', lifecycle_status: 'active', condition: 'Mint' }] }],
      locations: [{ id: 'loc-1', name: 'Study cabinet', module: 'pipes' }],
    });

  it('builds the same framework action from a derived finding', () => {
    const action = findings().find((entry) => entry.type === 'storage').actions[0];
    expect(action.type).toBe('storage_assign');
    expect(action.origin).toBe('collection_health');

    const payload = buildExecutionPayload([action], {
      selections: { [action.id]: true },
      idempotencyKey: 'k',
    });
    expect(payload.actions[0].targets[0].patch).toEqual({ storage_location_id: 'loc-1' });
  });

  it('accepts every selected finding in one reviewed run', () => {
    const panel = read('src/components/actions/FindingsReviewPanel.jsx');
    expect(panel).toContain('Object.fromEntries(actions.map((action) => [action.id, true]))');
    expect(panel).toContain('ActionReviewDialog');
    expect(panel).toContain("onStateChange(finding, 'resolved')");
  });

  it('is reachable from a dashboard row and from a report, keeping the filters', () => {
    const hub = read('src/components/hub/CollectionHealthRow.jsx');
    expect(hub).toContain('onOpen');

    const page = read('src/pages/CollectionHealth.jsx');
    expect(page).toContain('FindingsReviewPanel');
    expect(page).toContain('initialParam');
  });
});

describe('13. bulk inventory changes', () => {
  it('previews the change before writing and sends every selected record', () => {
    const page = read('src/pages/CollectionTools.jsx');
    expect(page).toContain('useActionExecution');
    expect(page).toContain('ActionReviewDialog');
    expect(page).toContain('selections: { [pendingAction.id]: true }');

    const bulk = createAction({
      type: 'record_update',
      origin: 'collection_tools',
      targets: [target({ recordId: 'p1' }), target({ recordId: 'p2' }), target({ recordId: 'p3' })],
    });
    const payload = buildExecutionPayload([bulk], { selections: { [bulk.id]: true }, idempotencyKey: 'k' });
    expect(payload.actions[0].targets).toHaveLength(3);
  });
});

describe('14. reviewing and merging duplicates', () => {
  it('merges through the reviewed action, keeping one record and archiving the rest', () => {
    const merge = createAction({
      type: 'record_merge',
      origin: 'duplicates',
      targets: [
        { entity: 'Pipe', recordId: 'keep', name: 'Savinelli', role: 'survivor' },
        { entity: 'Pipe', recordId: 'dup-1', name: 'Savinelli 320', role: 'source' },
      ],
    });

    expect(isHighImpact(merge.type)).toBe(true);
    expect(undoEligible(merge.type)).toBe(false);

    const payload = buildExecutionPayload([merge], { selections: { [merge.id]: true }, idempotencyKey: 'k' });
    expect(payload.actions[0].targets.map((entry) => entry.role)).toEqual(['survivor', 'source']);

    const panel = read('src/components/collection/DuplicateReviewPanel.jsx');
    expect(panel).toContain('selections: { [reviewing.id]: true }');
    expect(panel).not.toContain('collectionItemMerge');
  });
});

describe('15. reversing an eligible action', () => {
  it('offers undo only for reversible runs that changed something', () => {
    const summary = summarizeExecution({
      actions: [
        {
          id: 'a1',
          type: 'record_update',
          execution_id: 'run-1',
          undo_eligible: true,
          status: 'completed',
          results: [{ recordId: 'pipe-1', status: 'completed', changed_fields: ['condition'] }],
        },
      ],
    });
    expect(summary.undoableExecutionIds).toEqual(['run-1']);

    const executor = read('base44/functions/actionExecute/entry.ts');
    expect(executor).toContain('planUndo');
    expect(executor).toContain('changed_since_apply');
    // A run can only be reversed by the collector it belongs to.
    expect(executor).toContain('id: executionId');
    expect(executor).toContain('user_email: user.email');
  });
});

describe('16 & 17. a stale proposal or a record changed elsewhere', () => {
  it('sends the values the proposal was built against', () => {
    const action = createAction({ type: 'record_update', targets: [target({ expected: { condition: 'Good' } })] });
    const payload = buildExecutionPayload([action], { selections: { [action.id]: true }, idempotencyKey: 'k' });
    expect(payload.actions[0].targets[0].expected).toEqual({ condition: 'Good' });
  });

  it('refuses the write and says so when the record no longer matches', () => {
    const executor = read('base44/functions/actionExecute/entry.ts');
    expect(executor).toContain('staleFields(record, target?.expected)');
    expect(executor).toContain("reason: 'record_changed_since_proposal'");
    expect(describeReason('record_changed_since_proposal')).toMatch(/changed since/i);
  });
});

describe('18. an unauthorized collector', () => {
  it('re-checks ownership on the server for every write path', () => {
    const executor = read('base44/functions/actionExecute/entry.ts');
    const checks = executor.match(/isAuthorizedForRecord\(/g) || [];
    // patch targets, merge survivor, merge sources, valuation, undo
    expect(checks.length).toBeGreaterThanOrEqual(4);
    expect(executor).toContain("reason: 'not_authorized'");
    expect(describeReason('not_authorized')).toMatch(/permission/i);
  });
});

describe('19. the same action submitted twice', () => {
  it('does not report a repeated submission as a new success', () => {
    const summary = summarizeExecution({
      actions: [
        {
          id: 'a1',
          type: 'record_update',
          status: 'completed',
          duplicate_prevented: true,
          results: [{ recordId: 'pipe-1', status: 'completed' }],
        },
      ],
    });
    expect(summary.duplicates).toBe(1);
    expect(summary.completed).toBe(0);
    expect(summary.status).not.toBe('completed');
  });

  it('reuses one key for an attempt and joins an in-flight request', () => {
    const hook = read('src/hooks/useActionExecution.js');
    expect(hook).toContain('if (inFlight.current) return inFlight.current');
    expect(hook).toContain('attemptKey.current');
  });
});

describe('20 & 21. partial failure and a failed dependency', () => {
  it('reports a partial run as partial, never as a success', () => {
    const summary = summarizeExecution({
      actions: [
        {
          id: 'a1',
          type: 'record_update',
          status: 'partial',
          execution_id: 'run-9',
          undo_eligible: true,
          results: [
            { recordId: 'p1', status: 'completed' },
            { recordId: 'p2', status: 'failed', reason: 'not_authorized' },
          ],
        },
      ],
    });
    expect(summary.status).toBe('partial');
    expect(summary.completed).toBe(1);
    expect(summary.failed).toBe(1);
  });

  it('reports a blocked dependent action with its reason instead of "nothing changed"', () => {
    const summary = summarizeExecution({
      actions: [{ id: 'second', type: 'record_update', status: 'blocked', blocked_by: ['first'], results: [] }],
    });
    expect(summary.blocked).toBe(1);
    expect(summary.status).toBe('blocked');
    expect(summary.rows[0].reason).toBe('prerequisite_failed');
    expect(describeReason('prerequisite_failed')).toMatch(/depends on/i);
  });
});

describe('22. a required field missing', () => {
  it('explains a refused field or amount in plain words', () => {
    expect(describeReason('no_supported_fields')).toMatch(/can be changed/i);
    expect(describeReason('invalid_amount')).toMatch(/valid number/i);

    const executor = read('base44/functions/actionExecute/entry.ts');
    expect(executor).toContain("reason: 'invalid_amount'");
    expect(executor).toContain("reason: 'no_supported_fields'");
  });
});

describe('23. a connection that drops during execution', () => {
  it('retries once with the same key, then reports the outcome as unknown', () => {
    const hook = read('src/hooks/useActionExecution.js');
    expect(hook).toContain('outcome = await send();');
    expect(hook).toContain('attemptKey.current = null;');
    expect(hook).toContain('before this could be confirmed');
    // It must never claim success when it could not confirm the result.
    expect(hook).toContain("setStatus('failed')");
  });
});

describe('24. an entitlement restriction', () => {
  it('is enforced by the executor before anything is written', () => {
    const executor = read('base44/functions/actionExecute/entry.ts');
    expect(executor).toContain('resolveCuratorAccess(req)');
    expect(executor).toContain('needsCuratorAccess');
  });
});

describe('25. dashboards and reports after a completed action', () => {
  it('reloads from the server on any outcome instead of patching locally', () => {
    const hook = read('src/hooks/useActionExecution.js');
    expect(hook).toContain('queryClient.invalidateQueries()');
    expect(hook).toContain('refresh();');

    const panel = read('src/components/actions/FindingsReviewPanel.jsx');
    expect(panel).toContain('onApplied');

    // The data behind the dashboards and reports is query-cached, so invalidating
    // it is what makes them recalculate.
    const data = read('src/components/reports/useReportCenterData.jsx');
    expect(data).toContain('useQuery');
  });
});

describe('one write path, no parallel writers', () => {
  it('has a single client that invokes the executor', () => {
    const client = read('src/lib/actions/actionClient.js');
    expect(client.match(/invoke\('actionExecute'/g)).toHaveLength(2);
  });

  it('keeps action surfaces free of direct record writes', () => {
    const surfaces = [
      'src/components/actions/ActionList.jsx',
      'src/components/actions/FindingsReviewPanel.jsx',
      'src/components/collection/DuplicateReviewPanel.jsx',
      'src/components/curator/CuratorActionSet.jsx',
    ];
    for (const path of surfaces) {
      const source = read(path);
      expect(source, `${path} writes a record directly`).not.toMatch(/entities\.[A-Za-z]+\.(update|create|delete)\(/);
    }
  });

  it('keeps the review step in front of every material change', () => {
    for (const path of [
      'src/components/actions/ActionList.jsx',
      'src/components/actions/FindingsReviewPanel.jsx',
      'src/components/collection/DuplicateReviewPanel.jsx',
      'src/components/curator/CuratorActionSet.jsx',
      'src/pages/CollectionTools.jsx',
    ]) {
      expect(read(path), `${path} executes without a preview`).toContain('ActionReviewDialog');
    }
  });
});

describe('mobile and desktop review of action surfaces', () => {
  it('wraps rather than overflowing, and keeps controls tappable', () => {
    for (const path of [
      'src/components/actions/ActionCard.jsx',
      'src/components/actions/FindingRow.jsx',
      'src/components/actions/FindingsReviewPanel.jsx',
    ]) {
      const source = read(path);
      expect(source).toContain('flex-wrap');
      expect(source).toContain('break-words');
      expect(source).toMatch(/min-h-\[4[0-9]px\]/);
    }
  });

  it('never hardcodes a width wider than the smallest phone', () => {
    for (const path of ['src/components/actions/ActionCard.jsx', 'src/components/actions/FindingRow.jsx']) {
      const source = read(path);
      const widths = [...source.matchAll(/width:\s*(\d{3,})/g)].map((match) => Number(match[1]));
      expect(widths.filter((value) => value > 320)).toEqual([]);
    }
  });
});