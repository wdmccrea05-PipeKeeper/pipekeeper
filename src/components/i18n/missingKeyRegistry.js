const _missingKeys = new Set();

export function addMissingKey(key) {
  if (key && typeof key === 'string') {
    _missingKeys.add(key);
  }
}

export function getMissingKeys() {
  return Array.from(_missingKeys);
}

export function clearMissingKeys() {
  _missingKeys.clear();
}

export function downloadMissingKeysReport() {
  const keys = getMissingKeys();
  const csv = keys.join('\n');
  const blob = new Blob([csv], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'missing-keys.txt';
  a.click();
  URL.revokeObjectURL(url);
}

export default { addMissingKey, getMissingKeys, clearMissingKeys, downloadMissingKeysReport };
