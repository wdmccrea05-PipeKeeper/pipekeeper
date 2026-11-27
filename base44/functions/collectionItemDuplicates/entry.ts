// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import {
  COLLECTION_ENTITIES,
  findDuplicateGroups,
  isAuthorizedForRecord,
  listOwnedCollectionRecords,
} from '../../shared/collectionRecords.ts';

/**
 * Detect possible duplicate records in one collection module.
 *
 * Only the caller's own records are scanned. Nothing is changed: the response is
 * a list of candidate groups for the collector to review and merge explicitly.
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

    if (!COLLECTION_ENTITIES[entityName]) {
      return Response.json({ error: `Unsupported collection entity: ${entityName}` }, { status: 400 });
    }

    // Always the caller's own records: an administrator reviewing collection tools
    // must see their own collection, never every collector's at once. Ownership is
    // decided by the shared authorization helper, with its admin override removed.
    const records = await listOwnedCollectionRecords(base44.asServiceRole.entities[entityName], user);
    const owner = { ...user, role: 'user' };
    const mine = records.filter((record: any) => isAuthorizedForRecord(record, owner));

    const groups = findDuplicateGroups(mine, entityName);

    return Response.json({
      ok: true,
      entityName,
      scanned: mine.length,
      groupCount: groups.length,
      groups,
    });
  } catch (error) {
    console.error('[collectionItemDuplicates] error:', error);
    return Response.json({ error: error?.message || 'Duplicate scan failed' }, { status: 500 });
  }
});