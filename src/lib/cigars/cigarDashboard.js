/**
 * src/lib/cigars/cigarDashboard.js
 *
 * Metric registry behind the CigarKeeper dashboard.
 *
 * Every metric carries the drill-down it belongs to, so a collector can open the
 * exact records a number was built from. Nothing here is computed twice: counts
 * come from the shared cigar, humidor, environment, rating and documentation
 * modules.
 *
 * Pure functions only — no SDK access, no writes.
 */

import { buildStorageDistribution, buildAgingBuckets, getCigarSticks } from './humidorInventory.js';
import { summarizeDocumentation, getCigarDocumentation } from './cigarDocumentation.js';
import { summarizeRatings, RATING_CATEGORIES } from './cigarRatings.js';
import { summarizeEnvironment, buildEnvironmentAlerts } from './humidorEnvironment.js';
import { getCigarTotalValue, hasCigarValuation } from '../collection/cigarSelectors.js';

export const DASHBOARD_GROUPS = Object.freeze([
  { key: 'composition', label: 'Collection composition' },
  { key: 'storage', label: 'Storage distribution' },
  { key: 'documentation', label: 'Documentation completeness' },
  { key: 'aging', label: 'Aging and condition' },
  { key: 'environment', label: 'Environmental records' },
  { key: 'ratings', label: 'Historical ratings' },
  { key: 'value', label: 'Cost and value' },
]);

function countBy(list, getKey) {
  const map = new Map();
  list.forEach((item) => {
    const key = getKey(item);
    if (!key) return;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function sumBy(list, getValue) {
  return list.reduce((sum, item) => sum + (Number(getValue(item)) || 0), 0);
}

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** Query string for a drill-down into /Cigars. */
export function buildDrilldownQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return;
    search.set(key, String(value));
  });
  return search.toString();
}

/**
 * @param {{
 *   cigars?: object[],
 *   humidors?: object[],
 *   readingsByHumidor?: Record<string, object[]>,
 *   ratings?: object[],
 *   now?: Date,
 * }} input
 */
export function buildDashboardMetrics(input = {}) {
  const cigars = Array.isArray(input.cigars) ? input.cigars : [];
  const humidors = Array.isArray(input.humidors) ? input.humidors : [];
  const readingsByHumidor = input.readingsByHumidor || {};
  const ratings = Array.isArray(input.ratings) ? input.ratings : [];
  const now = input.now instanceof Date ? input.now : new Date();

  const storage = buildStorageDistribution(cigars, humidors);
  const documentation = summarizeDocumentation(cigars);
  const aging = buildAgingBuckets(cigars, now);
  const ratingSummary = summarizeRatings(ratings);
  const environmentAlerts = buildEnvironmentAlerts(humidors, readingsByHumidor);

  const totalSticks = cigars.reduce((sum, cigar) => sum + getCigarSticks(cigar), 0);
  const agingDocumented = aging.buckets.reduce((sum, bucket) => sum + bucket.records, 0);
  const conditionRecorded = cigars.filter((c) => Boolean(c?.condition || c?.condition_notes)).length;
  const monitoredHumidors = humidors.filter((h) => (readingsByHumidor?.[h?.id] || []).length > 0);
  const withoutRating = cigars.filter(
    (c) => !(Number(c?.rating) > 0) && !ratingSummary.perCigar?.[c?.id]
  ).length;
  const valuedRecords = cigars.filter(hasCigarValuation).length;
  const collectionValue = cigars.reduce((sum, cigar) => sum + getCigarTotalValue(cigar), 0);
  const acquisitionCost = sumBy(cigars, (c) => c?.purchase_price);
  const costRecorded = cigars.filter((c) => Number(c?.purchase_price) > 0).length;
  const completeDocumentation = cigars.filter((c) => getCigarDocumentation(c).missing.length === 0).length;

  const topBrands = countBy(cigars, (c) => c?.brand).slice(0, 5);
  const topVitolas = countBy(cigars, (c) => c?.vitola).slice(0, 5);
  const conditionValues = countBy(cigars, (c) => c?.condition).slice(0, 5);

  return [
    {
      id: 'composition_records',
      group: 'composition',
      label: 'Cigar records',
      value: cigars.length,
      format: 'count',
      caption: `${completeDocumentation} fully documented`,
      params: {},
      breakdown: topBrands.map(([brand, value]) => ({ label: brand, value, params: { q: brand } })),
    },
    {
      id: 'composition_sticks',
      group: 'composition',
      label: 'Sticks documented',
      value: totalSticks,
      format: 'count',
      caption: 'Singles across every record',
      params: {},
      breakdown: topVitolas.map(([vitola, value]) => ({ label: vitola, value, params: { q: vitola } })),
    },
    {
      id: 'storage_assigned',
      group: 'storage',
      label: 'Assigned to a humidor',
      value: storage.assignedRecords,
      format: 'count',
      caption: `${storage.unassigned.records} not assigned`,
      params: { tab: 'collection' },
      breakdown: [
        ...storage.byHumidor.map((row) => ({
          label: row.name,
          value: row.records,
          params: { humidor: row.humidorId },
        })),
        { label: 'Not assigned', value: storage.unassigned.records, params: { preset: 'unassigned' } },
      ].filter((row) => row.value > 0),
    },
    {
      id: 'storage_capacity',
      group: 'storage',
      label: 'Humidors documented',
      value: humidors.length,
      format: 'count',
      caption: `${storage.positionedRecords} records with a documented position`,
      params: { tab: 'humidors' },
      breakdown: storage.byHumidor
        .filter((row) => row.capacity)
        .map((row) => ({
          label: row.name,
          value: Math.round((row.utilization || 0) * 100),
          format: 'percent',
          params: { tab: 'humidors', humidor: row.humidorId },
        })),
    },
    {
      id: 'documentation',
      group: 'documentation',
      label: 'Documentation complete',
      value: documentation.averagePercent,
      format: 'percent',
      caption: `${documentation.incomplete} records with gaps`,
      params: { preset: 'docs_missing' },
      breakdown: documentation.missingByField.slice(0, 5).map((field) => ({
        label: field.label,
        value: field.count,
        params: { preset: 'docs_missing' },
      })),
    },
    {
      id: 'aging',
      group: 'aging',
      label: 'Aging documented',
      value: agingDocumented,
      format: 'count',
      caption: `${aging.undocumented.records} without an aging date`,
      params: {},
      breakdown: aging.buckets.map((bucket) => ({
        label: bucket.label,
        value: bucket.records,
        params: { preset: bucket.key },
      })),
    },
    {
      id: 'condition',
      group: 'aging',
      label: 'Condition recorded',
      value: conditionRecorded,
      format: 'count',
      caption: `${cigars.length - conditionRecorded} not recorded`,
      params: { preset: 'condition_unrecorded' },
      breakdown: conditionValues.map(([condition, value]) => ({
        label: condition,
        value,
        params: { condition },
      })),
    },
    {
      id: 'environment',
      group: 'environment',
      label: 'Humidors monitored',
      value: monitoredHumidors.length,
      format: 'count',
      caption: environmentAlerts.length
        ? `${environmentAlerts.length} outside your band`
        : 'All readings inside your band',
      params: { tab: 'humidors' },
      breakdown: environmentAlerts.map((alert) => ({
        label: alert.name,
        value: alert.outOfRangeCount,
        params: { tab: 'humidors', humidor: alert.humidorId },
      })),
    },
    {
      id: 'ratings',
      group: 'ratings',
      label: 'Rated cigars',
      value: ratingSummary.ratedCigars,
      format: 'count',
      caption: `${withoutRating} without a rating`,
      params: {},
      breakdown: RATING_CATEGORIES.map((category) => ({
        label: category.label,
        value: ratingSummary.categories?.[category.key]?.average ?? 0,
        format: 'rating',
        params: { preset: 'rated_none' },
      })),
    },
    {
      id: 'value',
      group: 'value',
      label: 'Estimated collection value',
      value: round(collectionValue),
      format: 'currency',
      caption: `${valuedRecords} records with a valuation`,
      params: {},
      breakdown: [{ label: 'Without a valuation', value: cigars.length - valuedRecords, params: { preset: 'value_missing' } }],
    },
    {
      id: 'cost',
      group: 'value',
      label: 'Recorded acquisition cost',
      value: round(acquisitionCost),
      format: 'currency',
      caption: `${costRecorded} records with a cost`,
      params: {},
      breakdown: [{ label: 'Without an acquisition cost', value: cigars.length - costRecorded, params: { preset: 'value_missing' } }],
    },
  ];
}

/** Metrics grouped for rendering, empty groups removed. */
export function groupDashboardMetrics(metrics = []) {
  return DASHBOARD_GROUPS.map((group) => ({
    ...group,
    metrics: metrics.filter((metric) => metric.group === group.key),
  })).filter((group) => group.metrics.length > 0);
}