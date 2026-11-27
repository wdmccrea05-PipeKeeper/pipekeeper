/**
 * base44/shared/actionRegistry.ts
 *
 * The server-side authority for the Universal Action Framework.
 *
 * Every action the application can perform on a collector's data is declared
 * here: what it may touch, how much confirmation it needs, whether it can be
 * undone, and whether it carries financial or privacy weight. Nothing else may
 * be executed — an action type that is not in this registry is refused, so no
 * AI output and no client payload can invent a new kind of mutation.
 *
 * The field allowlists are intersected with curatorWritableFields(), so the
 * registry can only ever narrow what the shared documentation layer already
 * permits; it can never widen it.
 */

import { COLLECTION_ENTITIES, MAX_BULK_RECORDS } from './collectionRecords.ts';
import { curatorWritableFields } from './curatorRecordChanges.ts';

export const CONFIRMATION_LEVELS = ['immediate', 'review', 'explicit'] as const;
export type ConfirmationLevel = (typeof CONFIRMATION_LEVELS)[number];

export interface ActionDefinition {
  id: string;
  label: string;
  description: string;
  /** How much confirmation the interface must collect before executing. */
  confirmation: ConfirmationLevel;
  /** Whether the run can be reversed afterwards. */
  undo: boolean;
  destructive: boolean;
  financial: boolean;
  privacy: boolean;
  /** Execution handler inside actionExecute. */
  handler: 'patch' | 'merge' | 'valuation';
  /** '*' means every field the documentation layer may write. */
  fields: string[] | '*';
  /** Actions only offered from Curator require Curator (Pro) access. */
  curatorOnly: boolean;
}

/** Storage assignment is deliberately narrow: the two fields Curator may write. */
export const STORAGE_FIELDS = ['storage_location_id', 'humidor_id'];
export const LIFECYCLE_FIELDS = ['lifecycle_status', 'lifecycle_note'];

export const ACTION_DEFINITIONS: Record<string, ActionDefinition> = {
  record_update: {
    id: 'record_update',
    label: 'Update record details',
    description: 'Change documented values on collection records.',
    confirmation: 'review',
    undo: true,
    destructive: false,
    financial: false,
    privacy: false,
    handler: 'patch',
    fields: '*',
    curatorOnly: false,
  },
  storage_assign: {
    id: 'storage_assign',
    label: 'Assign storage location',
    description: 'Move records into a different storage location.',
    confirmation: 'review',
    undo: true,
    destructive: false,
    financial: false,
    privacy: false,
    handler: 'patch',
    fields: STORAGE_FIELDS,
    curatorOnly: false,
  },
  lifecycle_change: {
    id: 'lifecycle_change',
    label: 'Change lifecycle status',
    description: 'Archive, transfer, mark as sold, lost or disposed.',
    confirmation: 'explicit',
    undo: true,
    destructive: true,
    financial: false,
    privacy: false,
    handler: 'patch',
    fields: LIFECYCLE_FIELDS,
    curatorOnly: false,
  },
  record_merge: {
    id: 'record_merge',
    label: 'Merge duplicate records',
    description: 'Keep one record and archive the duplicates into it.',
    confirmation: 'explicit',
    undo: false,
    destructive: true,
    financial: false,
    privacy: false,
    handler: 'merge',
    fields: '*',
    curatorOnly: false,
  },
  valuation_record: {
    id: 'valuation_record',
    label: 'Record a valuation',
    description: 'Add a dated valuation entry to a record.',
    confirmation: 'explicit',
    undo: true,
    destructive: false,
    financial: true,
    privacy: false,
    handler: 'valuation',
    fields: '*',
    curatorOnly: false,
  },
};

export function getActionDefinition(id: unknown): ActionDefinition | null {
  const key = String(id || '');
  return ACTION_DEFINITIONS[key] || null;
}

export function isCollectionEntity(entityName: unknown): boolean {
  return Boolean(COLLECTION_ENTITIES[String(entityName || '')]);
}

/**
 * Fields this action may write on this entity: the action's own list narrowed by
 * the shared documentation allowlist.
 */
export function resolveActionFields(definition: ActionDefinition, entityName: string): string[] {
  const writable = curatorWritableFields(entityName);
  if (definition.fields === '*') return writable;
  return definition.fields.filter((field) => writable.includes(field));
}

export function requiresExplicitConfirmation(definition: ActionDefinition): boolean {
  return definition.confirmation === 'explicit';
}

export function actionLimitExceeded(targetCount: number): boolean {
  return targetCount > MAX_BULK_RECORDS;
}

export { MAX_BULK_RECORDS };