/**
 * reportCatalogIntelligence.js
 *
 * Reports 11-20: aging, storage, makers, ratings, acquisition, insurance,
 * annual review, cross-collection analysis, valuation history and the
 * Curator-generated report.
 *
 * Same contract as the core catalog. Everything is computed from the
 * collector's own records; nothing is invented and nothing recommends a
 * purchase or increased consumption.
 */

import {
  average,
  countBy,
  firstNumber,
  formatCurrency,
  listOf,
  median,
  MODULE_LABELS,
  monthKeyOf,
  monthsBetween,
  parseDate,
  percent,
  round,
  sumBy,
  toNumber,
  total,
} from "./reportModel";
import { usageByItem } from "./reportUsage";

const VALUE_DISCLOSURE =
  "Value figures are the collector's own recorded costs and estimates. They are not market prices, and an estimate is never shown as a verified valuation.";

function ageBuckets(items, monthsOf) {
  const buckets = [
    { name: "Under 1 year", min: 0, max: 12 },
    { name: "1-2 years", min: 12, max: 24 },
    { name: "2-5 years", min: 24, max: 60 },
    { name: "5-10 years", min: 60, max: 120 },
    { name: "10+ years", min: 120, max: Infinity },
  ];
  return buckets.map((bucket) => ({
    name: bucket.name,
    value: items.filter((item) => {
      const months = monthsOf(item);
      return months != null && months >= bucket.min && months < bucket.max;
    }).length,
  }));
}

function recordRow(item, extra = {}) {
  return {
    id: item.id,
    module: item.module,
    detailPath: item.detailPath,
    name: item.name,
    moduleLabel: item.moduleLabel,
    ...extra,
  };
}

const aging = {
  id: "aging",
  order: 11,
  group: "Preservation",
  title: "Aging and Preservation",
  description: "Cellaring duration, cigar rest, wine drinking windows and whether recorded storage conditions sit inside your own bands.",
  compute(ctx) {
    const items = ctx.items;
    if (items.length === 0) return { empty: "No records match the current filters." };

    const tobacco = items.filter((item) => item.module === "tobacco" && item.agingStart);
    const cigars = items.filter((item) => item.module === "cigar" && item.agingStart);
    const wines = items.filter((item) => item.module === "wine");
    const now = new Date();

    const wineStatus = wines.map((item) => {
      const end = parseDate(item.drinkWindowEnd);
      const start = parseDate(item.drinkWindowStart);
      if (end && now > end) return { item, status: "Past recorded window" };
      if (start && now < start) return { item, status: "Before recorded window" };
      if (start || end) return { item, status: "Inside recorded window" };
      return { item, status: "No window recorded" };
    });

    const readings = listOf(ctx.sources.humidorReadings);
    const humidors = listOf(ctx.sources.humidors);
    const bands = new Map(humidors.map((humidor) => [humidor.id, humidor]));
    const inBand = readings.filter((reading) => {
      const humidor = bands.get(reading?.humidor_id);
      if (!humidor) return null;
      const rh = toNumber(reading?.humidity_rh);
      const temp = toNumber(reading?.temperature_f);
      const rhOk = !humidor.min_humidity_rh || (rh >= toNumber(humidor.min_humidity_rh) && rh <= toNumber(humidor.max_humidity_rh));
      const tempOk = !humidor.min_temp_f || (temp >= toNumber(humidor.min_temp_f) && temp <= toNumber(humidor.max_temp_f));
      return rhOk && tempOk;
    });
    const readingsWithBand = readings.filter((reading) => bands.has(reading?.humidor_id));

    const wineCounts = countBy(wineStatus, (entry) => entry.status);

    return {
      kpis: [
        { label: "Cellared blends", value: tobacco.length, sub: tobacco.length ? `median ${round(median(tobacco.map((item) => item.ageMonths)) || 0, 0)} months` : "" },
        { label: "Cigars resting", value: cigars.length },
        { label: "Wines past recorded window", value: wineStatus.filter((entry) => entry.status === "Past recorded window").length },
        { label: "Readings inside your bands", value: readingsWithBand.length ? `${percent(inBand.length, readingsWithBand.length)}%` : "—", sub: `${readings.length} readings` },
      ],
      charts: [
        { id: "cellar-age", type: "bar", title: "Cellared tobacco by age", data: ageBuckets(tobacco, (item) => item.ageMonths) },
        { id: "cigar-age", type: "bar", title: "Cigars by rest period", data: ageBuckets(cigars, (item) => item.ageMonths) },
        {
          id: "wine-window",
          type: "pie",
          title: "Wine drinking windows",
          data: wineCounts.map((row) => ({ name: row.name, value: row.value })),
          drillIds: Object.fromEntries(wineCounts.map((row) => [row.name, wineStatus.filter((entry) => entry.status === row.name).map((entry) => entry.item.id)])),
        },
      ],
      tables: [
        {
          id: "cellared",
          title: "Longest cellared blends",
          columns: [
            { key: "name", label: "Blend" },
            { key: "maker", label: "Manufacturer" },
            { key: "agingStart", label: "Cellared since", format: "date" },
            { key: "months", label: "Months", align: "right", format: "number" },
            { key: "potential", label: "Recorded aging potential" },
          ],
          rows: [...tobacco]
            .sort((a, b) => (b.ageMonths || 0) - (a.ageMonths || 0))
            .slice(0, 25)
            .map((item) => recordRow(item, { maker: item.maker || "—", agingStart: item.agingStart, months: item.ageMonths, potential: item.agingPotential || "—" })),
        },
        {
          id: "wine-window",
          title: "Wines and their recorded windows",
          columns: [
            { key: "name", label: "Wine" },
            { key: "vintage", label: "Vintage", align: "right", format: "number" },
            { key: "window", label: "Recorded window" },
            { key: "status", label: "Status" },
          ],
          rows: wineStatus.slice(0, 30).map(({ item, status }) => recordRow(item, {
            vintage: item.vintage || "",
            window: item.drinkWindowStart || item.drinkWindowEnd ? `${item.drinkWindowStart || "?"} to ${item.drinkWindowEnd || "?"}` : "—",
            status,
          })),
        },
      ],
      insights: [
        {
          title: "Cellar depth",
          text: tobacco.length > 0
            ? `${tobacco.length} blends have a recorded cellaring date, with a median of ${round(median(tobacco.map((item) => item.ageMonths)) || 0, 0)} months in the cellar.`
            : "No blend has a recorded cellaring date, so aging cannot be measured.",
        },
        {
          title: "Environmental record",
          text: readingsWithBand.length > 0
            ? `${percent(inBand.length, readingsWithBand.length)}% of readings sit inside the tolerance bands you set for that location.`
            : "No readings are matched to a location with tolerance bands.",
        },
      ],
      disclosures: ["Aging durations are calculated from the dates you recorded. Drinking windows are your own notes, not professional advice."],
    };
  },
};

const storage = {
  id: "storage",
  order: 12,
  group: "Preservation",
  title: "Storage Distribution",
  description: "What sits in each recorded location, how full it is, and what has no location at all.",
  compute(ctx) {
    const items = ctx.items;
    if (items.length === 0) return { empty: "No records match the current filters." };

    const locations = [...listOf(ctx.sources.locations), ...listOf(ctx.sources.humidors)];
    const capacityById = new Map(locations.map((location) => [location.id, toNumber(location.capacity_count)]));

    const buckets = new Map();
    items.forEach((item) => {
      const key = item.storageId || "unassigned";
      const bucket = buckets.get(key) || {
        id: key,
        name: item.storageName || "No location recorded",
        records: 0,
        units: 0,
        modules: new Set(),
        capacity: capacityById.get(key) || 0,
      };
      bucket.records += 1;
      bucket.units += toNumber(item.quantity);
      bucket.modules.add(item.moduleLabel);
      buckets.set(key, bucket);
    });

    const rows = [...buckets.values()]
      .map((bucket) => ({
        ...bucket,
        units: round(bucket.units, 2),
        modules: [...bucket.modules].join(", "),
        utilization: bucket.capacity > 0 ? percent(bucket.records, bucket.capacity) : null,
      }))
      .sort((a, b) => b.records - a.records);

    const unassigned = rows.find((row) => row.id === "unassigned");

    return {
      kpis: [
        { label: "Locations in use", value: rows.filter((row) => row.id !== "unassigned").length },
        { label: "Assigned records", value: items.length - (unassigned?.records || 0) },
        { label: "No location recorded", value: unassigned?.records || 0 },
        { label: "Units stored", value: round(total(items, (item) => item.quantity), 1) },
      ],
      charts: [
        {
          id: "records",
          type: "bar",
          title: "Records per location",
          data: rows.map((row) => ({ name: row.name, value: row.records })),
          drillIds: Object.fromEntries(rows.map((row) => [row.name, items.filter((item) => (item.storageId || "unassigned") === row.id).map((item) => item.id)])),
        },
        {
          id: "units",
          type: "bar",
          title: "Units per location",
          data: rows.map((row) => ({ name: row.name, value: row.units })),
        },
      ],
      tables: [
        {
          id: "locations",
          title: "Storage locations",
          columns: [
            { key: "name", label: "Location" },
            { key: "modules", label: "Modules" },
            { key: "records", label: "Records", align: "right", format: "number" },
            { key: "units", label: "Units", align: "right", format: "number" },
            { key: "capacity", label: "Capacity", align: "right", format: "number" },
            { key: "utilization", label: "Used", align: "right", format: "percent" },
          ],
          rows: rows.map((row) => ({ ...row, capacity: row.capacity || "—", utilization: row.utilization ?? "—" })),
          note: "Capacity is the figure you recorded on the location. Records are counted, not physical space.",
        },
      ],
      insights: [
        {
          title: "Distribution",
          text: rows.length > 0 ? `${rows[0].name} holds the most records (${rows[0].records}).` : "No storage locations are recorded.",
        },
        unassigned
          ? { title: "Unassigned records", text: `${unassigned.records} records have no storage location, so they cannot be counted in any location report.` }
          : { title: "Unassigned records", text: "Every record in this filter has a storage location." },
      ],
      disclosures: [],
    };
  },
};

const makers = {
  id: "makers",
  order: 13,
  group: "Composition",
  title: "Maker, Producer and Distillery Analysis",
  description: "How makers, producers and distilleries are represented, how their records rate, and where the collection concentrates.",
  compute(ctx) {
    const items = ctx.items;
    if (items.length === 0) return { empty: "No records match the current filters." };

    const grouped = new Map();
    items.forEach((item) => {
      const key = item.maker || "Not recorded";
      const entry = grouped.get(key) || { name: key, records: 0, modules: new Set(), ratings: [], value: 0, oldest: null, ids: [] };
      entry.records += 1;
      entry.modules.add(item.moduleLabel);
      if (item.rating != null) entry.ratings.push(item.rating);
      entry.value += toNumber(item.value);
      const acquired = parseDate(item.acquiredAt || item.createdAt);
      if (acquired && (!entry.oldest || acquired < entry.oldest)) entry.oldest = acquired;
      entry.ids.push(item.id);
      grouped.set(key, entry);
    });

    const rows = [...grouped.values()]
      .map((entry) => ({
        name: entry.name,
        records: entry.records,
        modules: [...entry.modules].join(", "),
        avgRating: entry.ratings.length ? round(average(entry.ratings), 2) : null,
        value: round(entry.value, 2),
        oldest: entry.oldest ? entry.oldest.toISOString().slice(0, 10) : null,
        share: percent(entry.records, items.length),
        ids: entry.ids,
      }))
      .sort((a, b) => b.records - a.records);

    const topFive = rows.slice(0, 5).reduce((sum, row) => sum + row.records, 0);

    return {
      kpis: [
        { label: "Distinct makers", value: rows.length },
        { label: "Most recorded", value: rows[0]?.name || "—", sub: rows[0] ? `${rows[0].records} records` : "" },
        { label: "Top 5 concentration", value: `${percent(topFive, items.length)}%` },
        { label: "Makers with one record", value: rows.filter((row) => row.records === 1).length },
      ],
      charts: [
        {
          id: "makers",
          type: "bar",
          title: "Records per maker (top 12)",
          data: rows.slice(0, 12).map((row) => ({ name: row.name, value: row.records })),
          drillIds: Object.fromEntries(rows.slice(0, 12).map((row) => [row.name, row.ids])),
        },
        {
          id: "ratings",
          type: "bar",
          title: "Average rating by maker (top 10 rated)",
          data: [...rows].filter((row) => row.avgRating != null).sort((a, b) => b.avgRating - a.avgRating).slice(0, 10)
            .map((row) => ({ name: row.name, value: row.avgRating })),
        },
      ],
      tables: [
        {
          id: "makers",
          title: "Makers",
          columns: [
            { key: "name", label: "Maker / producer / distillery" },
            { key: "modules", label: "Modules" },
            { key: "records", label: "Records", align: "right", format: "number" },
            { key: "share", label: "Share", align: "right", format: "percent" },
            { key: "avgRating", label: "Average rating", align: "right", format: "rating" },
            { key: "value", label: "Recorded / estimated value", align: "right", format: "currency" },
            { key: "oldest", label: "Earliest record", format: "date" },
          ],
          rows,
        },
      ],
      insights: [
        {
          title: "Concentration",
          text: `The five most recorded makers account for ${percent(topFive, items.length)}% of records in this filter.`,
        },
        rows.some((row) => row.avgRating != null)
          ? {
              title: "Highest rated maker",
              text: `${[...rows].filter((row) => row.avgRating != null).sort((a, b) => b.avgRating - a.avgRating)[0].name} has the highest average of your own ratings.`,
            }
          : { title: "Ratings", text: "No maker has rated records yet." },
      ],
      disclosures: [VALUE_DISCLOSURE],
    };
  },
};

const ratings = {
  id: "ratings",
  order: 14,
  group: "History",
  title: "Historical Personal Ratings",
  description: "Your own ratings over time: distribution, averages by module and category, and what remains unrated.",
  compute(ctx) {
    const items = ctx.items;
    const rated = items.filter((item) => item.rating != null);
    if (items.length === 0) return { empty: "No records match the current filters." };
    if (rated.length === 0) return { empty: "No record in this filter has a personal rating yet." };

    const distribution = [1, 2, 3, 4, 5].map((score) => ({
      name: `${score} ★`,
      value: rated.filter((item) => Math.round(item.rating) === score).length,
    }));

    const byModule = Object.entries(MODULE_LABELS)
      .map(([module, label]) => {
        const rows = rated.filter((item) => item.module === module);
        return rows.length ? { name: label, value: round(average(rows.map((item) => item.rating)), 2), records: rows.length } : null;
      })
      .filter(Boolean);

    const byCategory = sumBy(rated, (item) => `${item.moduleLabel} · ${item.category || "Unclassified"}`, (item) => item.rating);
    const categoryCounts = countBy(rated, (item) => `${item.moduleLabel} · ${item.category || "Unclassified"}`);
    const categoryAverages = byCategory.map((row) => ({
      name: row.name,
      value: round(row.value / (categoryCounts.find((entry) => entry.name === row.name)?.value || 1), 2),
    })).sort((a, b) => b.value - a.value);

    const cigarRatings = listOf(ctx.sources.cigarRatings);
    const cigarCategories = ["construction", "draw", "burn", "aroma", "flavor", "overall"]
      .map((field) => {
        const values = cigarRatings.map((entry) => Number(entry?.[field])).filter((value) => Number.isFinite(value) && value > 0);
        return values.length ? { name: field.charAt(0).toUpperCase() + field.slice(1), value: round(average(values), 2), records: values.length } : null;
      })
      .filter(Boolean);

    return {
      kpis: [
        { label: "Rated records", value: rated.length, sub: `${percent(rated.length, items.length)}% of the filter` },
        { label: "Average rating", value: round(average(rated.map((item) => item.rating)), 2) },
        { label: "Median rating", value: round(median(rated.map((item) => item.rating)), 2) },
        { label: "Unrated records", value: items.length - rated.length },
      ],
      charts: [
        { id: "distribution", type: "bar", title: "Rating distribution", data: distribution },
        { id: "by-module", type: "bar", title: "Average rating by module", data: byModule },
      ],
      tables: [
        {
          id: "top",
          title: "Highest rated records",
          columns: [
            { key: "name", label: "Record" },
            { key: "moduleLabel", label: "Module" },
            { key: "category", label: "Category" },
            { key: "rating", label: "Rating", align: "right", format: "rating" },
            { key: "completeness", label: "Documented", align: "right", format: "percent" },
          ],
          rows: [...rated].sort((a, b) => b.rating - a.rating).slice(0, 25)
            .map((item) => recordRow(item, { category: item.category, rating: item.rating, completeness: item.completeness })),
        },
        {
          id: "categories",
          title: "Average rating by category",
          columns: [
            { key: "name", label: "Category" },
            { key: "value", label: "Average", align: "right", format: "rating" },
          ],
          rows: categoryAverages.slice(0, 25),
        },
        ...(cigarCategories.length
          ? [{
              id: "cigar-categories",
              title: "Structured cigar rating categories",
              columns: [
                { key: "name", label: "Category" },
                { key: "value", label: "Average", align: "right", format: "rating" },
                { key: "records", label: "Ratings", align: "right", format: "number" },
              ],
              rows: cigarCategories,
            }]
          : []),
      ],
      insights: [
        {
          title: "What rates best",
          text: categoryAverages.length > 0 ? `${categoryAverages[0].name} has your highest average rating at ${categoryAverages[0].value}.` : "No category has rated records.",
        },
      ],
      disclosures: ["Ratings are your own recorded impressions. They are not a quality assessment of the product."],
    };
  },
};

const acquisition = {
  id: "acquisition",
  order: 15,
  group: "History",
  title: "Acquisition and Provenance History",
  description: "When records entered the collection, where they came from, and how much provenance is documented.",
  compute(ctx) {
    const items = ctx.items;
    if (items.length === 0) return { empty: "No records match the current filters." };

    const dated = items.filter((item) => item.acquiredAt || item.createdAt);
    const byYear = countBy(dated, (item) => String((parseDate(item.acquiredAt) || parseDate(item.createdAt))?.getFullYear() || "Unknown"));
    const byMonth = countBy(dated, (item) => monthKeyOf(item.acquiredAt || item.createdAt) || "Unknown");
    const sources = countBy(items, (item) => item.source || "Not recorded");
    const withProvenance = items.filter((item) => item.provenance);
    const withCost = items.filter((item) => item.cost > 0);
    const activity = listOf(ctx.sources.collectionActivity);

    return {
      kpis: [
        { label: "Acquisition dates recorded", value: `${percent(items.filter((item) => item.acquiredAt).length, items.length)}%` },
        { label: "Provenance documented", value: `${percent(withProvenance.length, items.length)}%` },
        { label: "Recorded cost", value: formatCurrency(total(withCost, (item) => item.cost), ctx.currency), sub: `${withCost.length} records` },
        { label: "Recorded activity events", value: activity.length },
      ],
      charts: [
        {
          id: "by-year",
          type: "bar",
          title: "Records by acquisition year",
          data: byYear.sort((a, b) => String(a.name).localeCompare(String(b.name))),
          drillIds: Object.fromEntries(byYear.map((row) => [row.name, row.ids])),
        },
        { id: "by-month", type: "line", title: "Records by month", data: byMonth.sort((a, b) => String(a.name).localeCompare(String(b.name))) },
      ],
      tables: [
        {
          id: "sources",
          title: "Recorded acquisition sources",
          columns: [
            { key: "name", label: "Source" },
            { key: "value", label: "Records", align: "right", format: "number" },
          ],
          rows: sources,
          note: "Sources are historical notes you recorded. They are not live retailer links.",
        },
        {
          id: "recent",
          title: "Most recent acquisitions",
          columns: [
            { key: "name", label: "Record" },
            { key: "moduleLabel", label: "Module" },
            { key: "acquiredAt", label: "Acquired", format: "date" },
            { key: "source", label: "Source" },
            { key: "cost", label: "Recorded cost", align: "right", format: "currency" },
            { key: "provenance", label: "Provenance" },
          ],
          rows: [...dated]
            .sort((a, b) => String(b.acquiredAt || b.createdAt).localeCompare(String(a.acquiredAt || a.createdAt)))
            .slice(0, 25)
            .map((item) => recordRow(item, {
              acquiredAt: item.acquiredAt || item.createdAt,
              source: item.source || "—",
              cost: item.cost || 0,
              provenance: item.provenance ? "Documented" : "Not recorded",
            })),
        },
      ],
      insights: [
        {
          title: "Provenance",
          text: `${withProvenance.length} of ${items.length} records have provenance notes or an original owner recorded.`,
        },
      ],
      disclosures: ["Recorded costs are historical figures you entered. They are not market prices."],
    };
  },
};

const insurance = {
  id: "insurance",
  order: 16,
  group: "Value",
  title: "Insurance and Estate Documentation",
  description: "Recorded cost, documented appraisals and owner estimates side by side, with the evidence behind each figure.",
  compute(ctx) {
    const items = ctx.items;
    if (items.length === 0) return { empty: "No records match the current filters." };

    const valuations = listOf(ctx.sources.valuations);
    const byRecord = new Map();
    valuations.forEach((entry) => {
      const key = `${entry?.record_entity}:${entry?.record_id}`;
      const list = byRecord.get(key) || [];
      list.push(entry);
      byRecord.set(key, list);
    });

    const entityModule = { Pipe: "pipe", TobaccoBlend: "tobacco", Bottle: "whiskey", Cigar: "cigar", Wine: "wine" };
    const rows = items.map((item) => {
      const entries = byRecord.get(`${Object.keys(entityModule).find((key) => entityModule[key] === item.module)}:${item.id}`) || [];
      const appraisals = entries.filter((entry) => entry.kind === "appraisal");
      const estimates = entries.filter((entry) => entry.kind === "user_estimate" || entry.kind === "replacement_value");
      const latestAppraisal = appraisals.sort((a, b) => String(b.valuation_date).localeCompare(String(a.valuation_date)))[0];
      const latestEstimate = estimates.sort((a, b) => String(b.valuation_date).localeCompare(String(a.valuation_date)))[0];
      return {
        ...recordRow(item),
        cost: item.cost,
        estimate: firstNumber(latestEstimate?.amount_base, latestEstimate?.amount, item.value),
        appraisal: firstNumber(latestAppraisal?.amount_base, latestAppraisal?.amount),
        evidence: latestAppraisal ? "Documented appraisal" : latestEstimate ? "Owner estimate" : item.value > 0 ? "Recorded value field" : "No figure",
        confidence: latestAppraisal?.confidence || latestEstimate?.confidence || "unknown",
        documents: item.documents.length,
      };
    });

    const withAny = rows.filter((row) => row.cost > 0 || row.estimate > 0 || row.appraisal > 0);
    const appraised = rows.filter((row) => row.appraisal > 0);

    return {
      kpis: [
        { label: "Records with a figure", value: withAny.length, sub: `${percent(withAny.length, items.length)}% of the filter` },
        { label: "Total recorded cost", value: formatCurrency(total(rows, (row) => row.cost), ctx.currency) },
        { label: "Total owner estimate", value: formatCurrency(total(rows, (row) => row.estimate), ctx.currency) },
        { label: "Documented appraisals", value: appraised.length, sub: formatCurrency(total(rows, (row) => row.appraisal), ctx.currency) },
        { label: "No figure at all", value: items.length - withAny.length },
      ],
      charts: [
        {
          id: "evidence",
          type: "pie",
          title: "Evidence behind each figure",
          data: countBy(rows, (row) => row.evidence).map((row) => ({ name: row.name, value: row.value })),
        },
        {
          id: "by-module",
          type: "bar",
          title: "Recorded cost by module",
          data: Object.entries(MODULE_LABELS).map(([module, label]) => ({
            name: label,
            value: round(total(items.filter((item) => item.module === module), (item) => item.cost), 2),
          })).filter((row) => row.value > 0),
        },
      ],
      tables: [
        {
          id: "schedule",
          title: "Documentation schedule",
          columns: [
            { key: "name", label: "Record" },
            { key: "moduleLabel", label: "Module" },
            { key: "cost", label: "Recorded cost", align: "right", format: "currency" },
            { key: "estimate", label: "Owner estimate", align: "right", format: "currency" },
            { key: "appraisal", label: "Appraisal", align: "right", format: "currency" },
            { key: "evidence", label: "Evidence" },
            { key: "confidence", label: "Confidence" },
            { key: "documents", label: "Documents", align: "right", format: "number" },
          ],
          rows,
          note: "An appraisal column is only filled where a documented appraisal exists. Estimates are never presented as appraisals.",
        },
      ],
      insights: [
        {
          title: "Evidence coverage",
          text: `${appraised.length} records carry a documented appraisal; ${rows.filter((row) => row.evidence === "Owner estimate").length} carry only an owner estimate.`,
        },
      ],
      disclosures: [
        VALUE_DISCLOSURE,
        "This schedule supports your own insurance or estate records. It is not an appraisal and not a statement of market value.",
      ],
    };
  },
};

const annual = {
  id: "annual",
  order: 17,
  group: "Overview",
  title: "Annual Collection Review",
  description: "One year at a glance: what entered the collection, what was logged, what changed in recorded value and what remains undocumented.",
  compute(ctx) {
    const year = Number(ctx.filters?.year) || new Date().getFullYear();
    const items = ctx.items;
    const inYear = (value) => {
      const date = parseDate(value);
      return date ? date.getFullYear() === year : false;
    };

    const added = items.filter((item) => inYear(item.acquiredAt || item.createdAt));
    if (items.length === 0) return { empty: "No records match the current filters." };

    const sessions = ctx.usage.filter((entry) => inYear(entry.date));
    const valuations = listOf(ctx.sources.valuations).filter((entry) => inYear(entry.valuation_date));
    const valueDelta = valuations.reduce((sum, entry) => sum + toNumber(firstNumber(entry?.amount_base, entry?.amount)), 0);
    const retired = items.filter((item) => inYear(item.retiredAt));
    const ratedInYear = ctx.usage.filter((entry) => inYear(entry.date) && entry.rating != null);
    const undocumented = items.filter((item) => item.completeness < 50);

    const byModule = Object.entries(MODULE_LABELS).map(([module, label]) => ({
      moduleLabel: label,
      added: added.filter((item) => item.module === module).length,
      sessions: sessions.filter((entry) => entry.module === module).length,
      records: items.filter((item) => item.module === module).length,
    })).filter((row) => row.records > 0);

    return {
      kpis: [
        { label: `Added in ${year}`, value: added.length },
        { label: "Sessions logged", value: sessions.length },
        { label: "Ratings recorded", value: ratedInYear.length },
        { label: "Valuation entries", value: valuations.length, sub: valueDelta ? formatCurrency(valueDelta, ctx.currency) : "" },
        { label: "Retired records", value: retired.length },
      ],
      charts: [
        { id: "by-module", type: "bar", title: `Records by module`, data: byModule.map((row) => ({ name: row.moduleLabel, value: row.records })) },
        {
          id: "added",
          type: "bar",
          title: `Added in ${year}`,
          data: byModule.map((row) => ({ name: row.moduleLabel, value: row.added })),
        },
      ],
      tables: [
        {
          id: "by-module",
          title: `${year} by module`,
          columns: [
            { key: "moduleLabel", label: "Module" },
            { key: "records", label: "Records held", align: "right", format: "number" },
            { key: "added", label: "Added", align: "right", format: "number" },
            { key: "sessions", label: "Sessions", align: "right", format: "number" },
          ],
          rows: byModule,
        },
        {
          id: "gaps",
          title: "Undocumented records carried into the year",
          columns: [
            { key: "name", label: "Record" },
            { key: "moduleLabel", label: "Module" },
            { key: "completeness", label: "Documented", align: "right", format: "percent" },
          ],
          rows: undocumented.slice(0, 25).map((item) => recordRow(item, { completeness: item.completeness })),
        },
      ],
      insights: [
        {
          title: `${year} in one line`,
          text: `${added.length} records were added, ${sessions.length} sessions logged and ${undocumented.length} records remain under half documented.`,
        },
      ],
      disclosures: [VALUE_DISCLOSURE],
    };
  },
};

const crossCollection = {
  id: "cross-collection",
  order: 18,
  group: "Intelligence",
  title: "Cross-Collection Characteristics",
  description: "Characteristics that appear in more than one module, and where documentation or condition differs between modules.",
  compute(ctx) {
    const items = ctx.items;
    if (items.length === 0) return { empty: "No records match the current filters." };

    const traitModules = new Map();
    items.forEach((item) => {
      const traits = [
        ...item.tags.map((tag) => `Tag: ${tag}`),
        ...item.flavorNotes.map((note) => `Flavor: ${note}`),
        item.region ? `Region: ${item.region}` : null,
      ].filter(Boolean);
      traits.forEach((trait) => {
        const entry = traitModules.get(trait) || { name: trait, modules: new Set(), ids: [] };
        entry.modules.add(item.moduleLabel);
        entry.ids.push(item.id);
        traitModules.set(trait, entry);
      });
    });

    const shared = [...traitModules.values()]
      .filter((entry) => entry.modules.size > 1)
      .map((entry) => ({ name: entry.name, modules: [...entry.modules].join(", "), records: entry.ids.length, ids: entry.ids }))
      .sort((a, b) => b.records - a.records);

    const parity = Object.entries(MODULE_LABELS).map(([module, label]) => {
      const rows = items.filter((item) => item.module === module);
      if (rows.length === 0) return null;
      return {
        moduleLabel: label,
        records: rows.length,
        completeness: Math.round(average(rows.map((item) => item.completeness)) || 0),
        conditionRecorded: percent(rows.filter((item) => item.condition).length, rows.length),
        rated: percent(rows.filter((item) => item.rating != null).length, rows.length),
      };
    }).filter(Boolean);

    return {
      kpis: [
        { label: "Shared characteristics", value: shared.length, sub: "appearing in 2+ modules" },
        { label: "Modules compared", value: parity.length },
        { label: "Most shared", value: shared[0]?.name || "—" },
        { label: "Best documented module", value: [...parity].sort((a, b) => b.completeness - a.completeness)[0]?.moduleLabel || "—" },
      ],
      charts: [
        {
          id: "shared",
          type: "bar",
          title: "Shared characteristics",
          data: shared.slice(0, 12).map((row) => ({ name: row.name, value: row.records })),
          drillIds: Object.fromEntries(shared.slice(0, 12).map((row) => [row.name, row.ids])),
        },
        { id: "completeness", type: "bar", title: "Documentation parity (%)", data: parity.map((row) => ({ name: row.moduleLabel, value: row.completeness })) },
      ],
      tables: [
        {
          id: "shared",
          title: "Characteristics spanning modules",
          columns: [
            { key: "name", label: "Characteristic" },
            { key: "modules", label: "Modules" },
            { key: "records", label: "Records", align: "right", format: "number" },
          ],
          rows: shared.slice(0, 40),
        },
        {
          id: "parity",
          title: "Documentation and rating parity",
          columns: [
            { key: "moduleLabel", label: "Module" },
            { key: "records", label: "Records", align: "right", format: "number" },
            { key: "completeness", label: "Documented", align: "right", format: "percent" },
            { key: "conditionRecorded", label: "Condition recorded", align: "right", format: "percent" },
            { key: "rated", label: "Rated", align: "right", format: "percent" },
          ],
          rows: parity,
        },
      ],
      insights: [
        {
          title: "Shared language",
          text: shared.length > 0
            ? `${shared[0].name} is the most shared characteristic, appearing in ${shared[0].modules}.`
            : "No characteristic is recorded in more than one module yet.",
        },
      ],
      disclosures: [],
    };
  },
};

const valuationHistory = {
  id: "valuation-history",
  order: 19,
  group: "Value",
  title: "Historical Valuation Analysis",
  description: "How recorded values have changed over time, which kinds of evidence exist, and how confident each figure is.",
  compute(ctx) {
    const valuations = listOf(ctx.sources.valuations);
    if (valuations.length === 0) return { empty: "No valuation entries are recorded. Add a recorded cost, an estimate or an appraisal to a record to build this report." };

    const normalised = valuations.map((entry) => ({
      id: entry?.id,
      recordName: entry?.record_name || "Record",
      kind: entry?.kind || "user_estimate",
      amount: toNumber(firstNumber(entry?.amount_base, entry?.amount)),
      currency: entry?.currency || ctx.currency,
      date: entry?.valuation_date || entry?.created_date,
      confidence: entry?.confidence || "unknown",
      sourceType: entry?.source_type || "manual",
      methodology: entry?.methodology || "",
    }));

    const byKind = sumBy(normalised, (entry) => entry.kind, (entry) => entry.amount);
    const byMonth = sumBy(normalised, (entry) => String(entry.date || "").slice(0, 7) || "Undated", (entry) => entry.amount);
    const confidence = countBy(normalised, (entry) => entry.confidence);
    const unverified = normalised.filter((entry) => entry.sourceType === "ai_estimate" || entry.confidence === "unknown" || entry.confidence === "low");

    return {
      kpis: [
        { label: "Valuation entries", value: normalised.length },
        { label: "Kinds of evidence", value: byKind.length },
        { label: "Documented appraisals", value: normalised.filter((entry) => entry.kind === "appraisal").length },
        { label: "Low or unknown confidence", value: unverified.length },
        { label: "Entries in base currency", value: formatCurrency(total(normalised, (entry) => entry.amount), ctx.currency) },
      ],
      charts: [
        { id: "by-kind", type: "bar", title: "Recorded amount by kind", data: byKind.map((row) => ({ name: row.name, value: round(row.value, 2) })) },
        { id: "over-time", type: "line", title: "Recorded amount by month", data: byMonth.sort((a, b) => String(a.name).localeCompare(String(b.name))).map((row) => ({ name: row.name, value: round(row.value, 2) })) },
        { id: "confidence", type: "pie", title: "Confidence mix", data: confidence.map((row) => ({ name: row.name, value: row.value })) },
      ],
      tables: [
        {
          id: "entries",
          title: "Valuation entries",
          columns: [
            { key: "date", label: "Date", format: "date" },
            { key: "recordName", label: "Record" },
            { key: "kind", label: "Kind" },
            { key: "amount", label: "Amount", align: "right", format: "currency" },
            { key: "currency", label: "Currency" },
            { key: "confidence", label: "Confidence" },
            { key: "methodology", label: "Methodology" },
          ],
          rows: [...normalised].sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))).slice(0, 60),
        },
      ],
      insights: [
        {
          title: "Evidence mix",
          text: `${byKind.map((row) => `${row.name} (${row.value})`).join(", ")}.`,
        },
      ],
      disclosures: [
        VALUE_DISCLOSURE,
        "Amounts recorded in another currency are converted with the rate stored on the entry. Where no rate was stored the amount is excluded from totals rather than treated as zero.",
      ],
    };
  },
};

const CURATOR_TOPICS = [
  { key: "value", pattern: /value|worth|insur|apprais/i, title: "Value" },
  { key: "documentation", pattern: /document|complete|missing|gap/i, title: "Documentation" },
  { key: "storage", pattern: /storage|location|cellar|humidor/i, title: "Storage" },
  { key: "ratings", pattern: /rating|score|favourite|favorite|best/i, title: "Ratings" },
  { key: "aging", pattern: /ag(e|ing)|cellar|vintage|window/i, title: "Aging" },
  { key: "composition", pattern: /composition|balance|make up|breakdown|mix/i, title: "Composition" },
  { key: "overlooked", pattern: /overlook|forgotten|neglect|unused|not used/i, title: "Overlooked" },
];

const custom = {
  id: "custom-curator",
  order: 20,
  group: "Intelligence",
  title: "Curator-Generated Report",
  description: "Describe what you want summarised. Curator builds the report from your actual records and states what it could not answer.",
  compute(ctx) {
    const items = ctx.items;
    if (items.length === 0) return { empty: "No records match the current filters." };
    const question = String(ctx.curatorQuestion || "").trim();
    const matched = CURATOR_TOPICS.filter((topic) => topic.pattern.test(question));
    const topics = matched.length > 0 ? matched : [CURATOR_TOPICS[0], CURATOR_TOPICS[1]];

    const kpis = [];
    const tables = [];
    const insights = [];

    const documented = Math.round(average(items.map((item) => item.completeness)) || 0);
    const withStorage = items.filter((item) => item.storageId).length;

    topics.forEach((topic) => {
      if (topic.key === "value") {
        const withValue = items.filter((item) => item.value > 0);
        kpis.push({ label: "Records with a recorded or estimated value", value: withValue.length, sub: formatCurrency(total(withValue, (item) => item.value), ctx.currency) });
        insights.push({
          title: "Value",
          text: `${withValue.length} of ${items.length} records carry a figure, totalling ${formatCurrency(total(withValue, (item) => item.value), ctx.currency)}. That figure mixes recorded costs and owner estimates and is not a market valuation.`,
        });
      }
      if (topic.key === "documentation") {
        kpis.push({ label: "Average documentation", value: `${documented}%` });
        insights.push({
          title: "Documentation",
          text: `Records average ${documented}% of the seven documentation fields. ${items.filter((item) => item.completeness < 50).length} records are below half documented.`,
        });
        tables.push({
          id: "documentation",
          title: "Least documented records",
          columns: [
            { key: "name", label: "Record" },
            { key: "moduleLabel", label: "Module" },
            { key: "completeness", label: "Documented", align: "right", format: "percent" },
          ],
          rows: [...items].sort((a, b) => a.completeness - b.completeness).slice(0, 15).map((item) => recordRow(item, { completeness: item.completeness })),
        });
      }
      if (topic.key === "storage") {
        kpis.push({ label: "Records with a location", value: `${percent(withStorage, items.length)}%` });
        insights.push({
          title: "Storage",
          text: `${withStorage} of ${items.length} records have a storage location recorded; ${items.length - withStorage} do not.`,
        });
      }
      if (topic.key === "ratings") {
        const rated = items.filter((item) => item.rating != null);
        kpis.push({ label: "Rated records", value: rated.length, sub: rated.length ? `average ${round(average(rated.map((item) => item.rating)), 2)}` : "" });
        insights.push({
          title: "Ratings",
          text: rated.length > 0
            ? `${rated.length} records are rated, averaging ${round(average(rated.map((item) => item.rating)), 2)}. ${items.length - rated.length} remain unrated.`
            : "No record in this filter is rated yet.",
        });
      }
      if (topic.key === "aging") {
        const aging = items.filter((item) => item.agingStart && item.ageMonths != null);
        kpis.push({ label: "Records with an aging date", value: aging.length, sub: aging.length ? `median ${round(median(aging.map((item) => item.ageMonths)), 0)} months` : "" });
        insights.push({
          title: "Aging",
          text: aging.length > 0
            ? `${aging.length} records have an aging date, with a median of ${round(median(aging.map((item) => item.ageMonths)), 0)} months.`
            : "No record in this filter has an aging or cellaring date.",
        });
      }
      if (topic.key === "composition") {
        const byModule = countBy(items, (item) => item.moduleLabel);
        insights.push({
          title: "Composition",
          text: byModule.map((row) => `${row.name} ${row.value}`).join(", ") + ` (${items.length} records).`,
        });
      }
      if (topic.key === "overlooked") {
        const used = new Set(usageByItem(ctx.usage).map((row) => `${row.module}:${row.itemId}`));
        const unused = items.filter((item) => item.quantity > 0 && !used.has(`${item.module}:${item.id}`));
        kpis.push({ label: "Never logged", value: unused.length });
        insights.push({
          title: "Overlooked",
          text: `${unused.length} stocked records have no log at all. This is a description of your records, not advice to use them.`,
        });
      }
    });

    return {
      question,
      kpis: kpis.slice(0, 5),
      charts: [],
      tables,
      insights,
      disclosures: ["Curator answers from the records loaded for this filter. Where a figure is not recorded, it says so instead of estimating."],
    };
  },
};

export const INTELLIGENCE_REPORTS = Object.freeze([
  aging,
  storage,
  makers,
  ratings,
  acquisition,
  insurance,
  annual,
  crossCollection,
  valuationHistory,
  custom,
]);