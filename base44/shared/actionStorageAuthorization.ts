import { isAuthorizedForRecord } from './collectionRecords.ts';

/**
 * An accepted patch must not attach a collection record to an inaccessible
 * location. This applies to record_update as well as storage_assign.
 */
export async function validateStorageReferences(
  entities: Record<string, { filter: (query: { id: string }) => Promise<unknown> }>,
  user: { id?: string; email?: string; role?: string },
  patch: Record<string, unknown>,
): Promise<string | null> {
  const references = [
    { field: 'storage_location_id', entity: 'StorageLocation' },
    { field: 'humidor_id', entity: 'HumidorLocation' },
  ];

  for (const { field, entity } of references) {
    const value = patch[field];
    if (value === undefined || value === null || value === '') continue;
    if (typeof value !== 'string') return 'invalid_storage_location';
    const rows = await entities[entity].filter({ id: value });
    if (!Array.isArray(rows)) throw new Error('Storage location query returned an invalid response');
    const location = rows.find((row) => row && typeof row === 'object' && row.id === value);
    if (!location || !isAuthorizedForRecord(location, user)) return 'storage_location_not_authorized';
  }
  return null;
}
