export function downloadMissingKeysReport() {
    const keys = [];
    const csv = keys.join('\n');
    const blob = new Blob([csv], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'missing-keys.txt';
    a.click();
    URL.revokeObjectURL(url);
}

export function clearMissingKeys() { }

export function addMissingKey(key) { }

export function getMissingKeys() { return []; }

export default { addMissingKey, getMissingKeys, clearMissingKeys, downloadMissingKeysReport };