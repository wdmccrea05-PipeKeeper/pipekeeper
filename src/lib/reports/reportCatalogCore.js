/**
 * reportCatalogCore.js
 *
 * Reports 1-10 of the Reporting Center: overview, composition, characteristics,
 * pipe specialization, pairing insights, historical preferences, discovery,
 * overlooked items, documentation completeness and health.
 *
 * Every report reads the filtered, normalized population from reportModel and
 * returns the same result shape:
 *   { empty?, kpis[], charts[], tables[], insights[], disclosures[] }
 *
 * Reports describe what the collector already owns. None of them recommend a
 * purchase, a retailer or increased consumption.
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
import { sessionsByMonth, usageByItem } from "./reportUsage";

const CONDITION_ORDER = ["Mint", "Excellent", "Very Good", "Good", "Fair", "Poor", "Estate - Unrestored", "Unknown"];

function moduleBreakdown(items) {
  return Object.entries(MODULE_LABELS)
    .map(([module, label]) => {
      const rows = items.filter((item) => item.module === module);
      if (rows.length === 0) return null;
      return {
        module,
        moduleLabel: label,
        records: rows.length,
        units: round(total(rows, (item) => item.quantity), 2),
        avgCompleteness: Math.round(average(rows.map((item) => item.completeness)) || 0),
        value: round(total(rows, (item) => item.value), 2),
        rated: rows.filter((item) => item.rating != null).length,
      };
    })
    .filter(Boolean);
}

function moduleTable(rows) {
  return {
    id: "modules",
    title: "By module",
    columns: [
      { key: "moduleLabel", label: "Module" },
      { key: "records", label: "Records", align: "right", format: "number" },
      { key: "units", label: "Units", align: "right", format: "number" },
      { key: "avgCompleteness", label: "Documented", align: "right", format: "percent" },
      { key: "value", label: "Recorded / estimated value", align: "right", format: "currency" },
    ],
    rows,
  };
}

function valueDisclosure() {
  return "Value figures combine the collector's own recorded costs and estimates. They are not market prices and are not a valuation of record.";
}

const overview = {
  id: "overview",
  order: 1,
  group: "Overview",
  title: "Collection Overview",
  description: "How much you have recorded, in which modules, and how completely it is documented.",
  compute(ctx) {
    const items = ctx.items;
    if (items.length === 0) return { empty: "No records match the current filters." };

    const breakdown = moduleBreakdown(items);
    const recent = items.filter((item) => {
      const months = monthsBetween(item.acquiredAt || item.createdAt);
      return months != null && months <= 12;
    });
    const lifecycle = countBy(items, (item) => item.lifecycleStatus || "active");
    const documented = Math.round(average(items.map((item) => item.completeness)) || 0);

    return {
      kpis: [
        { label: "Records", value: items.length, sub: `${breakdown.length} module${breakdown.length === 1 ? "" : "s"}` },
        { label: "Units", value: round(total(items, (item) => item.quantity), 1), sub: "bottles, cigars, ounces, pipes" },
        { label: "Documented", value: `${documented}%`, sub: "average of 7 documentation fields" },
        { label: "Recorded / estimated value", value: formatCurrency(total(items, (item) => item.value), ctx.currency) },
        { label: "Added in last 12 months", value: recent.length, sub: "by acquisition or record date" },
      ],
      charts: [
        {
          id: "by-module",
          type: "bar",
          title: "Records by module",
          data: breakdown.map((row) => ({ name: row.moduleLabel, value: row.records })),
          drillIds: Object.fromEntries(
            breakdown.map((row) => [row.moduleLabel, items.filter((item) => item.module === row.module).map((item) => item.id)])
          ),
        },
        {
          id: "lifecycle",
          type: "pie",
          title: "Lifecycle state",
          data: lifecycle.map((row) => ({ name: row.name, value: row.value })),
          drillIds: Object.fromEntries(lifecycle.map((row) => [row.name, row.ids])),
        },
      ],
      tables: [moduleTable(breakdown)],
      insights: [
        {
          title: "Largest module",
          text: breakdown.length
            ? `${breakdown[0].moduleLabel} holds ${breakdown[0].records} of ${items.length} records (${percent(breakdown[0].records, items.length)}%).`
            : "No module holds any records in this filter.",
        },
        {
          title: "Documentation",
          text: `Records average ${documented}% documentation. ${items.filter((item) => item.completeness < 50).length} records are below half documented.`,
        },
      ],
      disclosures: [valueDisclosure()],
    };
  },
};

const composition = {
  id: "composition",
  order: 2,
  group: "Overview",
  title: "Composition and Balance",
  description: "How the collection is distributed across categories, and whether one area dominates.",
  compute(ctx) {
    const items = ctx.items;
    if (items.length === 0) return { empty: "No records match the current filters." };

    const categories = countBy(items, (item) => `${item.moduleLabel} · ${item.category || "Unclassified"}`);
    const makers = countBy(items, (item) => item.maker || "Unrecorded maker");
    const byModule = countBy(items, (item) => item.moduleLabel);
    const topCategory = categories[0];
    const topMaker = makers[0];

    return {
      kpis: [
        { label: "Categories in use", value: categories.length },
        { label: "Largest category", value: topCategory ? topCategory.name : "None", sub: topCategory ? `${percent(topCategory.value, items.length)}% of records` : "" },
        { label: "Largest maker share", value: topMaker ? `${percent(topMaker.value, items.length)}%` : "0%", sub: topMaker ? topMaker.name : "" },
        { label: "Modules represented", value: byModule.length },
      ],
      charts: [
        {
          id: "categories",
          type: "bar",
          title: "Records by category (top 12)",
          data: categories.slice(0, 12).map((row) => ({ name: row.name, value: row.value })),
          drillIds: Object.fromEntries(categories.slice(0, 12).map((row) => [row.name, row.ids])),
        },
        {
          id: "module-share",
          type: "pie",
          title: "Share by module",
          data: byModule.map((row) => ({ name: row.name, value: row.value })),
          drillIds: Object.fromEntries(byModule.map((row) => [row.name, row.ids])),
        },
      ],
      tables: [
        {
          id: "categories",
          title: "Category balance",
          columns: [
            { key: "name", label: "Category" },
            { key: "value", label: "Records", align: "right", format: "number" },
            { key: "share", label: "Share", align: "right", format: "percent" },
          ],
          rows: categories.map((row) => ({ ...row, share: percent(row.value, items.length) })),
        },
      ],
      insights: [
        {
          title: "Balance",
          text: topCategory
            ? `${topCategory.name} accounts for ${percent(topCategory.value, items.length)}% of records; ${categories.length - 1} other categories are recorded.`
            : "No categories are recorded yet.",
        },
        {
          title: "Concentration",
          text: topMaker
            ? `The most recorded maker is ${topMaker.name} with ${topMaker.value} records. ${makers.length} makers appear in this filter.`
            : "No makers are recorded yet.",
        },
      ],
      disclosures: [],
    };
  },
};

const characteristics = {
  id: "characteristics",
  order: 3,
  group: "Overview",
  title: "Characteristics Distribution",
  description: "Which recorded characteristics (condition, flavor notes, tags, sub-types) appear across the collection.",
  compute(ctx) {
    const items = ctx.items;
    if (items.length === 0) return { empty: "No records match the current filters." };

    const conditions = countBy(items, (item) => item.condition || "Not recorded");
    const ordered = CONDITION_ORDER.map((name) => conditions.find((row) => row.name === name)).filter(Boolean)
      .concat(conditions.filter((row) => !CONDITION_ORDER.includes(row.name)));
    const flavors = countBy(items.flatMap((item) => item.flavorNotes.map((note) => ({ ...item, note }))), (entry) => entry.note);
    const tags = countBy(items.flatMap((item) => item.tags.map((tag) => ({ ...item, tag }))), (entry) => entry.tag);
    const subCategories = countBy(items.filter((item) => item.subCategory), (item) => `${item.moduleLabel} · ${item.subCategory}`);

    return {
      kpis: [
        { label: "Distinct flavor notes", value: flavors.length },
        { label: "Distinct tags", value: tags.length },
        { label: "Records with flavor notes", value: `${percent(items.filter((item) => item.flavorNotes.length > 0).length, items.length)}%` },
        { label: "Condition recorded", value: `${percent(items.filter((item) => item.condition).length, items.length)}%` },
      ],
      charts: [
        {
          id: "condition",
          type: "bar",
          title: "Condition distribution",
          data: ordered.map((row) => ({ name: row.name, value: row.value })),
          drillIds: Object.fromEntries(ordered.map((row) => [row.name, row.ids])),
        },
        {
          id: "flavors",
          type: "bar",
          title: "Most recorded flavor notes",
          data: flavors.slice(0, 12).map((row) => ({ name: row.name, value: row.value })),
          drillIds: Object.fromEntries(flavors.slice(0, 12).map((row) => [row.name, row.ids])),
        },
      ],
      tables: [
        {
          id: "tags",
          title: "Tags in use",
          columns: [
            { key: "name", label: "Tag" },
            { key: "value", label: "Records", align: "right", format: "number" },
          ],
          rows: tags.slice(0, 40),
          note: tags.length > 40 ? `Showing 40 of ${tags.length} tags.` : "",
        },
        {
          id: "subtypes",
          title: "Sub-types recorded",
          columns: [
            { key: "name", label: "Sub-type" },
            { key: "value", label: "Records", align: "right", format: "number" },
          ],
          rows: subCategories.slice(0, 25),
        },
      ],
      insights: [
        {
          title: "Most common characteristic",
          text: flavors.length > 0 ? `${flavors[0].name} appears in ${flavors[0].value} records, the most recorded flavor note.` : "No flavor notes are recorded yet.",
        },
      ],
      disclosures: [],
    };
  },
};

const specialization = {
  id: "specialization",
  order: 4,
  group: "Collection practice",
  title: "Pipe Specialization Analysis",
  description: "Which pipes carry a specialization, which do not, and how the cellar supports each one.",
  modules: ["pipe"],
  compute(ctx) {
    const pipes = ctx.items.filter((item) => item.module === "pipe");
    if (pipes.length === 0) return { empty: "No pipes match the current filters." };
    const blends = ctx.items.filter((item) => item.module === "tobacco");

    const specialized = pipes.filter((item) => listOf(item.specialization).length > 0);
    const unspecialized = pipes.filter((item) => listOf(item.specialization).length === 0);
    const counts = countBy(
      specialized.flatMap((item) => item.specialization.map((focus) => ({ ...item, focus }))),
      (entry) => entry.focus
    );

    return {
      kpis: [
        { label: "Pipes with a specialization", value: specialized.length, sub: `${percent(specialized.length, pipes.length)}% of pipes` },
        { label: "Pipes without one", value: unspecialized.length },
        { label: "Distinct specializations", value: counts.length },
        { label: "Cellar blends available", value: blends.length },
      ],
      charts: [
        {
          id: "specializations",
          type: "bar",
          title: "Pipes per specialization",
          data: counts.map((row) => ({ name: row.name, value: row.value })),
          drillIds: Object.fromEntries(counts.map((row) => [row.name, row.ids])),
        },
      ],
      tables: [
        {
          id: "unspecialized",
          title: "Pipes without a specialization",
          columns: [
            { key: "name", label: "Pipe" },
            { key: "maker", label: "Maker" },
            { key: "category", label: "Shape" },
            { key: "completeness", label: "Documented", align: "right", format: "percent" },
          ],
          rows: unspecialized.map((item) => ({ id: item.id, module: item.module, detailPath: item.detailPath, name: item.name, maker: item.maker || "—", category: item.category, completeness: item.completeness })),
          note: "A specialization is descriptive: it records how a pipe is used, not what it should be used for.",
        },
      ],
      insights: [
        {
          title: "Coverage",
          text: `${specialized.length} of ${pipes.length} pipes carry a recorded specialization. ${unspecialized.length} do not, so their use is only described by their smoking logs.`,
        },
        counts.length > 0
          ? { title: "Most common specialization", text: `${counts[0].name} is recorded on ${counts[0].value} pipes.` }
          : { title: "No specializations", text: "No pipe has a specialization recorded yet." },
      ],
      disclosures: [],
    };
  },
};

const pairing = {
  id: "pairing",
  order: 5,
  group: "Collection practice",
  title: "Pairing Insights Chart",
  description: "The existing printable pairing chart, with the criteria behind each score shown in the table.",
  modules: ["pipe"],
  compute(ctx) {
    const report = ctx.pairing;
    const rows = listOf(report?.pairingChart);
    if (rows.length === 0) return { empty: "No pipe and blend pairs could be built from the current records." };

    const scores = rows.flatMap((row) => listOf(row.matches).map((match) => toNumber(match.score)));
    const bands = [
      { name: "Strong (80+)", min: 80 },
      { name: "Moderate (60-79)", min: 60, max: 80 },
      { name: "Fair (40-59)", min: 40, max: 60 },
      { name: "Weak (below 40)", min: 0, max: 40 },
    ].map((band) => ({
      name: band.name,
      value: scores.filter((score) => score >= (band.min ?? 0) && score < (band.max ?? 101)).length,
    }));

    return {
      kpis: [
        { label: "Pipes with matches", value: rows.length },
        { label: "Pairs evaluated", value: scores.length },
        { label: "Average score", value: scores.length ? round(average(scores), 1) : "—" },
        { label: "Median score", value: scores.length ? round(median(scores), 1) : "—" },
      ],
      charts: [{ id: "score-bands", type: "bar", title: "Match score bands", data: bands }],
      tables: [
        {
          id: "top-matches",
          title: "Top recorded matches per pipe",
          columns: [
            { key: "pipe", label: "Pipe" },
            { key: "specialization", label: "Specialization" },
            { key: "blend", label: "Blend" },
            { key: "score", label: "Score", align: "right", format: "number" },
            { key: "why", label: "Criteria met" },
          ],
          rows: rows.flatMap((row) =>
            listOf(row.matches).map((match) => ({
              id: row.id,
              module: "pipe",
              detailPath: row.id ? `/PipeDetail?id=${encodeURIComponent(row.id)}` : null,
              pipe: row.name,
              specialization: row.specialization || "—",
              blend: match.blendName,
              score: match.score,
              why: match.why || "",
            }))
          ),
          note: "Scores are descriptive comparisons between records you already own. They are not purchase recommendations.",
        },
      ],
      insights: [
        {
          title: "How the score is built",
          text: "Each pair is scored from the pipe's specialization and chamber against the blend's recorded family, cut, strength and components, using the same engine as the existing Pairing Chart tab.",
        },
      ],
      disclosures: ["Pairing scores describe relationships among records you already own. They never recommend buying, and they do not encourage increased consumption."],
    };
  },
};

const preferences = {
  id: "preferences",
  order: 6,
  group: "History",
  title: "Historical Preference Analysis",
  description: "What your own usage logs and ratings show about what you reach for.",
  compute(ctx) {
    const events = ctx.usage;
    if (events.length === 0) return { empty: "No smoking, tasting or session logs are recorded in this filter." };

    const byItem = usageByItem(events).sort((a, b) => b.sessionCount - a.sessionCount);
    const byModule = sumBy(events, (entry) => MODULE_LABELS[entry.module] || entry.module, () => 1);
    const ratingByModule = Object.entries(MODULE_LABELS)
      .map(([module, label]) => {
        const scores = events.filter((entry) => entry.module === module && entry.rating != null).map((entry) => entry.rating);
        return scores.length > 0 ? { name: label, value: round(average(scores), 2) } : null;
      })
      .filter(Boolean);
    const months = sessionsByMonth(events);

    return {
      kpis: [
        { label: "Logs recorded", value: events.length },
        { label: "Items used", value: byItem.length },
        { label: "Most used item", value: byItem[0]?.itemName || "—", sub: byItem[0] ? `${byItem[0].sessionCount} sessions` : "" },
        { label: "Average rating", value: average(events.map((entry) => entry.rating).filter((value) => value != null)) != null ? round(average(events.map((entry) => entry.rating).filter((value) => value != null)), 2) : "—" },
      ],
      charts: [
        { id: "sessions", type: "line", title: "Sessions by month", data: months },
        {
          id: "ratings",
          type: "bar",
          title: "Average rating by module",
          data: ratingByModule,
        },
      ],
      tables: [
        {
          id: "most-used",
          title: "Most used records",
          columns: [
            { key: "itemName", label: "Record" },
            { key: "moduleLabel", label: "Module" },
            { key: "sessionCount", label: "Sessions", align: "right", format: "number" },
            { key: "lastUsed", label: "Last used", format: "date" },
            { key: "avgRating", label: "Average rating", align: "right", format: "rating" },
          ],
          rows: byItem.slice(0, 25).map((row) => ({
            ...row,
            moduleLabel: MODULE_LABELS[row.module] || row.module,
            detailPath: row.itemId ? `${{ pipe: "/PipeDetail", tobacco: "/TobaccoDetail", whiskey: "/BottleDetail", cigar: "/CigarDetail", wine: "/WineDetail" }[row.module]}?id=${encodeURIComponent(row.itemId)}` : null,
          })),
        },
      ],
      insights: [
        {
          title: "Where the sessions go",
          text: byModule.length > 0 ? `${byModule[0].name} accounts for ${percent(byModule[0].value, events.length)}% of logged use.` : "No sessions are recorded.",
        },
      ],
      disclosures: ["This report describes your own logged history. It is not a recommendation to use or consume more."],
    };
  },
};

const discovery = {
  id: "discovery",
  order: 7,
  group: "Intelligence",
  title: "Collection Discovery",
  description: "New descriptive insights about what you already own: rare characteristics, relationships, classification gaps and acquisition patterns.",
  compute(ctx) {
    const items = ctx.items;
    if (items.length === 0) return { empty: "No records match the current filters." };

    const traitCounts = new Map();
    items.forEach((item) => {
      const traits = [
        item.category ? `Category: ${item.category}` : null,
        item.maker ? `Maker: ${item.maker}` : null,
        item.region ? `Region: ${item.region}` : null,
        ...item.flavorNotes.map((note) => `Flavor: ${note}`),
        ...item.tags.map((tag) => `Tag: ${tag}`),
      ].filter(Boolean);
      traits.forEach((trait) => {
        const entry = traitCounts.get(trait) || { name: trait, value: 0, ids: [] };
        entry.value += 1;
        entry.ids.push(item.id);
        traitCounts.set(trait, entry);
      });
    });
    const singles = [...traitCounts.values()].filter((entry) => entry.value === 1);

    const pairs = new Map();
    items.filter((item) => item.maker && item.category).forEach((item) => {
      const key = `${item.maker} · ${item.category}`;
      const entry = pairs.get(key) || { name: key, value: 0, ids: [] };
      entry.value += 1;
      entry.ids.push(item.id);
      pairs.set(key, entry);
    });
    const pairRows = [...pairs.values()].sort((a, b) => b.value - a.value);

    const unclassified = items.filter(
      (item) => !item.category || item.category === "Unknown" || item.category === "Unclassified" || item.tags.length === 0
    );

    const acquisitionMonths = new Map();
    items.forEach((item) => {
      const key = monthKeyOf(item.acquiredAt || item.createdAt);
      if (!key) return;
      const entry = acquisitionMonths.get(key) || { name: key, value: 0, ids: [] };
      entry.value += 1;
      entry.ids.push(item.id);
      acquisitionMonths.set(key, entry);
    });
    const timeline = [...acquisitionMonths.values()].sort((a, b) => a.name.localeCompare(b.name));

    return {
      kpis: [
        { label: "Single-instance characteristics", value: singles.length, sub: "held by exactly one record" },
        { label: "Maker + category pairs", value: pairRows.length },
        { label: "Classification opportunities", value: unclassified.length },
        { label: "Active acquisition months", value: timeline.length },
      ],
      charts: [
        {
          id: "rare",
          type: "bar",
          title: "Characteristics held by a single record (top 12)",
          data: singles.slice(0, 12).map((row) => ({ name: row.name, value: row.value })),
          drillIds: Object.fromEntries(singles.slice(0, 12).map((row) => [row.name, row.ids])),
        },
        { id: "timeline", type: "line", title: "Records acquired by month", data: timeline },
      ],
      tables: [
        {
          id: "singles",
          title: "Characteristics only one record carries",
          columns: [
            { key: "name", label: "Characteristic" },
            { key: "record", label: "Held by" },
          ],
          rows: singles.slice(0, 25).map((row) => {
            const owner = items.find((item) => item.id === row.ids[0]);
            return { name: row.name, record: owner?.name || "—", id: owner?.id, module: owner?.module, detailPath: owner?.detailPath };
          }),
          note: "A single-instance characteristic is the least represented trait in the current filter, not a gap to fill.",
        },
        {
          id: "pairs",
          title: "Maker and category relationships",
          columns: [
            { key: "name", label: "Maker · category" },
            { key: "value", label: "Records", align: "right", format: "number" },
          ],
          rows: pairRows.slice(0, 25),
        },
        {
          id: "unclassified",
          title: "Classification opportunities",
          columns: [
            { key: "name", label: "Record" },
            { key: "moduleLabel", label: "Module" },
            { key: "category", label: "Category" },
            { key: "missing", label: "Missing" },
          ],
          rows: unclassified.slice(0, 25).map((item) => ({
            id: item.id,
            module: item.module,
            detailPath: item.detailPath,
            name: item.name,
            moduleLabel: item.moduleLabel,
            category: item.category || "—",
            missing: [item.category === "Unknown" || !item.category ? "category" : null, item.tags.length === 0 ? "tags" : null].filter(Boolean).join(", "),
          })),
        },
      ],
      insights: [
        {
          title: "Relationships",
          text: pairRows.length > 0 ? `${pairRows[0].name} is the most repeated maker and category combination, with ${pairRows[0].value} records.` : "No maker and category combination repeats yet.",
        },
        {
          title: "Historical pattern",
          text: timeline.length > 0 ? `Acquisitions are recorded across ${timeline.length} months, most recently ${timeline[timeline.length - 1].name} with ${timeline[timeline.length - 1].value} records.` : "No acquisition dates are recorded.",
        },
        {
          title: "Classification",
          text: `${unclassified.length} records are missing a category or tags, which limits how precisely they can be compared.`,
        },
      ],
      disclosures: ["Discovery describes characteristics already in the collection. It does not suggest acquisitions."],
    };
  },
};

const overlooked = {
  id: "overlooked",
  order: 8,
  group: "Intelligence",
  title: "Overlooked Collection Items",
  description: "Records that have not appeared in your logs recently, have never been rated, or are documented only partly.",
  compute(ctx) {
    const items = ctx.items.filter((item) => item.quantity > 0);
    if (items.length === 0) return { empty: "No records with stock match the current filters." };

    const byItem = new Map(usageByItem(ctx.usage).map((row) => [`${row.module}:${row.itemId}`, row]));
    const rows = items.map((item) => {
      const usage = byItem.get(`${item.module}:${item.id}`);
      const monthsSinceUse = usage?.lastUsed ? monthsBetween(usage.lastUsed) : null;
      const reasons = [];
      if (!usage) reasons.push("never logged");
      else if (monthsSinceUse != null && monthsSinceUse >= 12) reasons.push(`not logged in ${monthsSinceUse} months`);
      if (item.rating == null) reasons.push("never rated");
      if (item.completeness < 50) reasons.push("under half documented");
      return {
        id: item.id,
        module: item.module,
        detailPath: item.detailPath,
        name: item.name,
        moduleLabel: item.moduleLabel,
        quantity: round(item.quantity, 2),
        lastUsed: usage?.lastUsed || null,
        monthsSinceUse,
        completeness: item.completeness,
        reasons,
      };
    }).filter((row) => row.reasons.length > 0);

    rows.sort((a, b) => b.reasons.length - a.reasons.length || (b.monthsSinceUse ?? 999) - (a.monthsSinceUse ?? 999));

    const reasonCounts = countBy(rows.flatMap((row) => row.reasons.map((reason) => ({ ...row, reason }))), (entry) => entry.reason);

    return {
      kpis: [
        { label: "Records with stock", value: items.length },
        { label: "Overlooked records", value: rows.length, sub: `${percent(rows.length, items.length)}% of stocked records` },
        { label: "Never logged", value: rows.filter((row) => row.reasons.includes("never logged")).length },
        { label: "Under half documented", value: rows.filter((row) => row.reasons.includes("under half documented")).length },
      ],
      charts: [
        { id: "reasons", type: "bar", title: "Why a record is listed", data: reasonCounts.map((row) => ({ name: row.name, value: row.value })) },
      ],
      tables: [
        {
          id: "overlooked",
          title: "Overlooked records",
          columns: [
            { key: "name", label: "Record" },
            { key: "moduleLabel", label: "Module" },
            { key: "quantity", label: "Units", align: "right", format: "number" },
            { key: "lastUsed", label: "Last logged", format: "date" },
            { key: "completeness", label: "Documented", align: "right", format: "percent" },
            { key: "reasonText", label: "Why listed" },
          ],
          rows: rows.slice(0, 50).map((row) => ({ ...row, reasonText: row.reasons.join(", ") })),
          note: rows.length > 50 ? `Showing 50 of ${rows.length} records.` : "",
        },
      ],
      insights: [
        {
          title: "What this shows",
          text: `${rows.length} records have no recent log, no rating, or limited documentation. This is a description of your records, not a prompt to consume them.`,
        },
      ],
      disclosures: ["Listing a record as overlooked is descriptive. It is not advice to use, open, sell or replace it."],
    };
  },
};

const DOC_FIELDS = [
  { key: "photos", label: "Photographs" },
  { key: "notes", label: "Notes" },
  { key: "acquisition", label: "Acquisition date" },
  { key: "cost", label: "Acquisition cost" },
  { key: "provenance", label: "Provenance" },
  { key: "tags", label: "Tags" },
  { key: "documents", label: "Documents" },
];

const documentation = {
  id: "documentation",
  order: 9,
  group: "Documentation",
  title: "Documentation Completeness",
  description: "Which documentation fields are filled in, per module, and which records are least documented.",
  compute(ctx) {
    const items = ctx.items;
    if (items.length === 0) return { empty: "No records match the current filters." };

    const coverage = DOC_FIELDS.map((field) => ({
      name: field.label,
      value: percent(items.filter((item) => item.docFlags[field.key]).length, items.length),
    }));

    const byModule = Object.entries(MODULE_LABELS)
      .map(([module, label]) => {
        const rows = items.filter((item) => item.module === module);
        if (rows.length === 0) return null;
        return {
          moduleLabel: label,
          records: rows.length,
          avgCompleteness: Math.round(average(rows.map((item) => item.completeness)) || 0),
          missingDocs: rows.filter((item) => !item.docFlags.documents).length,
        };
      })
      .filter(Boolean);

    const weakest = [...items].sort((a, b) => a.completeness - b.completeness).slice(0, 25);

    return {
      kpis: [
        { label: "Average completeness", value: `${Math.round(average(items.map((item) => item.completeness)) || 0)}%`, sub: "of 7 documentation fields" },
        { label: "Fully documented", value: items.filter((item) => item.completeness === 100).length },
        { label: "Under half documented", value: items.filter((item) => item.completeness < 50).length },
        { label: "With supporting documents", value: items.filter((item) => item.docFlags.documents).length },
      ],
      charts: [
        { id: "coverage", type: "bar", title: "Field coverage (%)", data: coverage },
        {
          id: "by-module",
          type: "bar",
          title: "Average completeness by module (%)",
          data: byModule.map((row) => ({ name: row.moduleLabel, value: row.avgCompleteness })),
        },
      ],
      tables: [
        {
          id: "by-module",
          title: "Completeness by module",
          columns: [
            { key: "moduleLabel", label: "Module" },
            { key: "records", label: "Records", align: "right", format: "number" },
            { key: "avgCompleteness", label: "Documented", align: "right", format: "percent" },
            { key: "missingDocs", label: "Without documents", align: "right", format: "number" },
          ],
          rows: byModule,
        },
        {
          id: "weakest",
          title: "Least documented records",
          columns: [
            { key: "name", label: "Record" },
            { key: "moduleLabel", label: "Module" },
            { key: "missing", label: "Missing fields" },
            { key: "completeness", label: "Documented", align: "right", format: "percent" },
          ],
          rows: weakest.map((item) => ({
            id: item.id,
            module: item.module,
            detailPath: item.detailPath,
            name: item.name,
            moduleLabel: item.moduleLabel,
            missing: DOC_FIELDS.filter((field) => !item.docFlags[field.key]).map((field) => field.label).join(", ") || "—",
            completeness: item.completeness,
          })),
        },
      ],
      insights: [
        {
          title: "Weakest field",
          text: coverage.length > 0 ? `${[...coverage].sort((a, b) => a.value - b.value)[0].name} is the least recorded field, present on ${[...coverage].sort((a, b) => a.value - b.value)[0].value}% of records.` : "No fields recorded.",
        },
      ],
      disclosures: [],
    };
  },
};

const health = {
  id: "health",
  order: 10,
  group: "Documentation",
  title: "Collection Health and Condition",
  description: "Recorded condition, maintenance history and inspection findings across the collection.",
  compute(ctx) {
    const items = ctx.items;
    if (items.length === 0) return { empty: "No records match the current filters." };

    const conditionRows = countBy(items, (item) => item.condition || "Not recorded");
    const concerning = items.filter((item) => /poor|fair|unrestored|damaged|seeping|broken/i.test(item.condition));
    const maintenance = listOf(ctx.sources.pipeMaintenance).length + listOf(ctx.sources.humidorMaintenance).length;
    const inspections = listOf(ctx.sources.wineInspections);
    const inspectionIssues = inspections.filter((entry) => /seeping|broken|damaged|missing/i.test(`${entry?.seal_condition || ""} ${entry?.capsule_condition || ""} ${entry?.label_condition || ""}`));
    const lowFill = listOf(ctx.sources.bottleFills).filter((entry) => toNumber(entry?.fill_percent) <= 25);
    const readings = listOf(ctx.sources.humidorReadings);

    return {
      kpis: [
        { label: "Condition recorded", value: `${percent(items.filter((item) => item.condition).length, items.length)}%` },
        { label: "Records in lower condition", value: concerning.length },
        { label: "Maintenance entries", value: maintenance },
        { label: "Inspection findings", value: inspectionIssues.length, sub: `${inspections.length} inspections recorded` },
        { label: "Low fill records", value: lowFill.length },
      ],
      charts: [
        {
          id: "condition",
          type: "bar",
          title: "Condition distribution",
          data: conditionRows.map((row) => ({ name: row.name, value: row.value })),
          drillIds: Object.fromEntries(conditionRows.map((row) => [row.name, row.ids])),
        },
      ],
      tables: [
        {
          id: "concerning",
          title: "Records with a lower recorded condition",
          columns: [
            { key: "name", label: "Record" },
            { key: "moduleLabel", label: "Module" },
            { key: "condition", label: "Condition" },
            { key: "notes", label: "Condition notes" },
          ],
          rows: concerning.slice(0, 40).map((item) => ({
            id: item.id,
            module: item.module,
            detailPath: item.detailPath,
            name: item.name,
            moduleLabel: item.moduleLabel,
            condition: item.condition,
            notes: item.conditionNotes || "—",
          })),
          note: "Condition values are the ones you recorded. They are not an inspection or an appraisal.",
        },
        {
          id: "readings",
          title: "Recent environmental readings",
          columns: [
            { key: "humidor_name", label: "Location" },
            { key: "recorded_at", label: "Recorded", format: "date" },
            { key: "humidity_rh", label: "RH %", align: "right", format: "number" },
            { key: "temperature_f", label: "°F", align: "right", format: "number" },
          ],
          rows: readings.slice(0, 20),
          note: readings.length === 0 ? "No humidity or temperature readings recorded." : "",
        },
      ],
      insights: [
        {
          title: "Condition coverage",
          text: `${items.filter((item) => !item.condition).length} records have no condition recorded, so they cannot be compared on this report.`,
        },
        inspectionIssues.length > 0
          ? { title: "Inspection findings", text: `${inspectionIssues.length} inspections recorded a seal, capsule or label issue.` }
          : { title: "Inspection findings", text: "No inspection recorded a seal, capsule or label issue." },
      ],
      disclosures: ["Condition and maintenance figures come from your own records and observations. This report is documentation, not a professional inspection."],
    };
  },
};

export const CORE_REPORTS = Object.freeze([
  overview,
  composition,
  characteristics,
  specialization,
  pairing,
  preferences,
  discovery,
  overlooked,
  documentation,
  health,
]);