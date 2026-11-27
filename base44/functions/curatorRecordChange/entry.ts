import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import {
  COLLECTION_ENTITIES,
  MAX_BULK_RECORDS,
  activitySummary,
  isAuthorizedForRecord,
} from '../../shared/collectionRecords.ts';
import {
  diffRecord,
  hasRealChange,
  planUndo,
  sanitiseCuratorPatch,
} from '../../shared/curatorRecordChanges.ts';
import { resolveCuratorAccess } from '../../shared/curatorAccess.ts';

/**
 * Server-side authority for changes Curator proposes.
 *
 * The preview a collector confirms is only a proposal: this function re-reads
 * the record, re-validates every field against the allowlist, re-checks
 * ownership and only then writes. Every write is recorded twice — as
 * CollectionActivity for the record's history and as a CuratorActionRun plus
 * CuratorActionApplyResult rows so the change can be undone.
 *
 * Modes:
 *   apply — write a validated patch to one record or to several owned records
 *   undo  — restore the values a previous run replaced, only while unchanged
 */

const ITEM_TYPE: Record<string, string> = {
  Pipe: 'pipe',
  TobaccoBlend: 'tobacco',
  Bottle: 'bottle',
  Cigar: 'collection',
  Wine: 'collection',
};

function pickFields(record: any, fields: string[]) {
  const out: Record<string, unknown> = {};
  for (const field of fields) out[field] = record?.[field] ?? null;
  return out;
}

function recordLabel(record: any) {
  return String(record?.name || record?.wine_name || record?.blend_name || record?.id || '');
}

async function logActivity(base44: any, payload: Record<string, unknown>) {
  try {
    await base44.asServiceRole.entities.CollectionActivity.create(payload);
  } catch (error) {
    console.warn('curatorRecordChange activity log failed:', error);
  }
}

async function applyChanges(base44: any, user: any, body: any) {
  const entityName = String(body?.entityName || '');
  const ids = Array.isArray(body?.ids)
    ? body.ids.filter(Boolean)
    : body?.recordId
      ? [String(body.recordId)]
      : [];

  if (!COLLECTION_ENTITIES[entityName]) {
    return Response.json({ error: `Unsupported collection entity: ${entityName}` }, { status: 400 });
  }
  if (ids.length === 0) {
    return Response.json({ error: 'Select at least one record' }, { status: 400 });
  }
  if (ids.length > MAX_BULK_RECORDS) {
    return Response.json({ error: `A bulk change is limited to ${MAX_BULK_RECORDS} records` }, { status: 400 });
  }

  let patch: Record<string, unknown>;
  let rejected: string[];
  try {
    const sanitised = sanitiseCuratorPatch(entityName, body?.patch || {});
    patch = sanitised.patch;
    rejected = sanitised.rejected;
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400 });
  }

  let found: any[] = [];
  try {
    const records = await base44.asServiceRole.entities[entityName].filter({ id: { $in: ids } });
    found = Array.isArray(records) ? records : [];
  } catch {
    // A malformed or unknown id is a missing record, not a server failure.
    found = [];
  }
  if (found.length === 0) {
    return Response.json({ error: 'No matching records' }, { status: 404 });
  }

  const authorized = found.filter((record: any) => isAuthorizedForRecord(record, user));
  const denied = found.filter((record: any) => !isAuthorizedForRecord(record, user));

  if (authorized.length === 0) {
    return Response.json({ error: 'You do not have permission to edit these records' }, { status: 403 });
  }

  const fields = Object.keys(patch);
  const run = await base44.asServiceRole.entities.CuratorActionRun.create({
    action_id: 'curator_record_change',
    execution_id: `curator_change_${Date.now()}`,
    user_email: user.email,
    status: 'running',
    started_at: new Date().toISOString(),
    result_summary: { entity: entityName, fields },
  });

  const applied: any[] = [];
  const skipped: any[] = [];

  for (const record of authorized) {
    const changes = diffRecord(record, patch);
    if (!hasRealChange(changes)) {
      skipped.push({ id: record.id, name: recordLabel(record), reason: 'already_matches' });
      continue;
    }

    const beforeState = pickFields(record, fields);
    const afterState = pickFields({ ...record, ...patch }, fields);

    try {
      await base44.asServiceRole.entities[entityName].update(record.id, patch);

      await base44.asServiceRole.entities.CuratorActionApplyResult.create({
        recommendation_id: run.id,
        action_run_id: run.id,
        user_email: user.email,
        item_type: ITEM_TYPE[entityName] || 'collection',
        item_id: record.id,
        success: true,
        before_state: beforeState,
        after_state: afterState,
        applied_at: new Date().toISOString(),
      });

      await logActivity(base44, {
        record_entity: entityName,
        record_id: record.id,
        record_name: recordLabel(record),
        module_key: COLLECTION_ENTITIES[entityName].moduleKey,
        event_type: fields.length > 1 || ids.length > 1 ? 'bulk_updated' : 'updated',
        summary: activitySummary('updated', 1, COLLECTION_ENTITIES[entityName].label),
        detail: `Curator applied: ${fields.join(', ')}`,
        changed_fields: fields,
        actor_email: user.email,
        occurred_at: new Date().toISOString(),
      });

      applied.push({ id: record.id, name: recordLabel(record), before: beforeState, after: afterState });
    } catch (error) {
      skipped.push({ id: record.id, name: recordLabel(record), reason: (error as Error).message || 'write_failed' });
    }
  }

  const failed = applied.length === 0;
  await base44.asServiceRole.entities.CuratorActionRun.update(run.id, {
    status: failed ? 'failed' : 'completed',
    completed_at: new Date().toISOString(),
    error_message: failed ? 'No record was changed' : null,
    result_summary: { entity: entityName, fields, applied: applied.length, skipped: skipped.length },
  });

  return Response.json({
    mode: 'apply',
    action_run_id: run.id,
    applied,
    skipped,
    denied: denied.map((record: any) => ({ id: record.id, name: recordLabel(record) })),
    rejected_fields: rejected,
  });
}

async function undoChanges(base44: any, user: any, body: any) {
  const actionRunId = String(body?.action_run_id || '');
  if (!actionRunId) {
    return Response.json({ error: 'An action_run_id is required to undo a change' }, { status: 400 });
  }

  const runs = await base44.asServiceRole.entities.CuratorActionRun.filter({
    id: actionRunId,
    user_email: user.email,
  });
  const run = runs?.[0];
  if (!run) {
    return Response.json({ error: 'That change was not found for this account' }, { status: 404 });
  }
  if (run?.result_summary?.undone_at) {
    return Response.json({ error: 'That change has already been undone' }, { status: 409 });
  }

  const results = await base44.asServiceRole.entities.CuratorActionApplyResult.filter({
    action_run_id: actionRunId,
    user_email: user.email,
    success: true,
  });

  const undoRun = await base44.asServiceRole.entities.CuratorActionRun.create({
    action_id: 'curator_record_change_undo',
    execution_id: `curator_undo_${Date.now()}`,
    user_email: user.email,
    status: 'running',
    started_at: new Date().toISOString(),
    result_summary: { undoes: actionRunId },
  });

  const undone: any[] = [];
  const skipped: any[] = [];

  for (const result of results || []) {
    const entityName = Object.keys(ITEM_TYPE).find((key) => ITEM_TYPE[key] === result.item_type)
      || (result.item_type === 'tobacco' ? 'TobaccoBlend' : result.item_type === 'pipe' ? 'Pipe' : null);
    if (!entityName) {
      skipped.push({ id: result.item_id, reason: 'unsupported_entity' });
      continue;
    }

    let record: any = null;
    try {
      const rows = await base44.asServiceRole.entities[entityName].filter({ id: result.item_id });
      record = rows?.[0] || null;
    } catch {
      record = null;
    }

    if (!record) {
      skipped.push({ id: result.item_id, reason: 'record_missing' });
      continue;
    }
    if (!isAuthorizedForRecord(record, user)) {
      skipped.push({ id: result.item_id, reason: 'not_authorized' });
      continue;
    }

    const { restore, blocked } = planUndo({
      beforeState: result.before_state,
      afterState: result.after_state,
      currentRecord: record,
    });

    if (Object.keys(restore).length === 0) {
      skipped.push({ id: result.item_id, reason: blocked.length ? 'changed_since_apply' : 'nothing_to_restore', blocked });
      continue;
    }

    try {
      await base44.asServiceRole.entities[entityName].update(record.id, restore);

      await base44.asServiceRole.entities.CuratorActionApplyResult.create({
        recommendation_id: undoRun.id,
        action_run_id: undoRun.id,
        user_email: user.email,
        item_type: result.item_type,
        item_id: record.id,
        success: true,
        before_state: result.after_state,
        after_state: result.before_state,
        applied_at: new Date().toISOString(),
      });

      await logActivity(base44, {
        record_entity: entityName,
        record_id: record.id,
        record_name: recordLabel(record),
        module_key: COLLECTION_ENTITIES[entityName].moduleKey,
        event_type: 'updated',
        summary: activitySummary('updated', 1, COLLECTION_ENTITIES[entityName].label),
        detail: 'Curator change reversed at the collector\'s request',
        changed_fields: Object.keys(restore),
        actor_email: user.email,
        occurred_at: new Date().toISOString(),
      });

      undone.push({ id: record.id, name: recordLabel(record), restored: restore, blocked });
    } catch (error) {
      skipped.push({ id: result.item_id, reason: (error as Error).message || 'write_failed' });
    }
  }

  await base44.asServiceRole.entities.CuratorActionRun.update(undoRun.id, {
    status: undone.length > 0 ? 'completed' : 'failed',
    completed_at: new Date().toISOString(),
    error_message: undone.length > 0 ? null : 'Nothing could be reversed',
    result_summary: { undoes: actionRunId, undone: undone.length, skipped: skipped.length },
  });

  if (undone.length > 0) {
    await base44.asServiceRole.entities.CuratorActionRun.update(actionRunId, {
      result_summary: { ...(run.result_summary || {}), undone_at: new Date().toISOString() },
    });
  }

  return Response.json({ mode: 'undo', action_run_id: undoRun.id, undone, skipped });
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

    // Writing collection records from Curator is a Pro capability. Ownership is
    // re-checked per record further down; the entitlement is re-checked here.
    const access = await resolveCuratorAccess(req);
    if (!access.ok) {
      return Response.json({ error: access.error, reason: access.reason }, { status: access.status || 403 });
    }

    const body = await req.json().catch(() => ({}));
    const mode = String(body?.mode || 'apply');

    if (mode === 'undo') return await undoChanges(base44, user, body);
    return await applyChanges(base44, user, body);
  } catch (error) {
    console.error('curatorRecordChange error:', error);
    return Response.json({ error: (error as Error).message || 'Change failed' }, { status: 500 });
  }
});