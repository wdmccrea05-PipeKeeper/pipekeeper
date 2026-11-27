/**
 * src/lib/cigars/cigarCollectionBrief.js
 *
 * A descriptive brief of the cigar collection, written for Curator and for the
 * CigarKeeper dashboard.
 *
 * Every line states what the records show. There is no consumption encouragement,
 * no schedule, no restocking or purchasing guidance and no retailer reference —
 * the product boundary is enforced here, not left to the model.
 *
 * Pure functions only — no SDK access, no writes.
 */

import { buildStorageDistribution, buildAgingBuckets, getCigarSticks } from './humidorInventory.js';
import { summarizeDocumentation } from './cigarDocumentation.js';
import { summarizeRatings, RATING_CATEGORIES } from './cigarRatings.js';
import { summarizeEnvironment, buildEnvironmentAlerts, environmentStatusLabel } from './humidorEnvironment.js';

function topEntries(list, getKey, limit = 3) {
  const counts = new Map();
  list.forEach((item) => {
    const key = getKey(item);
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function describeList(entries) {
  return entries.map(([label, count]) => `${label} (${count})`).join(', ');
}

/**
 * @param {{
 *   cigars?: object[],
 *   humidors?: object[],
 *   readingsByHumidor?: Record<string, object[]>,
 *   ratings?: object[],
 *   now?: Date,
 * }} input
 * @returns {{ headline: string, sections: Array<{ title: string, lines: string[] }> }}
 */
export function buildCigarCollectionBrief(input = {}) {
  const cigars = Array.isArray(input.cigars) ? input.cigars : [];
  const humidors = Array.isArray(input.humidors) ? input.humidors : [];
  const readingsByHumidor = input.readingsByHumidor || {};
  const ratings = Array.isArray(input.ratings) ? input.ratings : [];
  const now = input.now instanceof Date ? input.now : new Date();

  if (!cigars.length) {
    return {
      headline: 'No cigars are documented yet, so there is nothing to describe.',
      sections: [],
    };
  }

  const storage = buildStorageDistribution(cigars, humidors);
  const documentation = summarizeDocumentation(cigars);
  const aging = buildAgingBuckets(cigars, now);
  const ratingSummary = summarizeRatings(ratings);
  const alerts = buildEnvironmentAlerts(humidors, readingsByHumidor);
  const totalSticks = cigars.reduce((sum, cigar) => sum + getCigarSticks(cigar), 0);

  const brandLine = describeList(topEntries(cigars, (c) => c?.brand));
  const vitolaLine = describeList(topEntries(cigars, (c) => c?.vitola));
  const wrapperLine = describeList(topEntries(cigars, (c) => c?.wrapper));

  const sections = [
    {
      title: 'Composition',
      lines: [
        `${cigars.length} cigar records, ${totalSticks} documented singles.`,
        brandLine ? `Most documented brands: ${brandLine}.` : 'No brands are recorded yet.',
        vitolaLine ? `Most documented vitolas: ${vitolaLine}.` : 'No vitolas are recorded yet.',
        wrapperLine ? `Wrapper documentation: ${wrapperLine}.` : 'No wrapper documentation yet.',
      ],
    },
    {
      title: 'Storage',
      lines: [
        humidors.length
          ? `${humidors.length} storage locations documented; ${storage.assignedRecords} records are assigned to one and ${storage.unassigned.records} are not.`
          : 'No humidors are documented, so every record is unassigned.',
        ...storage.byHumidor
          .filter((row) => row.records > 0)
          .slice(0, 4)
          .map((row) => {
            const capacity = row.capacity
              ? ` (${Math.round((row.utilization || 0) * 100)}% of documented capacity)`
              : '';
            return `${row.name}: ${row.records} records, ${row.sticks} singles${capacity}.`;
          }),
        `${storage.positionedRecords} records have a documented tray, shelf, drawer or section.`,
      ],
    },
    {
      title: 'Environment',
      lines: alerts.length
        ? alerts.map(
            (alert) =>
              `${alert.name}: latest reading is ${environmentStatusLabel(alert.status).toLowerCase()}, with ${alert.outOfRangeCount} of ${alert.readingCount} readings outside the collector's band.`
          )
        : humidors.length
          ? ['Every monitored humidor is currently inside the collector\'s own tolerance band.']
          : ['No environmental readings are recorded.'],
    },
    {
      title: 'Aging and condition',
      lines: [
        `${aging.buckets.reduce((sum, b) => sum + b.records, 0)} records have a documented aging date; ${aging.undocumented.records} do not.`,
        ...aging.buckets
          .filter((bucket) => bucket.records > 0)
          .map((bucket) => `${bucket.label}: ${bucket.records} records (${bucket.sticks} singles).`),
        `${cigars.filter((c) => c?.condition || c?.condition_notes).length} records carry a condition observation.`,
      ],
    },
    {
      title: 'Ratings',
      lines: ratingSummary.ratedCigars
        ? [
            `${ratingSummary.ratedCigars} cigars carry at least one structured rating (${ratingSummary.count} ratings recorded).`,
            ...RATING_CATEGORIES.filter((category) => ratingSummary.categories?.[category.key]?.average != null).map(
              (category) =>
                `${category.label}: average ${ratingSummary.categories[category.key].average}/5 across ${ratingSummary.categories[category.key].count} observations.`
            ),
          ]
        : ['No structured ratings are recorded yet.'],
    },
    {
      title: 'Documentation',
      lines: [
        `Documentation is ${documentation.averagePercent}% complete on average; ${documentation.complete} records are complete and ${documentation.incomplete} have gaps.`,
        documentation.missingByField.length
          ? `Most often missing: ${documentation.missingByField
              .slice(0, 3)
              .map((field) => `${field.label} (${field.count})`)
              .join(', ')}.`
          : 'No documentation gaps were found.',
      ],
    },
  ];

  return {
    headline: `${cigars.length} cigar records across ${humidors.length} storage locations.`,
    sections,
  };
}

/** Flat text form, for prompts and copied summaries. */
export function briefToText(brief) {
  if (!brief) return '';
  const lines = [brief.headline];
  (brief.sections || []).forEach((section) => {
    lines.push('', section.title, ...section.lines.map((line) => `- ${line}`));
  });
  return lines.join('\n');
}