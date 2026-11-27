/**
 * What the collector decided about a finding.
 *
 * Findings are derived from the records on every load, so they never need to be
 * stored. What does need storing is the collector's decision — deferred,
 * dismissed or resolved — which keeps the review list short without touching a
 * single record.
 */

import { base44 } from '@/api/base44Client';

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
  const page = await base44.entities.CollectionFindingState.filter(
    { user_email: email },
    { limit: 500 }
  );
  return indexFindingStates(page?.items || []);
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

  const page = await base44.entities.CollectionFindingState.filter(
    { user_email: email, finding_key: finding.key },
    { limit: 1 }
  );
  const existing = page?.items?.[0];
  if (existing) return base44.entities.CollectionFindingState.update(existing.id, payload);
  return base44.entities.CollectionFindingState.create(payload);
}