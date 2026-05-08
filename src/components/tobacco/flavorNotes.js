export function cleanFlavorNote(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeFlavorProfile(value) {
  const values = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,\n;]+/)
      : [];

  const unique = new Map();

  values.forEach((entry) => {
    const cleaned = cleanFlavorNote(entry);
    if (!cleaned) return;
    const key = cleaned.toLowerCase();
    if (!unique.has(key)) {
      unique.set(key, cleaned);
    }
  });

  return [...unique.values()];
}

export function normalizeFlavorNotes(value) {
  return normalizeFlavorProfile(value);
}

export function hasFlavorNote(values = [], note) {
  const target = cleanFlavorNote(note)?.toLowerCase();
  if (!target) return false;
  return normalizeFlavorProfile(values).some((value) => value.toLowerCase() === target);
}

export function removeFlavorNote(values = [], note) {
  const target = cleanFlavorNote(note)?.toLowerCase();
  if (!target) return normalizeFlavorProfile(values);
  return normalizeFlavorProfile(values).filter((value) => value.toLowerCase() !== target);
}
