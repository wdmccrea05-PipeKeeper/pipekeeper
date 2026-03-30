export function smartSearch(query, items = []) {
  if (!query) return [];

  const q = query.toLowerCase();

  return items
    .map(item => {
      const name = (item.name || "").toLowerCase();

      let score = 0;

      if (name === q) score += 100;
      if (name.startsWith(q)) score += 50;
      if (name.includes(q)) score += 25;

      return { ...item, _score: score };
    })
    .filter(x => x._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, 25);
}
