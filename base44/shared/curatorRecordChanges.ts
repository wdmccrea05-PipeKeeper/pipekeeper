/**
 * base44/shared/curatorRecordChanges.ts
 *
 * Server-side rules for changes Curator may propose and apply to collection
 * records. Extends the shared documentation contract in collectionRecords.ts
 * with the fields Curator is allowed to touch (storage assignment,
 * classification/specialization, condition and free-text notes) so a proposed
 * change is validated against one allowlist rather than trusted as submitted.
 *
 * Nothing here decides authorization — callers use isAuthorizedForRecord from
 * collectionRecords.ts before writing.
 */

import {
  COLLECTION_ENTITIES,
  isBlank,
  sanitisePatch,
} from './collectionRecords.ts';

/**
 * Fields Curator may write beyond the shared documentation allowlist.
 * Deliberately excludes valuation figures, quantities and identity/ownership
 * fields: those are recorded through the valuation ledger or the record form,
 * never by an assistant.
 */
export const CURATOR_EXTRA_FIELDS: Record<string, string[]> = {
  Pipe: ['storage_location_id', 'focus', 'condition', 'notes', 'maker', 'year_made'],
  TobaccoBlend: ['storage_location_id', 'packaging_condition', 'condition', 'notes', 'blend_type'],
  Cigar: ['storage_location_id', 'humidor_id', 'condition', 'personal_notes', 'brand'],
  Bottle: ['storage_location_id', 'condition', 'notes', 'distillery'],
  Wine: ['storage_location_id', 'condition', 'notes', 'producer'],
};

const ARRAY_FIELDS = new Set(['tags', 'focus']);

export function curatorWritableFields(entityName: string): string[] {
  const config = COLLECTION_ENTITIES[entityName];
  if (!config) return [];
  return Array.from(new Set([...config.documentationFields, ...(CURATOR_EXTRA_FIELDS[entityName] || [])]));
}

export function isCuratorWritableField(entityName: string, field: string): boolean {
  return curatorWritableFields(entityName).includes(field);
}

function normaliseArray(value: unknown): string[] {
  const list = Array.isArray(value) ? value : [value];
  return Array.from(
    new Set(list.map((v) => String(v ?? '').trim()).filter(Boolean))
  );
}

/**
 * Reduce an arbitrary payload to the fields Curator may write.
 * Unsupported fields are reported, never silently applied.
 */
export function sanitiseCuratorPatch(
  entityName: string,
  payload: any
): { patch: Record<string, unknown>; rejected: string[] } {
  const config = COLLECTION_ENTITIES[entityName];
  if (!config) throw new Error(`Unsupported collection entity: ${entityName}`);
  if (!payload || typeof payload !== 'object') throw new Error('A patch object is required');

  const extras = new Set(CURATOR_EXTRA_FIELDS[entityName] || []);
  const base: Record<string, unknown> = {};
  const extra: Record<string, unknown> = {};
  const rejected: string[] = [];

  for (const [key, value] of Object.entries(payload)) {
    if (config.documentationFields.includes(key)) {
      // A single tag arrives as a string; the shared layer expects a list.
      base[key] = key === 'tags' ? normaliseArray(value) : value;
      continue;
    }
    if (extras.has(key)) {
      extra[key] = value;
      continue;
    }
    rejected.push(key);
  }

  let patch: Record<string, unknown> = {};
  if (Object.keys(base).length > 0) {
    try {
      const result = sanitisePatch(entityName, base);
      patch = result.patch;
      rejected.push(...result.rejected);
    } catch {
      rejected.push(...Object.keys(base));
    }
  }

  for (const [key, value] of Object.entries(extra)) {
    if (ARRAY_FIELDS.has(key)) {
      const list = normaliseArray(value);
      if (list.length === 0) {
        rejected.push(key);
        continue;
      }
      patch[key] = list;
      continue;
    }
    if (value !== null && typeof value !== 'string' && typeof value !== 'number') {
      rejected.push(key);
      continue;
    }
    if (typeof value === 'string' && value.length > 4000) {
      rejected.push(key);
      continue;
    }
    patch[key] = isBlank(value) ? null : value;
  }

  if (Object.keys(patch).length === 0) throw new Error('No supported fields to update');
  return { patch, rejected };
}

function comparable(value: unknown): string {
  if (Array.isArray(value)) return JSON.stringify([...value].map(String).sort());
  if (value === undefined || value === null || value === '') return '';
  return String(value);
}

export interface FieldChange {
  field: string;
  from: unknown;
  to: unknown;
}

/** Existing vs proposed values, for the confirmation preview and the audit log. */
export function diffRecord(record: any, patch: Record<string, unknown>): FieldChange[] {
  return Object.entries(patch).map(([field, to]) => ({
    field,
    from: record?.[field] ?? null,
    to,
  }));
}

export function hasRealChange(changes: FieldChange[]): boolean {
  return changes.some((change) => comparable(change.from) !== comparable(change.to));
}

/**
 * Plan an undo. A restore is only safe while the record still holds exactly
 * what Curator applied; anything edited since is reported as blocked so an undo
 * never silently overwrites a later decision.
 */
export function planUndo({
  beforeState,
  afterState,
  currentRecord,
}: {
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  currentRecord: any;
}): { restore: Record<string, unknown>; blocked: string[] } {
  const restore: Record<string, unknown> = {};
  const blocked: string[] = [];
  const before = beforeState || {};
  const after = afterState || {};

  for (const field of Object.keys(after)) {
    if (comparable(currentRecord?.[field]) !== comparable(after[field])) {
      blocked.push(field);
      continue;
    }
    restore[field] = before[field] ?? null;
  }

  return { restore, blocked };
}