import { base44 } from '@/api/base44Client';

/**
 * Append one storage movement to a cigar's record history.
 *
 * Called whenever a cigar's humidor assignment or position changes, so the
 * humidor view can show what moved and when. History rows are never edited.
 */
export async function logStorageChange({
  cigar,
  fromHumidor = null,
  toHumidor = null,
  position = '',
  actorEmail = '',
} = {}) {
  if (!cigar?.id) return null;

  const fromLabel = fromHumidor?.name || 'unassigned';
  const toLabel = toHumidor?.name || 'unassigned';
  const detailParts = [];
  if (fromHumidor?.id || toHumidor?.id) {
    detailParts.push(`${fromLabel} → ${toLabel}`);
  }
  if (position) detailParts.push(position);

  return base44.entities.CollectionActivity.create({
    record_entity: 'Cigar',
    record_id: cigar.id,
    record_name: cigar.name || 'Cigar',
    module_key: 'cigarkeeper',
    event_type: 'storage_change',
    summary: `Storage set to ${toLabel}`,
    detail: detailParts.join(' · ') || null,
    changed_fields: ['humidor_id'],
    humidor_id: toHumidor?.id || null,
    humidor_name: toHumidor?.name || null,
    actor_email: actorEmail || null,
    occurred_at: new Date().toISOString(),
  });
}