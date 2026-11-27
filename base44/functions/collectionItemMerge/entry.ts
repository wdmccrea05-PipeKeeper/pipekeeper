// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import {
  COLLECTION_ENTITIES,
  isAuthorizedForRecord,
  planMerge,
} from '../../shared/collectionRecords.ts';

/**
 * Merge duplicate collection records into one surviving record.
 *
 * The surviving record keeps every value it already holds. Blank fields are
 * filled from the duplicates, and arrays (tags, documents, photographs) are
 * unioned so no attachment is lost. Duplicates are archived with a pointer to
 * the survivor rather than deleted, so their history stays recoverable.
 *
 * Requires an explicit `confirm: true` so a merge can never happen by accident.
 */
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
    const entityName = String(body?.entityName || '');
    const targetId = String(body?.targetId || '');
    const sourceIds = Array.isArray(body?.sourceIds) ? body.sourceIds.filter(Boolean) : [];

    if (!COLLECTION_ENTITIES[entityName]) {
      return Response.json({ error: `Unsupported collection entity: ${entityName}` }, { status: 400 });
    }
    if (!targetId || sourceIds.length === 0) {
      return Response.json({ error: 'A surviving record and at least one duplicate are required' }, { status: 400 });
    }
    if (sourceIds.includes(targetId)) {
      return Response.json({ error: 'The surviving record cannot also be a duplicate' }, { status: 400 });
    }
    if (body?.confirm !== true) {
      return Response.json({ error: 'Merge must be confirmed' }, { status: 400 });
    }

    const config = COLLECTION_ENTITIES[entityName];
    const target = await base44.asServiceRole.entities[entityName].get(targetId).catch(() => null);
    if (!target) return Response.json({ error: 'Surviving record not found' }, { status: 404 });
    if (!isAuthorizedForRecord(target, user)) {
      return Response.json({ error: 'You do not have permission to merge these records' }, { status: 403 });
    }

    const sources = [];
    for (const id of sourceIds) {
      const record = await base44.asServiceRole.entities[entityName].get(id).catch(() => null);
      if (!record) continue;
      if (!isAuthorizedForRecord(record, user)) {
        return Response.json({ error: 'You do not have permission to merge these records' }, { status: 403 });
      }
      sources.push(record);
    }

    if (sources.length === 0) {
      return Response.json({ error: 'No duplicate records found to merge' }, { status: 404 });
    }

    const plan = planMerge(target, sources, entityName);
    await base44.asServiceRole.entities[entityName].update(targetId, plan.patch);

    const now = new Date().toISOString();
    for (const source of sources) {
      await base44.asServiceRole.entities[entityName].update(source.id, {
        lifecycle_status: 'archived',
        merged_into_id: targetId,
        merged_at: now,
        lifecycle_note: `Merged into ${target.name || targetId}`,
      });
    }

    const activityRows = [
      {
        record_entity: entityName,
        record_id: targetId,
        record_name: target.name || '',
        module_key: config.moduleKey,
        event_type: 'merged',
        summary: `Merged ${sources.length} duplicate record${sources.length === 1 ? '' : 's'}`,
        detail: `Surviving record kept. Filled: ${plan.filledFields.join(', ') || 'no blank fields'}`,
        changed_fields: Object.keys(plan.patch),
        actor_email: user.email,
        occurred_at: now,
        created_by_id: user.id,
      },
      ...sources.map((source: any) => ({
        record_entity: entityName,
        record_id: source.id,
        record_name: source.name || '',
        module_key: config.moduleKey,
        event_type: 'archived',
        summary: `Archived after merge into ${target.name || targetId}`,
        actor_email: user.email,
        occurred_at: now,
        created_by_id: user.id,
      })),
    ];

    try {
      for (const row of activityRows) {
        await base44.asServiceRole.entities.CollectionActivity.create(row);
      }
    } catch (logError) {
      console.warn('[collectionItemMerge] activity log failed (non-fatal):', logError?.message);
    }

    return Response.json({
      ok: true,
      targetId,
      mergedCount: sources.length,
      filledFields: plan.filledFields,
      conflicts: plan.conflicts,
      archivedIds: sources.map((source: any) => source.id),
    });
  } catch (error) {
    console.error('[collectionItemMerge] error:', error);
    return Response.json({ error: error?.message || 'Merge failed' }, { status: 500 });
  }
});