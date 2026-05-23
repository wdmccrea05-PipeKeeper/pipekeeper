export function buildTopN(items = [], key, count = 7) {
  const totals = {};
  items.forEach((item) => {
    const value = item?.[key];
    if (!value) return;
    totals[value] = (totals[value] || 0) + 1;
  });

  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([name, value]) => ({ name, value }));
}
