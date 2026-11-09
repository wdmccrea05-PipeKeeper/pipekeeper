/**
 * Calendar dates have no time zone. Timestamps still represent instants.
 * Never pass a bare YYYY-MM-DD to Date's UTC string parser for display.
 */
export function parseDisplayDate(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(0);
    date.setFullYear(year, month - 1, day);
    date.setHours(12, 0, 0, 0);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return new Date(NaN);
    }
    return date;
  }
  if (value == null || value === '') return new Date(NaN);
  return new Date(value);
}
