export function normalizeAlpha(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function compareAlpha(a, b) {
  return normalizeAlpha(a).localeCompare(normalizeAlpha(b), undefined, {
    sensitivity: "base",
    numeric: true,
  });
}

export function sortByLabel(items, getLabel = (item) => item) {
  return (items || [])
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const diff = compareAlpha(getLabel(left.item), getLabel(right.item));
      return diff !== 0 ? diff : left.index - right.index;
    })
    .map(({ item }) => item);
}

export function uniqueSortedStrings(values) {
  const seen = new Set();
  const unique = [];
  for (const value of values || []) {
    const normalized = normalizeAlpha(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(String(value).trim());
  }
  return sortByLabel(unique, (value) => value);
}
