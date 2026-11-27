/**
 * base44/shared/actionHelpers.ts
 *
 * Small shared primitives used by every backend function that applies an
 * accepted action: value comparison, record labelling, field snapshots and the
 * record-level activity log. Extracted so the Curator change path and the
 * Universal Action Framework write identical audit rows.
 */

export const ITEM_TYPE: Record<string, string> = {
  Pipe: 'pipe',
  TobaccoBlend: 'tobacco',
  Bottle: 'bottle',
  Cigar: 'collection',
  Wine: 'collection',
};

/** Stable comparison for scalars and string arrays (tags, focus). */
export function comparable(value: unknown): string {
  if (Array.isArray(value)) return JSON.stringify([...value].map(String).sort());
  if (value === undefined || value === null || value === '') return '';
  return String(value);
}

export function recordLabel(record: any): string {
  return String(record?.name || record?.blend_name || record?.wine_name || record?.id || '');
}

export function pickFields(record: any, fields: string[]) {
  const out: Record<string, unknown> = {};
  for (const field of fields) out[field] = record?.[field] ?? null;
  return out;
}

/**
 * Append one record-level activity row. A logging failure must never fail the
 * action itself, so it is reported and swallowed.
 */
export async function logActivity(base44: any, payload: Record<string, unknown>) {
  try {
    await base44.asServiceRole.entities.CollectionActivity.create(payload);
  } catch (error) {
    console.warn('[actionHelpers] activity log failed (non-fatal):', error);
  }
}