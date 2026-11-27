/**
 * base44/shared/collectionRecords.ts
 *
 * Shared rules for collection records across PipeKeeper, CigarKeeper,
 * WhiskeyKeeper and WineKeeper: which fields the shared documentation layer
 * may write, who may write them, how duplicates are detected and how a merge is
 * planned.
 *
 * Used by collectionItemBulkUpdate, collectionItemDuplicates and
 * collectionItemMerge so all three agree on the same contract.
 */

export interface CollectionEntityConfig {
  moduleKey: string;
  label: string;
  makerFields: string[];
  identityFields: string[];
  documentationFields: string[];
  mergeArrays: string[];
}

export const COLLECTION_ENTITIES: Record<string, CollectionEntityConfig> = {
  Pipe: {
    moduleKey: 'pipekeeper',
    label: 'Pipe',
    makerFields: ['maker'],
    identityFields: ['maker', 'year_made', 'stamping', 'shape'],
    documentationFields: [
      'purchase_date',
      'purchase_price',
      'purchase_source',
      'original_owner',
      'production_date',
      'serial_number',
      'batch_number',
      'condition_notes',
      'provenance_notes',
      'tags',
      'lifecycle_status',
      'lifecycle_note',
    ],
    mergeArrays: ['tags', 'documents', 'photos', 'stamping_photos'],
  },
  Cigar: {
    moduleKey: 'cigarkeeper',
    label: 'Cigar',
    makerFields: ['brand'],
    identityFields: ['brand', 'line', 'box_date', 'vitola'],
    documentationFields: [
      'purchase_date',
      'purchase_price',
      'purchase_source',
      'original_owner',
      'production_date',
      'serial_number',
      'batch_number',
      'condition_notes',
      'provenance_notes',
      'tags',
      'lifecycle_status',
      'lifecycle_note',
    ],
    mergeArrays: ['tags', 'documents', 'photos'],
  },
  Bottle: {
    moduleKey: 'whiskeykeeper',
    label: 'Bottle',
    makerFields: ['distillery'],
    identityFields: ['distillery', 'age', 'bottle_size', 'type'],
    documentationFields: [
      'purchase_date',
      'purchase_price',
      'purchase_source',
      'original_owner',
      'production_date',
      'serial_number',
      'batch_number',
      'condition_notes',
      'provenance_notes',
      'tags',
      'lifecycle_status',
      'lifecycle_note',
    ],
    mergeArrays: ['tags', 'documents', 'photos'],
  },
  Wine: {
    moduleKey: 'winekeeper',
    label: 'Wine',
    makerFields: ['producer'],
    identityFields: ['producer', 'vintage', 'appellation', 'varietal'],
    documentationFields: [
      'purchase_date',
      'purchase_price',
      'purchase_source',
      'original_owner',
      'production_date',
      'serial_number',
      'batch_number',
      'condition_notes',
      'provenance_notes',
      'tags',
      'lifecycle_status',
      'lifecycle_note',
    ],
    mergeArrays: ['tags', 'documents', 'photos'],
  },
  // Tobacco blends follow the same documentation contract as the other four
  // modules, so a classification, a storage assignment or a duplicate review
  // reaches them through the same validated path.
  TobaccoBlend: {
    moduleKey: 'tobacco',
    label: 'Tobacco blend',
    makerFields: ['manufacturer'],
    identityFields: ['manufacturer', 'blend_type', 'cut', 'production_status'],
    documentationFields: [
      'purchase_date',
      'purchase_price',
      'purchase_source',
      'original_owner',
      'production_date',
      'serial_number',
      'batch_number',
      'condition_notes',
      'provenance_notes',
      'tags',
      'lifecycle_status',
      'lifecycle_note',
    ],
    mergeArrays: ['tags', 'documents', 'photos'],
  },
};

export const LIFECYCLE_STATES = [
  'active',
  'archived',
  'transferred',
  'gifted',
  'sold',
  'lost',
  'disposed',
];

export const MAX_BULK_RECORDS = 200;

export function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

export function normaliseEmail(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

/**
 * A collector may change their own records. An administrator may change any.
 * Ownership is checked against both the platform user id and the stored email,
 * because records created before the shared fields existed only carry one of
 * the two.
 */
export function isAuthorizedForRecord(record: any, user: any): boolean {
  if (!record || !user) return false;
  if (user.role === 'admin') return true;
  if (record.created_by_id && user.id && record.created_by_id === user.id) return true;
  const recordEmail = normaliseEmail(record.created_by);
  if (recordEmail && recordEmail === normaliseEmail(user.email)) return true;
  return false;
}

/**
 * Reduce an arbitrary payload to the fields this layer is allowed to write.
 * Anything not on the allowlist is dropped rather than trusted.
 */
export function sanitisePatch(
  entityName: string,
  payload: any
): { patch: Record<string, unknown>; rejected: string[] } {
  const config = COLLECTION_ENTITIES[entityName];
  if (!config) throw new Error(`Unsupported collection entity: ${entityName}`);
  if (!payload || typeof payload !== 'object') throw new Error('A patch object is required');

  const patch: Record<string, unknown> = {};
  const rejected: string[] = [];

  for (const [key, rawValue] of Object.entries(payload)) {
    if (!config.documentationFields.includes(key)) {
      rejected.push(key);
      continue;
    }
    if (key === 'tags') {
      patch[key] = Array.isArray(rawValue)
        ? Array.from(new Set(rawValue.map((v) => String(v || '').trim()).filter(Boolean)))
        : [];
      continue;
    }
    if (key === 'lifecycle_status') {
      if (!LIFECYCLE_STATES.includes(String(rawValue))) {
        rejected.push(key);
        continue;
      }
      patch[key] = rawValue;
      continue;
    }
    if (key === 'purchase_price') {
      if (isBlank(rawValue)) {
        patch[key] = null;
        continue;
      }
      const numeric = Number(rawValue);
      if (!Number.isFinite(numeric)) {
        rejected.push(key);
        continue;
      }
      patch[key] = numeric;
      continue;
    }
    patch[key] = isBlank(rawValue) ? null : rawValue;
  }

  if (Object.keys(patch).length === 0) throw new Error('No supported fields to update');
  return { patch, rejected };
}

function normaliseKey(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Identity signature used for duplicate detection: name plus the module's maker
 * field. Records with a serial number only collide when the serial also matches.
 */
export function duplicateSignature(record: any, entityName: string): string {
  const config = COLLECTION_ENTITIES[entityName];
  if (!config) return '';
  const maker = config.makerFields.map((key) => record?.[key]).find((v) => !isBlank(v));
  const parts = [normaliseKey(record?.name), normaliseKey(maker)];
  const serial = normaliseKey(record?.serial_number);
  if (serial) parts.push(`s:${serial}`);
  return parts.filter(Boolean).join('|');
}

/**
 * Group a collector's records into duplicate candidates.
 * Two records must share an identity signature, and a group needs at least two
 * active members to be worth reviewing.
 */
export function findDuplicateGroups(records: any[], entityName: string): any[] {
  const config = COLLECTION_ENTITIES[entityName];
  if (!config) throw new Error(`Unsupported collection entity: ${entityName}`);

  const buckets = new Map<string, any[]>();
  for (const record of Array.isArray(records) ? records : []) {
    if (!record || record.merged_into_id) continue;
    if (record.lifecycle_status && record.lifecycle_status !== 'active') continue;
    const signature = duplicateSignature(record, entityName);
    if (!signature || signature.startsWith('|')) continue;
    if (!buckets.has(signature)) buckets.set(signature, []);
    buckets.get(signature)!.push(record);
  }

  const groups: any[] = [];
  for (const [signature, members] of buckets) {
    if (members.length < 2) continue;
    const maker = config.makerFields.map((key) => members[0]?.[key]).find((v) => !isBlank(v)) || null;
    groups.push({
      signature,
      label: [members[0]?.name, maker].filter(Boolean).join(' — ') || 'Unnamed record',
      count: members.length,
      records: members.map((record) => ({
        id: record.id,
        name: record.name || '',
        maker: config.makerFields.map((key) => record[key]).find((v) => !isBlank(v)) || null,
        serial_number: record.serial_number || null,
        purchase_date: record.purchase_date || null,
        purchase_price: record.purchase_price ?? null,
        tags: Array.isArray(record.tags) ? record.tags : [],
        attachment_count: Array.isArray(record.documents) ? record.documents.length : 0,
        created_date: record.created_date || null,
        completeness: config.documentationFields.filter((key) => !isBlank(record[key])).length,
      })),
    });
  }

  return groups.sort((a, b) => b.count - a.count);
}

/**
 * Plan a merge without writing anything.
 *
 * The surviving record keeps every value it already has; a blank field is
 * filled from the first source that has one. Arrays are unioned, never replaced,
 * so no attachment or tag is lost.
 */
export function planMerge(target: any, sources: any[], entityName: string) {
  const config = COLLECTION_ENTITIES[entityName];
  if (!config) throw new Error(`Unsupported collection entity: ${entityName}`);

  const patch: Record<string, unknown> = {};
  const filledFields: string[] = [];
  const conflicts: { field: string; kept: unknown; discarded: unknown }[] = [];

  const writable = [...config.documentationFields, ...config.identityFields];

  for (const field of writable) {
    if (config.mergeArrays.includes(field)) continue;
    const targetValue = target?.[field];
    for (const source of sources) {
      const sourceValue = source?.[field];
      if (isBlank(sourceValue)) continue;
      if (isBlank(targetValue)) {
        patch[field] = sourceValue;
        filledFields.push(field);
        break;
      }
      if (String(sourceValue) !== String(targetValue)) {
        conflicts.push({ field, kept: targetValue, discarded: sourceValue });
      }
    }
  }

  for (const field of config.mergeArrays) {
    const merged: any[] = [];
    const seen = new Set<string>();
    for (const record of [target, ...sources]) {
      const list = Array.isArray(record?.[field]) ? record[field] : [];
      for (const entry of list) {
        const key =
          typeof entry === 'string'
            ? entry
            : String(entry?.file_uri || entry?.id || JSON.stringify(entry));
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(entry);
      }
    }
    if (merged.length > 0) patch[field] = merged;
  }

  return {
    patch,
    filledFields,
    conflicts,
    sourceIds: sources.map((record) => record.id),
  };
}

export function activitySummary(eventType: string, count: number, label: string): string {
  switch (eventType) {
    case 'bulk_updated':
      return `Documentation updated on ${count} ${label} record${count === 1 ? '' : 's'}`;
    case 'merged':
      return `Merged ${count} duplicate ${label} record${count === 1 ? '' : 's'}`;
    default:
      return `Updated ${label} record`;
  }
}