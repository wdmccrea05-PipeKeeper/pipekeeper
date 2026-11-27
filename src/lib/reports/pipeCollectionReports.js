/**
 * src/lib/reports/pipeCollectionReports.js
 *
 * Printable reports for PipeKeeper and the tobacco cellar.
 *
 * Every builder returns the same shape so one renderer (screen and PDF) can
 * print any of them:
 *   { key, title, description, summary[], table: { columns[], rows[] }, gaps[] }
 * Each table row carries the records behind it, which is what makes the screen
 * drill-down possible: a number is never a dead end.
 */

import { cellaringMonths, formatCellaringDuration, packagingSummary, quantitySummary } from '@/lib/collection/cellar';
import { currentSpecializations, specializationLabel } from '@/lib/collection/specialization';

const num = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

function rowsFromGroups(map, { limit } = {}) {
  return [...map.entries()]
    .sort((a, b) => b[1].records.length - a[1].records.length)
    .slice(0, limit || undefined);
}

/** Specialization coverage across the pipe collection. */
export function buildSpecializationReport(pipes = []) {
  const groups = new Map();
  const unclassified = [];
  pipes.forEach((pipe) => {
    const specs = currentSpecializations(pipe);
    if (!specs.length) {
      unclassified.push(pipe);
      return;
    }
    specs.forEach((spec) => {
      const key = spec;
      if (!groups.has(key)) groups.set(key, { records: [] });
      groups.get(key).records.push(pipe);
    });
  });

  const rows = rowsFromGroups(groups).map(([spec, group]) => ({
    label: specializationLabel(spec),
    value: group.records.length,
    records: group.records.map((pipe) => ({ id: pipe.id, name: pipe.name, href: `/PipeDetail?id=${pipe.id}` })),
  }));

  return {
    key: 'specialization',
    title: 'Specialization report',
    description: 'How your pipes are dedicated, and which ones have no specialization recorded.',
    summary: [
      { label: 'Pipes', value: pipes.length },
      { label: 'Dedicated', value: pipes.length - unclassified.length },
      { label: 'Unclassified', value: unclassified.length },
    ],
    table: {
      columns: ['Specialization', 'Pipes'],
      rows,
    },
    gaps: unclassified.length
      ? [{
        label: 'Pipes without a specialization',
        records: unclassified.map((pipe) => ({ id: pipe.id, name: pipe.name, href: `/PipeDetail?id=${pipe.id}` })),
      }]
      : [],
  };
}

/** Cellar composition by family, packaging and storage location. */
export function buildCellarCompositionReport(blends = [], locations = []) {
  const locationName = (id) => locations.find((location) => location.id === id)?.name || 'Unassigned';
  const byFamily = new Map();
  const byPackaging = new Map();
  const byLocation = new Map();
  let cellaredOz = 0;
  let totalOz = 0;
  const missingCellarDate = [];

  blends.forEach((blend) => {
    const family = blend.blend_family || blend.blend_type || 'Unclassified';
    if (!byFamily.has(family)) byFamily.set(family, { records: [] });
    byFamily.get(family).records.push(blend);

    const packaging = packagingSummary(blend).typeLabel || 'Not recorded';
    if (!byPackaging.has(packaging)) byPackaging.set(packaging, { records: [] });
    byPackaging.get(packaging).records.push(blend);

    const location = locationName(blend.storage_location_id);
    if (!byLocation.has(location)) byLocation.set(location, { records: [] });
    byLocation.get(location).records.push(blend);

    const quantities = quantitySummary(blend);
    totalOz += quantities.totalOz;
    cellaredOz += quantities.cellaredOz;

    if (cellaringMonths(blend) === null) missingCellarDate.push(blend);
  });

  const toRows = (map) => rowsFromGroups(map).map(([group, entry]) => ({
    label: group,
    value: entry.records.length,
    records: entry.records.map((blend) => ({ id: blend.id, name: blend.name, href: `/TobaccoDetail?id=${blend.id}` })),
  }));

  return {
    key: 'cellar',
    title: 'Cellar composition',
    description: 'What is in the cellar, how it is packaged and where it is kept.',
    summary: [
      { label: 'Blends', value: blends.length },
      { label: 'Recorded weight', value: `${Math.round(totalOz * 100) / 100} oz` },
      { label: 'Cellared', value: `${Math.round(cellaredOz * 100) / 100} oz` },
      { label: 'Open', value: `${Math.round((totalOz - cellaredOz) * 100) / 100} oz` },
    ],
    table: {
      columns: ['Group', 'Blends'],
      rows: toRows(byFamily),
    },
    tables: [
      { title: 'By blend family', columns: ['Family', 'Blends'], rows: toRows(byFamily) },
      { title: 'By packaging', columns: ['Packaging', 'Blends'], rows: toRows(byPackaging) },
      { title: 'By storage location', columns: ['Location', 'Blends'], rows: toRows(byLocation) },
    ],
    gaps: missingCellarDate.length
      ? [{
        label: 'Blends without a cellaring date',
        records: missingCellarDate.map((blend) => ({ id: blend.id, name: blend.name, href: `/TobaccoDetail?id=${blend.id}` })),
      }]
      : [],
  };
}

/** Documented condition and maintenance across the pipe collection. */
export function buildPipeConditionReport(pipes = [], maintenanceLogs = []) {
  const logsByPipe = new Map();
  maintenanceLogs.forEach((log) => {
    if (!log.pipe_id) return;
    if (!logsByPipe.has(log.pipe_id)) logsByPipe.set(log.pipe_id, []);
    logsByPipe.get(log.pipe_id).push(log);
  });

  const byCondition = new Map();
  const undocumented = [];
  const maintained = [];

  pipes.forEach((pipe) => {
    const condition = pipe.condition || 'Not recorded';
    if (!byCondition.has(condition)) byCondition.set(condition, { records: [] });
    byCondition.get(condition).records.push(pipe);
    if (!pipe.condition) undocumented.push(pipe);
    const logs = logsByPipe.get(pipe.id) || [];
    if (logs.length) {
      maintained.push({ ...pipe, maintenanceCount: logs.length, lastMaintenance: logs.map((l) => l.date).sort().pop() });
    }
  });

  const rows = rowsFromGroups(byCondition).map(([condition, entry]) => ({
    label: condition,
    value: entry.records.length,
    records: entry.records.map((pipe) => ({ id: pipe.id, name: pipe.name, href: `/PipeDetail?id=${pipe.id}` })),
  }));

  const maintenanceRows = maintained
    .sort((a, b) => (b.lastMaintenance || '').localeCompare(a.lastMaintenance || ''))
    .map((pipe) => ({
      label: pipe.name,
      value: `${pipe.maintenanceCount} record${pipe.maintenanceCount === 1 ? '' : 's'} · last ${pipe.lastMaintenance || 'unknown'}`,
      records: [{ id: pipe.id, name: pipe.name, href: `/PipeDetail?id=${pipe.id}` }],
    }));

  return {
    key: 'condition',
    title: 'Pipe condition report',
    description: 'Recorded condition across the collection and the maintenance documented for each pipe.',
    summary: [
      { label: 'Pipes', value: pipes.length },
      { label: 'Condition recorded', value: pipes.length - undocumented.length },
      { label: 'With maintenance history', value: maintained.length },
    ],
    table: { columns: ['Condition', 'Pipes'], rows },
    tables: [{ title: 'Maintenance history', columns: ['Pipe', 'Records'], rows: maintenanceRows }],
    gaps: undocumented.length
      ? [{
        label: 'Pipes without a recorded condition',
        records: undocumented.map((pipe) => ({ id: pipe.id, name: pipe.name, href: `/PipeDetail?id=${pipe.id}` })),
      }]
      : [],
  };
}

/** One row per maker: what is held and how it is documented. */
export function buildMakerSummaryReport(pipes = []) {
  const byMaker = new Map();
  pipes.forEach((pipe) => {
    const maker = pipe.maker || 'Unrecorded maker';
    if (!byMaker.has(maker)) byMaker.set(maker, { records: [], shapes: new Set() });
    byMaker.get(maker).records.push(pipe);
    if (pipe.shape) byMaker.get(maker).shapes.add(pipe.shape);
  });

  const rows = [...byMaker.entries()]
    .sort((a, b) => b[1].records.length - a[1].records.length)
    .map(([maker, entry]) => ({
      label: maker,
      value: `${entry.records.length} · ${[...entry.shapes].slice(0, 3).join(', ') || 'no shapes recorded'}`,
      records: entry.records.map((pipe) => ({ id: pipe.id, name: pipe.name, href: `/PipeDetail?id=${pipe.id}` })),
    }));

  return {
    key: 'makers',
    title: 'Maker summary',
    description: 'Your pipes grouped by maker, with the shapes recorded for each.',
    summary: [
      { label: 'Makers', value: byMaker.size },
      { label: 'Pipes', value: pipes.length },
      { label: 'Makers with one pipe', value: [...byMaker.values()].filter((entry) => entry.records.length === 1).length },
    ],
    table: { columns: ['Maker', 'Pipes · shapes'], rows },
    gaps: [],
  };
}

const PIPE_DOC_FIELDS = [
  { key: 'maker', label: 'Maker' },
  { key: 'shape', label: 'Shape' },
  { key: 'bowl_material', label: 'Bowl material' },
  { key: 'condition', label: 'Condition' },
  { key: 'purchase_date', label: 'Acquisition date' },
  { key: 'purchase_source', label: 'Acquisition source' },
];

const BLEND_DOC_FIELDS = [
  { key: 'manufacturer', label: 'Manufacturer' },
  { key: 'blend_type', label: 'Blend type' },
  { key: 'storage_location_id', label: 'Storage location' },
  { key: 'packaging_type', label: 'Packaging' },
  { key: 'cellar_start_date', label: 'Cellaring date' },
  { key: 'production_date', label: 'Production date' },
];

function completenessFor(record, fields) {
  const present = fields.filter((field) => {
    const value = record[field.key];
    return value !== undefined && value !== null && value !== '' && value !== 'Unknown';
  });
  return { present: present.length, total: fields.length, missing: fields.filter((f) => !present.includes(f)) };
}

/** Documentation completeness per record, for pipes and blends. */
export function buildCompletenessReport({ pipes = [], blends = [] } = {}) {
  const scored = [
    ...pipes.map((pipe) => ({
      record: pipe,
      href: `/PipeDetail?id=${pipe.id}`,
      ...completenessFor(pipe, PIPE_DOC_FIELDS),
    })),
    ...blends.map((blend) => ({
      record: blend,
      href: `/TobaccoDetail?id=${blend.id}`,
      ...completenessFor(blend, BLEND_DOC_FIELDS),
    })),
  ];

  const buckets = [
    { label: 'Complete', test: (row) => row.present === row.total },
    { label: 'Mostly complete', test: (row) => row.present >= Math.ceil(row.total * 0.66) && row.present < row.total },
    { label: 'Partial', test: (row) => row.present >= Math.ceil(row.total * 0.34) && row.present < Math.ceil(row.total * 0.66) },
    { label: 'Sparse', test: (row) => row.present < Math.ceil(row.total * 0.34) },
  ];

  const rows = buckets.map((bucket) => {
    const members = scored.filter(bucket.test);
    return {
      label: bucket.label,
      value: members.length,
      records: members.map((row) => ({ id: row.record.id, name: row.record.name, href: row.href })),
    };
  });

  const missingByField = [...PIPE_DOC_FIELDS, ...BLEND_DOC_FIELDS].map((field) => {
    const members = scored.filter((row) => row.missing.some((missing) => missing.key === field.key));
    return {
      label: field.label,
      value: members.length,
      records: members.map((row) => ({ id: row.record.id, name: row.record.name, href: row.href })),
    };
  }).filter((row) => row.value > 0);

  return {
    key: 'completeness',
    title: 'Collection completeness',
    description: 'How fully each pipe and blend record is documented.',
    summary: [
      { label: 'Records', value: scored.length },
      { label: 'Fully documented', value: rows[0].value },
      { label: 'Sparse', value: rows[rows.length - 1].value },
    ],
    table: { columns: ['Documentation', 'Records'], rows },
    tables: [{ title: 'Most common gaps', columns: ['Field', 'Records missing it'], rows: missingByField }],
    gaps: [],
  };
}

/** All report builders in display order. */
export function buildPipeCollectionReports({ pipes = [], blends = [], maintenanceLogs = [], locations = [] } = {}) {
  return [
    buildSpecializationReport(pipes),
    buildCellarCompositionReport(blends, locations),
    buildPipeConditionReport(pipes, maintenanceLogs),
    buildMakerSummaryReport(pipes),
    buildCompletenessReport({ pipes, blends }),
  ];
}

/** Cellaring ages for a quick read of the cellar's depth. */
export function cellarAgeBuckets(blends = [], now = new Date()) {
  const buckets = [
    { label: 'Under a year', min: 0, max: 11 },
    { label: '1–3 years', min: 12, max: 35 },
    { label: '3–5 years', min: 36, max: 59 },
    { label: '5 years or more', min: 60, max: Infinity },
  ];
  return buckets.map((bucket) => {
    const members = blends.filter((blend) => {
      const months = cellaringMonths(blend, now);
      return months !== null && months >= bucket.min && months <= bucket.max;
    });
    return {
      label: bucket.label,
      value: members.length,
      detail: members.length
        ? formatCellaringDuration(cellaringMonths(members[0], now))
        : null,
      records: members.map((blend) => ({ id: blend.id, name: blend.name, href: `/TobaccoDetail?id=${blend.id}` })),
    };
  });
}