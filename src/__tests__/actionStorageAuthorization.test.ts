import { describe, expect, it, vi } from 'vitest';
import { validateStorageReferences } from '../../base44/shared/actionStorageAuthorization.ts';

const user = { id: 'a', email: 'a@example.com', role: 'user' };

function entities(rows: Record<string, unknown>[]) {
  const filter = vi.fn(async ({ id }: { id: string }) => rows.filter((row) => row.id === id));
  return { StorageLocation: { filter }, HumidorLocation: { filter } };
}

describe('storage authorization for accepted actions', () => {
  it('accepts owned destinations and clearing a location', async () => {
    const db = entities([{ id: 'owned', created_by: user.email }, { id: 'humidor', created_by_id: user.id }]);
    expect(await validateStorageReferences(db, user, { storage_location_id: 'owned', humidor_id: 'humidor' })).toBeNull();
    expect(await validateStorageReferences(db, user, { storage_location_id: null })).toBeNull();
  });

  it('refuses another account or a missing destination even when names overlap', async () => {
    const db = entities([
      { id: 'owned', name: 'Cabinet', created_by: user.email },
      { id: 'other', name: 'Cabinet', created_by: 'b@example.com' },
    ]);
    expect(await validateStorageReferences(db, user, { storage_location_id: 'other' })).toBe('storage_location_not_authorized');
    expect(await validateStorageReferences(db, user, { humidor_id: 'missing' })).toBe('storage_location_not_authorized');
    expect(await validateStorageReferences(db, user, { humidor_id: 12 })).toBe('invalid_storage_location');
  });

  it('does not silently authorize when the location service fails', async () => {
    const db = {
      StorageLocation: { filter: vi.fn().mockRejectedValue(new Error('offline')) },
      HumidorLocation: { filter: vi.fn() },
    };
    await expect(validateStorageReferences(db, user, { storage_location_id: 'owned' })).rejects.toThrow('offline');
  });
});
