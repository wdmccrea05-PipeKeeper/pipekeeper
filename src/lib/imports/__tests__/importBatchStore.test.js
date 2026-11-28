import { describe, expect, it } from 'vitest';
import { createImportBatchId, loadImportBatch, saveImportBatch } from '../importBatchStore';

function memoryStorage() {
  const values = new Map();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
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
      mappings: [{ source: 'Maker', target: 'maker' }],
      reconciliationDecisions: { 3: 'skip' },
      unresolvedRows: [4],
      duplicateMode: 'create_only',
      result: { imported: 1, skipped: 0, failed: 0 },
    };

    saveImportBatch(storage, batch);

    expect(loadImportBatch(storage, 'COLLECTOR@example.com', batchId)).toMatchObject(batch);
    expect(loadImportBatch(storage, 'another@example.com', batchId)).toBeNull();
  });

  it('migrates a legacy session batch into persistent storage', () => {
    const persistentStorage = memoryStorage();
    const sessionStorage = memoryStorage();
    const batchId = 'import-batch-123456';
    const key = `pipekeeper:import-batch:v1:${encodeURIComponent('collector@example.com')}:${encodeURIComponent(batchId)}`;
    sessionStorage.setItem(key, JSON.stringify({
      version: 1,
      userEmail: 'collector@example.com',
      batchId,
      importType: 'pipekeeper_pipes',
      fileName: 'pipes.csv',
      csvText: 'maker,shape\nPeterson,Billiard\n',
      analysis: { rows: [] },
      result: { imported: 1, skipped: 0, failed: 0 },
      duplicateMode: 'create_only',
    }));

    const restored = loadImportBatch(persistentStorage, 'collector@example.com', batchId, {
      fallbackStorage: sessionStorage,
    });

    expect(restored).toMatchObject({
      version: 2,
      mappings: {},
      reconciliationDecisions: {},
      unresolvedRows: [],
      result: { imported: 1 },
    });
    expect(persistentStorage.getItem(key)).toContain('"version":2');
    expect(sessionStorage.getItem(key)).toBeNull();
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
