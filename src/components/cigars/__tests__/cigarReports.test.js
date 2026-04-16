import { describe, test, expect } from 'vitest';
import {
  getPortfolioSummary,
  getValuationSections,
  getCollectorAnalytics,
  getTrendFoundation,
  getCigarRemainingValue,
} from '@/components/cigars/cigarReports';

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

describe('cigarReports', () => {
  test('computes remaining value from quantity and unit value', () => {
    const cigar = { quantity: 3, estimated_value: 12 };
    expect(getCigarRemainingValue(cigar)).toBe(36);
  });

  test('builds portfolio summary counts safely', () => {
    const cigars = [
      { id: '1', name: 'A', quantity: 5, estimated_value: 10, is_favorite: true, restock_threshold: 6, created_date: daysAgo(200), ready_to_smoke_date: daysAgo(10) },
      { id: '2', name: 'B', quantity: 2, purchase_price: 8, ready_to_smoke_date: daysAgo(5) },
      { id: '3', name: 'C', quantity: 1 },
    ];
    const sessions = [{ cigar_id: '2', date: daysAgo(20), overall_enjoyment: 4 }];

    const summary = getPortfolioSummary(cigars, [{ id: 'h1' }], sessions, new Date());
    expect(summary.totalCigars).toBe(8);
    expect(summary.totalUniqueCigars).toBe(3);
    expect(summary.humidorCount).toBe(1);
    expect(summary.cigarsNeedingValuation).toBe(1);
    expect(summary.lowStockFavorites).toBe(1);
  });

  test('creates valuation sections including missing and stale valuation', () => {
    const cigars = [
      { id: '1', name: 'A', brand: 'Alpha', quantity: 5, estimated_value: 20, humidor_id: 'h1', updated_date: daysAgo(200) },
      { id: '2', name: 'B', brand: 'Beta', quantity: 2, purchase_price: 10, updated_date: daysAgo(10) },
      { id: '3', name: 'C', brand: 'Beta', quantity: 4 },
    ];
    const sections = getValuationSections(cigars, [{ id: 'h1', name: 'Main' }], new Date());

    expect(sections.highestValueCigars[0].cigar.id).toBe('1');
    expect(sections.highestValueBrands.some((b) => b.name === 'Alpha')).toBe(true);
    expect(sections.missingValuation.some((r) => r.cigar.id === '3')).toBe(true);
    expect(sections.staleValuation.some((r) => r.cigar.id === '1')).toBe(true);
  });

  test('builds smoking analytics and trend foundation', () => {
    const cigars = [
      { id: '1', name: 'A', brand: 'Alpha', quantity: 5, purchase_date: daysAgo(20), is_favorite: true },
      { id: '2', name: 'B', brand: 'Beta', quantity: 2, purchase_date: daysAgo(50) },
    ];
    const sessions = [
      { cigar_id: '1', date: daysAgo(5), overall_enjoyment: 5 },
      { cigar_id: '1', date: daysAgo(10), overall_enjoyment: 4 },
      { cigar_id: '2', date: daysAgo(8), overall_enjoyment: 3 },
    ];

    const analytics = getCollectorAnalytics(cigars, sessions, [], new Date());
    expect(analytics.smoking.mostSmoked[0].name).toContain('Alpha');

    const trend = getTrendFoundation(cigars, sessions, [{ snapshot_date: daysAgo(5), computed_current_value: 100 }], new Date());
    expect(trend.timeline).toHaveLength(12);
    expect(trend.hasActivity).toBe(true);
  });
});
