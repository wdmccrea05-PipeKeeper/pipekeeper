import { describe, expect, it } from 'vitest';
import { createImportBatchId, loadImportBatch, saveImportBatch } from '../importBatchStore';

function memoryStorage() {
  const values = new Map();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

describe('resumable import batches', () => {
  it('restores a batch for its owner and keeps it isolated from another account', () => {
    const storage = memoryStorage();
    const batchId = createImportBatchId();
    const batch = {
      userEmail: 'collector@example.com',
      batchId,
      importType: 'pipekeeper_pipes',
      fileName: 'pipes.csv',
      csvText: 'maker,shape\nPeterson,Billiard\n',
      duplicateMode: 'create_only',
      result: { imported: 1, skipped: 0, failed: 0 },
    };

    saveImportBatch(storage, batch);

    expect(loadImportBatch(storage, 'COLLECTOR@example.com', batchId)).toMatchObject(batch);
    expect(loadImportBatch(storage, 'another@example.com', batchId)).toBeNull();
  });

  it('rejects a corrupted batch instead of silently treating it as empty', () => {
    const storage = memoryStorage();
    const batchId = createImportBatchId();
    saveImportBatch(storage, {
      userEmail: 'collector@example.com',
      batchId,
      importType: 'pipekeeper_pipes',
      csvText: 'maker,shape\n',
    });
    const key = [...storage.values.keys()][0];
    storage.values.set(key, '{');

    expect(() => loadImportBatch(storage, 'collector@example.com', batchId)).toThrow(/damaged/);
  });
});
