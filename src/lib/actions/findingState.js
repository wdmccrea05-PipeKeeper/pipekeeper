/**
 * What the collector decided about a finding.
 *
 * Findings are derived from the records on every load, so they never need to be
 * stored. What does need storing is the collector's decision — deferred,
 * dismissed or resolved — which keeps the review list short without touching a
 * single record.
 */

import { base44 } from '@/api/base44Client';
import { fetchAllEntities } from '@/lib/base44/fetchAllEntities';

export const FINDING_STATUSES = ['deferred', 'dismissed', 'resolved'];

export function indexFindingStates(rows = []) {
  const out = {};
  for (const row of rows) {
    if (!row?.finding_key) continue;
    out[row.finding_key] = {
      id: row.id,
      status: row.status,
      note: row.note || '',
      resolved_at: row.resolved_at || null,
    };
  }
  return out;
}

export async function loadFindingStates(email) {
  if (!email) return {};
  const rows = await fetchAllEntities(
    base44.entities.CollectionFindingState, { user_email: email }, '-created_date', 500, 200, undefined, { strict: true }
  );
  return indexFindingStates(rows.filter((row) => row.user_email === email));
}

export async function saveFindingState({ email, finding, status, note = '' }) {
  if (!email || !finding?.key) return null;

  const payload = {
    user_email: email,
    finding_key: finding.key,
    status,
    module_key: finding.moduleKey || null,
    finding_type: finding.type || null,
    record_entity: finding.entity || null,
    record_id: finding.recordId || null,
    note,
    resolved_at: status === 'resolved' ? new Date().toISOString() : null,
  };

  const rows = await base44.entities.CollectionFindingState.filter(
    { user_email: email, finding_key: finding.key },
    '-created_date',
    1
  );
  if (!Array.isArray(rows)) throw new Error('Finding state query returned an invalid page');
  const existing = rows.find((row) => row.user_email === email);
  if (existing) return base44.entities.CollectionFindingState.update(existing.id, payload);
  return base44.entities.CollectionFindingState.create(payload);
}