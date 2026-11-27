import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import {
  COLLECTION_ENTITIES,
  isAuthorizedForRecord,
  activitySummary,
  planMerge,
} from '../../shared/collectionRecords.ts';
import { planUndo, sanitiseCuratorPatch } from '../../shared/curatorRecordChanges.ts';
import {
  MAX_BULK_RECORDS,
  getActionDefinition,
  isCollectionEntity,
  resolveActionFields,
} from '../../shared/actionRegistry.ts';
import { resolveCuratorAccess } from '../../shared/curatorAccess.ts';
import { comparable, logActivity, pickFields, recordLabel } from '../../shared/actionHelpers.ts';

/**
 * The single executor for the Universal Action Framework.
 *
 * Every feature — Curator, the hub, modules, reports, collection tools — sends
 * its accepted actions here instead of writing records itself. This function is
 * the only place an action becomes a mutation, and it re-establishes every fact
 * the client claimed before writing anything:
 *
 *   authentication → registered action type → entitlement → idempotency
 *   → record exists → ownership → proposal still current → field allowlist
 *   → write → read back and verify → audit → undo snapshot
 *
 * A target that fails is reported as failed, never as a success, and never
 * blocks an independent target in the same batch. Actions declare dependencies;
 * a dependent action whose prerequisite did not complete is reported blocked
 * rather than executed out of order.
 *
 * Modes:
 *   execute — run accepted actions
 *   undo    — reverse one previous run, only while the record still holds what
 *             that run wrote
 */

async function loadRecord(base44: any, entityName: string, id: string) {
  try {
    const rows = await base44.asServiceRole.entities[entityName].filter({ id });
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  } catch {
    return null;
  }
}

/** Narrow a submitted patch to the action's own allowlist, then validate it. */
function sanitiseForAction(definition: any, entityName: string, payload: any) {
  const allowed = new Set(resolveActionFields(definition, entityName));
  const candidate: Record<string, unknown> = {};
  const rejected: string[] = [];
  for (const [key, value] of Object.entries(payload || {})) {
    if (allowed.has(key)) candidate[key] = value;
    else rejected.push(key);
  }
  if (Object.keys(candidate).length === 0) {
    return { patch: {} as Record<string, unknown>, rejected };
  }
  const sanitised = sanitiseCuratorPatch(entityName, candidate);
  return { patch: sanitised.patch, rejected: [...rejected, ...sanitised.rejected] };
}

/** Does the record still hold what the proposal was built against? */
function staleFields(record: any, expected: any): string[] {
  if (!expected || typeof expected !== 'object') return [];
  return Object.entries(expected)
    .filter(([field, value]) => comparable(record?.[field]) !== comparable(value))
    .map(([field]) => field);
}

async function executePatchTarget(base44: any, user: any, definition: any, target: any) {
  const entityName = String(target?.entity || '');
  const recordId = String(target?.recordId || '');

  if (!isCollectionEntity(entityName)) {
    return { recordId, entity: entityName, status: 'failed', reason: 'unsupported_entity' };
  }
  const record = await loadRecord(base44, entityName, recordId);
  if (!record) return { recordId, entity: entityName, status: 'failed', reason: 'record_not_found' };
  if (!isAuthorizedForRecord(record, user)) {
    return { recordId, entity: entityName, status: 'failed', reason: 'not_authorized' };
  }

  const stale = staleFields(record, target?.expected);
  if (stale.length > 0) {
    return {
      recordId,
      entity: entityName,
      name: recordLabel(record),
      status: 'failed',
      reason: 'record_changed_since_proposal',
      stale_fields: stale,
    };
  }

  let patch: Record<string, unknown>;
  let rejected: string[];
  try {
    const sanitised = sanitiseForAction(definition, entityName, target?.patch);
    patch = sanitised.patch;
    rejected = sanitised.rejected;
  } catch (error) {
    return {
      recordId,
      entity: entityName,
      name: recordLabel(record),
      status: 'failed',
      reason: (error as Error).message || 'invalid_patch',
    };
  }

  const fields = Object.keys(patch);
  if (fields.length === 0) {
    return {
      recordId,
      entity: entityName,
      name: recordLabel(record),
      status: 'failed',
      reason: 'no_supported_fields',
      rejected_fields: rejected,
    };
  }

  const before = pickFields(record, fields);
  const after = pickFields({ ...record, ...patch }, fields);
  const changed = fields.filter((field) => comparable(before[field]) !== comparable(after[field]));
  if (changed.length === 0) {
    return { recordId, entity: entityName, name: recordLabel(record), status: 'skipped', reason: 'already_matches' };
  }

  try {
    await base44.asServiceRole.entities[entityName].update(recordId, patch);
  } catch (error) {
    return {
      recordId,
      entity: entityName,
      name: recordLabel(record),
      status: 'failed',
      reason: (error as Error).message || 'write_failed',
    };
  }

  // Never claim success before the value is actually persisted.
  const verified = await loadRecord(base44, entityName, recordId);
  const mismatched = changed.filter((field) => comparable(verified?.[field]) !== comparable(patch[field]));
  if (!verified || mismatched.length > 0) {
    return {
      recordId,
      entity: entityName,
      name: recordLabel(record),
      status: 'failed',
      reason: 'verification_failed',
      unverified_fields: mismatched,
      before,
      after,
    };
  }

  await logActivity(base44, {
    record_entity: entityName,
    record_id: recordId,
    record_name: recordLabel(record),
    module_key: COLLECTION_ENTITIES[entityName].moduleKey,
    event_type: changed.length > 1 || (target?.bulk === true) ? 'bulk_updated' : 'updated',
    summary: activitySummary('updated', 1, COLLECTION_ENTITIES[entityName].label),
    detail: `Accepted action (${definition.id}): ${changed.join(', ')}`,
    changed_fields: changed,
    actor_email: user.email,
    occurred_at: new Date().toISOString(),
    created_by_id: user.id,
  });

  return {
    recordId,
    entity: entityName,
    name: recordLabel(record),
    status: 'completed',
    before,
    after,
    changed_fields: changed,
    rejected_fields: rejected,
  };
}

async function executeMerge(base44: any, user: any, definition: any, targets: any[]) {
  const survivorTarget = targets.find((target) => target?.role === 'survivor') || targets[0];
  const sourceTargets = targets.filter((target) => target !== survivorTarget);
  const entityName = String(survivorTarget?.entity || '');
  const survivorId = String(survivorTarget?.recordId || '');

  if (!isCollectionEntity(entityName)) {
    return [{ recordId: survivorId, entity: entityName, status: 'failed', reason: 'unsupported_entity' }];
  }
  if (sourceTargets.length === 0) {
    return [{ recordId: survivorId, entity: entityName, status: 'failed', reason: 'no_duplicates_selected' }];
  }

  const survivor = await loadRecord(base44, entityName, survivorId);
  if (!survivor) return [{ recordId: survivorId, entity: entityName, status: 'failed', reason: 'record_not_found' }];
  if (!isAuthorizedForRecord(survivor, user)) {
    return [{ recordId: survivorId, entity: entityName, status: 'failed', reason: 'not_authorized' }];
  }

  const sources: any[] = [];
  const results: any[] = [];
  for (const target of sourceTargets) {
    const record = await loadRecord(base44, entityName, String(target?.recordId || ''));
    if (!record) {
      results.push({ recordId: String(target?.recordId || ''), entity: entityName, status: 'failed', reason: 'record_not_found' });
      continue;
    }
    if (!isAuthorizedForRecord(record, user)) {
      results.push({ recordId: record.id, entity: entityName, status: 'failed', reason: 'not_authorized' });
      continue;
    }
    if (record.id === survivorId) {
      results.push({ recordId: record.id, entity: entityName, status: 'skipped', reason: 'survivor_selected_as_duplicate' });
      continue;
    }
    sources.push(record);
  }

  if (sources.length === 0) {
    return results.length > 0
      ? results
      : [{ recordId: survivorId, entity: entityName, status: 'failed', reason: 'no_duplicates_selected' }];
  }

  const plan = planMerge(survivor, sources, entityName);
  await base44.asServiceRole.entities[entityName].update(survivorId, plan.patch);

  const now = new Date().toISOString();
  for (const source of sources) {
    await base44.asServiceRole.entities[entityName].update(source.id, {
      lifecycle_status: 'archived',
      merged_into_id: survivorId,
      merged_at: now,
      lifecycle_note: `Merged into ${recordLabel(survivor) || survivorId}`,
    });
  }

  await logActivity(base44, {
    record_entity: entityName,
    record_id: survivorId,
    record_name: recordLabel(survivor),
    module_key: COLLECTION_ENTITIES[entityName].moduleKey,
    event_type: 'merged',
    summary: activitySummary('merged', sources.length, COLLECTION_ENTITIES[entityName].label),
    detail: `Accepted action (${definition.id}). Filled: ${plan.filledFields.join(', ') || 'no blank fields'}`,
    changed_fields: Object.keys(plan.patch),
    actor_email: user.email,
    occurred_at: now,
    created_by_id: user.id,
  });

  return [
    {
      recordId: survivorId,
      entity: entityName,
      name: recordLabel(survivor),
      status: 'completed',
      filled_fields: plan.filledFields,
      conflicts: plan.conflicts,
    },
    ...sources.map((source: any) => ({
      recordId: source.id,
      entity: entityName,
      name: recordLabel(source),
      status: 'completed',
      archived_into: survivorId,
    })),
    ...results,
  ];
}

async function executeValuation(base44: any, user: any, definition: any, action: any) {
  const target = action?.targets?.[0] || {};
  const entityName = String(target?.entity || '');
  const recordId = String(target?.recordId || '');
  const input = action?.input || {};

  if (!isCollectionEntity(entityName)) {
    return [{ recordId, entity: entityName, status: 'failed', reason: 'unsupported_entity' }];
  }
  const record = await loadRecord(base44, entityName, recordId);
  if (!record) return [{ recordId, entity: entityName, status: 'failed', reason: 'record_not_found' }];
  if (!isAuthorizedForRecord(record, user)) {
    return [{ recordId, entity: entityName, status: 'failed', reason: 'not_authorized' }];
  }

  const amount = Number(input?.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    return [{ recordId, entity: entityName, status: 'failed', reason: 'invalid_amount' }];
  }

  try {
    const created = await base44.asServiceRole.entities.ValuationRecord.create({
      record_entity: entityName,
      record_id: recordId,
      record_name: recordLabel(record),
      module_key: COLLECTION_ENTITIES[entityName].moduleKey,
      kind: String(input?.kind || 'user_estimate'),
      amount,
      currency: String(input?.currency || 'USD'),
      amount_base: amount,
      base_currency: String(input?.currency || 'USD'),
      valuation_date: String(input?.valuation_date || new Date().toISOString().slice(0, 10)),
      source: input?.source || null,
      source_type: input?.source_type || 'manual',
      confidence: input?.confidence || 'unknown',
      notes: input?.notes || null,
      created_by: user.email,
    });

    await logActivity(base44, {
      record_entity: entityName,
      record_id: recordId,
      record_name: recordLabel(record),
      module_key: COLLECTION_ENTITIES[entityName].moduleKey,
      event_type: 'acquisition_recorded',
      summary: 'Valuation recorded',
      detail: `Accepted action (${definition.id}): ${amount} ${input?.currency || 'USD'}`,
      actor_email: user.email,
      occurred_at: new Date().toISOString(),
      created_by_id: user.id,
    });

    return [{
      recordId,
      entity: entityName,
      name: recordLabel(record),
      status: 'completed',
      created_id: created?.id || null,
      created_entity: 'ValuationRecord',
      before: null,
      after: { amount, currency: input?.currency || 'USD' },
    }];
  } catch (error) {
    return [{
      recordId,
      entity: entityName,
      status: 'failed',
      reason: (error as Error).message || 'write_failed',
    }];
  }
}

function summarise(results: any[]): string {
  if (results.length === 0) return 'skipped';
  const completed = results.filter((row) => row.status === 'completed').length;
  const failed = results.filter((row) => row.status === 'failed').length;
  const skipped = results.filter((row) => row.status === 'skipped').length;
  if (completed > 0 && (failed > 0 || skipped > 0)) return 'partial';
  if (completed > 0) return 'completed';
  if (failed > 0) return 'failed';
  return 'skipped';
}

async function executeAction(base44: any, user: any, action: any, idempotencyKey: string, completedActionIds: Set<string>) {
  const definition = getActionDefinition(action?.type);
  const actionRef = String(action?.id || '');

  if (!definition) {
    return {
      id: actionRef,
      type: String(action?.type || ''),
      status: 'failed',
      message: 'That action type is not supported.',
      results: [],
    };
  }

  // Dependencies: a dependent action waits for its prerequisite to complete.
  const dependsOn: string[] = Array.isArray(action?.depends_on) ? action.depends_on : [];
  const unmet = dependsOn.filter((id) => !completedActionIds.has(id));
  if (unmet.length > 0) {
    return {
      id: actionRef,
      type: definition.id,
      status: 'blocked',
      message: 'A prerequisite action did not complete.',
      blocked_by: unmet,
      results: [],
    };
  }

  const runKey = `${idempotencyKey}:${actionRef}`;
  const prior = await base44.asServiceRole.entities.ActionExecution.filter({
    user_email: user.email,
    idempotency_key: runKey,
  }).catch(() => []);

  if (Array.isArray(prior) && prior.length > 0) {
    const existing = prior[0];
    return {
      id: actionRef,
      type: definition.id,
      status: existing.status === 'undone' ? 'skipped' : existing.status,
      execution_id: existing.id,
      duplicate_prevented: true,
      message: 'This action was already executed.',
      results: existing.results || [],
    };
  }

  const targets = Array.isArray(action?.targets) ? action.targets : [];
  if (targets.length === 0) {
    return { id: actionRef, type: definition.id, status: 'failed', message: 'No records were selected.', results: [] };
  }
  if (targets.length > MAX_BULK_RECORDS) {
    return {
      id: actionRef,
      type: definition.id,
      status: 'failed',
      message: `An action is limited to ${MAX_BULK_RECORDS} records.`,
      results: [],
    };
  }

  const run = await base44.asServiceRole.entities.ActionExecution.create({
    action_ref: actionRef,
    action_type: definition.id,
    origin: String(action?.origin || 'unknown'),
    module_key: String(action?.module || targets[0]?.module || ''),
    user_email: user.email,
    idempotency_key: runKey,
    confirmation_level: definition.confirmation,
    status: 'executing',
    targets: targets.map((target: any) => ({
      entity: target?.entity || null,
      recordId: target?.recordId || null,
      role: target?.role || 'target',
    })),
    undo_eligible: definition.undo,
    started_at: new Date().toISOString(),
  });

  let results: any[] = [];
  try {
    if (definition.handler === 'merge') {
      results = await executeMerge(base44, user, definition, targets);
    } else if (definition.handler === 'valuation') {
      results = await executeValuation(base44, user, definition, action);
    } else {
      for (const target of targets) {
        results.push(await executePatchTarget(base44, user, definition, target));
      }
    }
  } catch (error) {
    results.push({
      recordId: null,
      status: 'failed',
      reason: (error as Error).message || 'execution_failed',
    });
  }

  const status = summarise(results);
  const errorMessage =
    status === 'failed'
      ? results.find((row) => row.status === 'failed')?.reason || 'No record was changed'
      : null;

  await base44.asServiceRole.entities.ActionExecution.update(run.id, {
    status,
    results,
    error_message: errorMessage,
    completed_at: new Date().toISOString(),
  });

  if (status === 'completed' || status === 'partial') completedActionIds.add(actionRef);

  return {
    id: actionRef,
    type: definition.id,
    status,
    execution_id: run.id,
    undo_eligible: definition.undo,
    results,
    message:
      status === 'completed'
        ? 'Applied.'
        : status === 'partial'
          ? 'Some records were changed and others were not.'
          : status === 'skipped'
            ? 'Nothing needed changing.'
            : 'Nothing was changed.',
  };
}

async function undoExecution(base44: any, user: any, executionId: string) {
  const runs = await base44.asServiceRole.entities.ActionExecution.filter({
    id: executionId,
    user_email: user.email,
  }).catch(() => []);
  const run = Array.isArray(runs) ? runs[0] : null;

  if (!run) return Response.json({ error: 'That change was not found for this account' }, { status: 404 });
  if (run.undone_at) return Response.json({ error: 'That change has already been reversed' }, { status: 409 });
  if (!run.undo_eligible) return Response.json({ error: 'That action cannot be reversed' }, { status: 400 });

  const definition = getActionDefinition(run.action_type);
  const results = Array.isArray(run.results) ? run.results : [];
  const reversed: any[] = [];
  const skipped: any[] = [];

  for (const result of results) {
    if (result?.status !== 'completed') continue;

    if (result.created_entity === 'ValuationRecord' && result.created_id) {
      try {
        await base44.asServiceRole.entities.ValuationRecord.delete(result.created_id);
        reversed.push({ recordId: result.recordId, entity: result.entity, restored: 'valuation_removed' });
      } catch (error) {
        skipped.push({ recordId: result.recordId, reason: (error as Error).message || 'delete_failed' });
      }
      continue;
    }

    const entityName = String(result?.entity || '');
    if (!isCollectionEntity(entityName)) {
      skipped.push({ recordId: result?.recordId, reason: 'unsupported_entity' });
      continue;
    }

    const record = await loadRecord(base44, entityName, String(result?.recordId || ''));
    if (!record) {
      skipped.push({ recordId: result?.recordId, reason: 'record_missing' });
      continue;
    }
    if (!isAuthorizedForRecord(record, user)) {
      skipped.push({ recordId: result?.recordId, reason: 'not_authorized' });
      continue;
    }

    const { restore, blocked } = planUndo({
      beforeState: result.before,
      afterState: result.after,
      currentRecord: record,
    });

    if (Object.keys(restore).length === 0) {
      skipped.push({
        recordId: result.recordId,
        reason: blocked.length ? 'changed_since_apply' : 'nothing_to_restore',
        blocked,
      });
      continue;
    }

    try {
      await base44.asServiceRole.entities[entityName].update(record.id, restore);
      const verified = await loadRecord(base44, entityName, record.id);
      const mismatched = Object.keys(restore).filter(
        (field) => comparable(verified?.[field]) !== comparable(restore[field])
      );
      if (mismatched.length > 0) {
        skipped.push({ recordId: record.id, reason: 'verification_failed', unverified_fields: mismatched });
        continue;
      }

      await logActivity(base44, {
        record_entity: entityName,
        record_id: record.id,
        record_name: recordLabel(record),
        module_key: COLLECTION_ENTITIES[entityName].moduleKey,
        event_type: 'updated',
        summary: activitySummary('updated', 1, COLLECTION_ENTITIES[entityName].label),
        detail: `Reversed action ${definition?.id || run.action_type} at the collector's request`,
        changed_fields: Object.keys(restore),
        actor_email: user.email,
        occurred_at: new Date().toISOString(),
        created_by_id: user.id,
      });

      reversed.push({ recordId: record.id, entity: entityName, restored: Object.keys(restore), blocked });
    } catch (error) {
      skipped.push({ recordId: record.id, reason: (error as Error).message || 'write_failed' });
    }
  }

  if (reversed.length > 0) {
    await base44.asServiceRole.entities.ActionExecution.update(run.id, {
      status: 'undone',
      undone_at: new Date().toISOString(),
    });
  }

  return Response.json({
    mode: 'undo',
    execution_id: run.id,
    status: reversed.length > 0 ? 'undone' : 'failed',
    reversed,
    skipped,
    message:
      reversed.length > 0
        ? 'The change was reversed.'
        : 'Nothing could be reversed; your records are unchanged.',
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let user;
    try {
      user = await base44.auth.me();
    } catch {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const mode = String(body?.mode || 'execute');

    if (mode === 'undo') {
      const executionId = String(body?.execution_id || '');
      if (!executionId) return Response.json({ error: 'An execution_id is required' }, { status: 400 });
      return await undoExecution(base44, user, executionId);
    }

    const actions = Array.isArray(body?.actions) ? body.actions : [];
    if (actions.length === 0) {
      return Response.json({ error: 'No actions were supplied' }, { status: 400 });
    }
    const idempotencyKey = String(body?.idempotency_key || '');
    if (!idempotencyKey) {
      return Response.json({ error: 'An idempotency key is required' }, { status: 400 });
    }

    // Curator-originated writes stay a Pro capability; module actions are gated
    // by ownership alone, exactly as they were before this framework.
    const needsCuratorAccess = actions.some(
      (action: any) => String(action?.origin || '') === 'curator' || getActionDefinition(action?.type)?.curatorOnly === true
    );
    if (needsCuratorAccess) {
      const access = await resolveCuratorAccess(req);
      if (!access.ok) {
        return Response.json({ error: access.error, reason: access.reason }, { status: access.status || 403 });
      }
    }

    const completedActionIds = new Set<string>();
    const results: any[] = [];
    for (const action of actions) {
      results.push(await executeAction(base44, user, action, idempotencyKey, completedActionIds));
    }

    return Response.json({ mode: 'execute', idempotency_key: idempotencyKey, actions: results });
  } catch (error) {
    console.error('[actionExecute] error:', error);
    return Response.json({ error: (error as Error).message || 'Action failed' }, { status: 500 });
  }
});