const STORAGE_PREFIX = 'pipekeeper:import-batch:v1';

function normalizedOwner(userEmail) {
  const owner = String(userEmail || '').trim().toLowerCase();
  if (!owner) throw new Error('A signed-in owner is required to store an import batch.');
  return owner;
}

function storageKey(userEmail, batchId) {
  if (!batchId) throw new Error('An import batch ID is required.');
  return `${STORAGE_PREFIX}:${encodeURIComponent(normalizedOwner(userEmail))}:${encodeURIComponent(batchId)}`;
}

export function createImportBatchId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `batch-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function saveImportBatch(storage, batch) {
  if (!storage?.setItem) throw new Error('Persistent browser storage is unavailable; this import cannot be resumed.');
  const owner = normalizedOwner(batch?.userEmail);
  if (!batch?.batchId || !batch?.importType) throw new Error('The import batch is missing its ID or record type.');
  const snapshot = {
    version: 2,
    userEmail: owner,
    batchId: batch.batchId,
    importType: batch.importType,
    fileName: batch.fileName || '',
    csvText: batch.csvText || '',
    mappings: batch.mappings || {},
    reconciliationDecisions: batch.reconciliationDecisions || {},
    unresolvedRows: Array.isArray(batch.unresolvedRows) ? batch.unresolvedRows : [],
    analysis: batch.analysis || null,
    result: batch.result || null,
    duplicateMode: batch.duplicateMode || 'create_only',
    updatedAt: new Date().toISOString(),
  };
  storage.setItem(storageKey(owner, batch.batchId), JSON.stringify(snapshot));
  return snapshot;
}

function parseSnapshot(serialized, owner, batchId) {
  if (serialized == null) return null;
  let snapshot;
  try {
    snapshot = JSON.parse(serialized);
  } catch {
    throw new Error('This saved import batch is damaged and cannot be resumed.');
  }
  if (
    ![1, 2].includes(snapshot?.version)
    || snapshot.userEmail !== owner
    || snapshot.batchId !== batchId
    || typeof snapshot.importType !== 'string'
    || typeof snapshot.csvText !== 'string'
  ) {
    throw new Error('This saved import batch is incomplete or belongs to a different account.');
  }
  return {
    ...snapshot,
    version: 2,
    mappings: snapshot.mappings || {},
    reconciliationDecisions: snapshot.reconciliationDecisions || {},
    unresolvedRows: Array.isArray(snapshot.unresolvedRows) ? snapshot.unresolvedRows : [],
  };
}

export function loadImportBatch(storage, userEmail, batchId, { fallbackStorage } = {}) {
  if (!storage?.getItem) throw new Error('Persistent browser storage is unavailable; this import cannot be resumed.');
  const owner = normalizedOwner(userEmail);
  const key = storageKey(owner, batchId);
  const storedSnapshot = parseSnapshot(storage.getItem(key), owner, batchId);
  if (storedSnapshot) return storedSnapshot;

  const legacySnapshot = fallbackStorage?.getItem
    ? parseSnapshot(fallbackStorage.getItem(key), owner, batchId)
    : null;
  if (!legacySnapshot) return null;

  saveImportBatch(storage, legacySnapshot);
  if (fallbackStorage?.removeItem) {
    fallbackStorage.removeItem(key);
  }
  return legacySnapshot;
}
