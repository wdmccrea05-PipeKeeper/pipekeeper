import { describe, it, expect } from 'vitest';
import { parseDisplayDate } from './parseDisplayDate';

describe('session calendar date display', () => {
  it.each(['2026-11-08', '2026-03-08', '2026-11-01', '2026-12-31', '2024-02-29'])(
    'keeps %s on its selected calendar day', (value) => {
      const d = parseDisplayDate(value);
      const [year, month, day] = value.split('-').map(Number);
      expect([d.getFullYear(), d.getMonth() + 1, d.getDate()]).toEqual([year, month, day]);
      expect(d.toLocaleDateString('en-US')).toBe(`${month}/${day}/${year}`);
    }
  );
  it('preserves timestamp instants', () => {
    const value = '2026-11-09T00:32:44.813Z';
    expect(parseDisplayDate(value).toISOString()).toBe(value);
  });
  it.each(['2026-02-30', '2026-13-01', '', null, 'invalid'])('rejects invalid date %s', (value) => {
    expect(Number.isNaN(parseDisplayDate(value).getTime())).toBe(true);
  });
});
