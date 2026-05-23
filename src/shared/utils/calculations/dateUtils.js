export function daysBetween(a, b) {
  if (!a || !b) return null;
  const left = new Date(a);
  const right = new Date(b);
  if (Number.isNaN(left.getTime()) || Number.isNaN(right.getTime())) return null;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((left.getTime() - right.getTime()) / msPerDay);
}

export function ageInYears(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return (Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
}

export function isWithinDays(value, days) {
  const diff = daysBetween(value, new Date());
  return diff != null && diff >= 0 && diff <= days;
}
