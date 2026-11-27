// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import {
  COLLECTION_ENTITIES,
  MAX_BULK_RECORDS,
  isAuthorizedForRecord,
  sanitisePatch,
} from '../../shared/collectionRecords.ts';

/**
 * Apply the same documentation change to several collection records at once.
 *
 * Authorization: the caller must be signed in and must own every record they
 * submit (or be an administrator). Records they do not own are reported as
 * skipped and are never written.
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
    const ids = Array.isArray(body?.ids) ? body.ids.filter(Boolean) : [];

    if (!COLLECTION_ENTITIES[entityName]) {
      return Response.json({ error: `Unsupported collection entity: ${entityName}` }, { status: 400 });
    }
    if (ids.length === 0) {
      return Response.json({ error: 'Select at least one record' }, { status: 400 });
    }
    if (ids.length > MAX_BULK_RECORDS) {
      return Response.json(
        { error: `A bulk edit is limited to ${MAX_BULK_RECORDS} records` },
        { status: 400 }
      );
    }

    const { patch, rejected } = sanitisePatch(entityName, body?.patch || {});
    const config = COLLECTION_ENTITIES[entityName];

    const records = await base44.asServiceRole.entities[entityName].filter({ id: { $in: ids } });
    const found = Array.isArray(records) ? records : [];

    const authorized = found.filter((record: any) => isAuthorizedForRecord(record, user));
    const denied = found.filter((record: any) => !isAuthorizedForRecord(record, user));

    if (authorized.length === 0) {
      return Response.json(
        { error: 'You do not have permission to edit these records', updated: 0 },
        { status: 403 }
      );
    }

    // The backend SDK writes one record at a time; ownership is already verified
    // for each id above, so this loop only touches authorized records.
    for (const record of authorized) {
      await base44.asServiceRole.entities[entityName].update(record.id, patch);
    }

    const now = new Date().toISOString();
    const changedFields = Object.keys(patch);
    const activityRows = authorized.map((record: any) => ({
      record_entity: entityName,
      record_id: record.id,
      record_name: record.name || '',
      module_key: config.moduleKey,
      event_type: 'bulk_updated',
      summary: `Updated ${changedFields.join(', ')}`,
      changed_fields: changedFields,
      actor_email: user.email,
      occurred_at: now,
      created_by_id: user.id,
    }));

    try {
      for (const row of activityRows) {
        await base44.asServiceRole.entities.CollectionActivity.create(row);
      }
    } catch (logError) {
      console.warn('[collectionItemBulkUpdate] activity log failed (non-fatal):', logError?.message);
    }

    return Response.json({
      ok: true,
      updated: authorized.length,
      skipped: denied.length + (ids.length - found.length),
      rejectedFields: rejected,
      appliedFields: changedFields,
      updatedIds: authorized.map((record: any) => record.id),
    });
  } catch (error) {
    console.error('[collectionItemBulkUpdate] error:', error);
    return Response.json({ error: error?.message || 'Bulk update failed' }, { status: 500 });
  }
});