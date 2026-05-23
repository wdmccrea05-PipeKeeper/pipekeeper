export function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function roundCurrency(value) {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}

export function percentChange(current, previous) {
  const curr = toNumber(current);
  const prev = toNumber(previous);
  if (curr == null || prev == null || prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

export function formatPercent(value, digits = 1) {
  const num = toNumber(value);
  if (num == null) return '—';
  return `${num.toFixed(digits)}%`;
}
