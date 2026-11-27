/**
 * curatorGrounding.js
 *
 * Builds the grounding blocks Curator reasons from: what the records actually
 * say, where they are thin or inconsistent, what the collector already decided,
 * and how to phrase the difference between a recorded fact, an interpretation
 * and an uncertainty.
 *
 * Pure functions only — no fetching, no rendering.
 */

import { isWithinBoundaries } from '@/lib/collection/boundaries.js';

const MODULE_LABELS = {
  pipes: 'PipeKeeper',
  blends: 'Tobacco cellar',
  bottles: 'WhiskeyKeeper',
  wines: 'WineKeeper',
  cigars: 'CigarKeeper',
};

const DOC_FIELDS = [
  ['purchase_date', 'acquisition date'],
  ['purchase_source', 'acquisition source'],
  ['original_owner', 'original owner'],
  ['provenance_notes', 'provenance notes'],
  ['condition', 'condition'],
  ['storage_location_id', 'storage location'],
  ['serial_number', 'serial number'],
  ['production_date', 'production date'],
];

function recordName(record) {
  return String(record?.name || record?.wine_name || record?.blend_name || '');
}

function hasValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function recordDocs(record) {
  return Array.isArray(record?.documents) ? record.documents : [];
}

function moduleSummary(moduleKey, records = []) {
  if (!records.length) return null;
  const counts = {};
  for (const [field, label] of DOC_FIELDS) {
    counts[label] = records.filter((record) => hasValue(record?.[field])).length;
  }
  counts.documents = records.filter((record) => recordDocs(record).length > 0).length;
  counts.condition = records.filter((record) => hasValue(record?.condition)).length;

  const total = records.length;
  const lines = Object.entries(counts)
    .filter(([, value]) => value < total)
    .map(([label, value]) => `${label} ${value}/${total}`);

  return {
    moduleKey,
    label: MODULE_LABELS[moduleKey] || moduleKey,
    total,
    counts,
    gaps: lines,
  };
}

/**
 * Per-module documentation completeness, used for "what is missing" questions
 * and for comparative analysis across modules.
 */
export function analyseDocumentationGaps(context = {}) {
  const modules = [
    moduleSummary('pipes', context.pipes || []),
    moduleSummary('blends', context.blends || []),
    moduleSummary('bottles', context.bottles || []),
    moduleSummary('wines', context.wines || []),
    moduleSummary('cigars', context.cigars || []),
  ].filter(Boolean);

  const inconsistent = [];
  for (const [moduleKey, records] of Object.entries({
    pipes: context.pipes || [],
    blends: context.blends || [],
    bottles: context.bottles || [],
    wines: context.wines || [],
    cigars: context.cigars || [],
  })) {
    for (const record of records) {
      const problems = [];
      if (hasValue(record?.purchase_price) && !hasValue(record?.purchase_date)) problems.push('price without a date');
      if (hasValue(record?.storage_location_id) === false && hasValue(record?.condition) === false) problems.push('no storage or condition recorded');
      if (hasValue(record?.serial_number) && !hasValue(record?.provenance_notes)) problems.push('serial recorded without provenance');
      if (problems.length > 0) {
        inconsistent.push(`${recordName(record) || record?.id} (${moduleKey}): ${problems.join('; ')}`);
      }
    }
  }

  return { modules, inconsistent: inconsistent.slice(0, 12) };
}

/**
 * Record-grounded context block. Every line here comes from stored records, so
 * Curator can cite them and say plainly where a field is empty.
 */
export function buildGroundingBlock(context = {}, entityContext = {}) {
  const { modules, inconsistent } = analyseDocumentationGaps(context);
  if (modules.length === 0) {
    return `RECORD GROUNDING: no collection records loaded. Do not describe items you cannot see.\n`;
  }

  const moduleLines = modules.map((entry) => {
    const gaps = entry.gaps.length ? ` — thin on: ${entry.gaps.join(', ')}` : ' — documentation complete';
    return `- ${entry.label}: ${entry.total} record${entry.total === 1 ? '' : 's'}${gaps}`;
  });

  const storageAssigned = Object.entries({
    pipes: context.pipes || [],
    blends: context.blends || [],
    bottles: context.bottles || [],
    wines: context.wines || [],
    cigars: context.cigars || [],
  })
    .map(([moduleKey, records]) => {
      const assigned = records.filter((r) => hasValue(r?.storage_location_id) || hasValue(r?.humidor_id)).length;
      return records.length ? `${moduleKey} ${assigned}/${records.length}` : null;
    })
    .filter(Boolean);

  const valued = Object.entries({
    pipes: context.pipes || [],
    bottles: context.bottles || [],
    wines: context.wines || [],
    cigars: context.cigars || [],
  })
    .map(([moduleKey, records]) => {
      const withCost = records.filter((r) => hasValue(r?.purchase_price)).length;
      const withEstimate = records.filter((r) => hasValue(r?.estimated_value)).length;
      return records.length ? `${moduleKey} cost ${withCost}/${records.length}, estimate ${withEstimate}/${records.length}` : null;
    })
    .filter(Boolean);

  const decisions = Array.isArray(entityContext?.rejectedItems) ? entityContext.rejectedItems : [];
  const appliedChanges = Array.isArray(entityContext?.appliedChanges) ? entityContext.appliedChanges : [];

  const decisionLines = [];
  for (const item of decisions.slice(-6)) {
    decisionLines.push(`- rejected ${item?.name || 'an earlier suggestion'}${item?.reason ? ` (${item.reason})` : ''}`);
  }
  for (const change of appliedChanges.slice(-6)) {
    const fields = Array.isArray(change?.fields) ? change.fields.join(', ') : 'fields';
    decisionLines.push(`- approved a change to ${change?.name || 'a record'}: ${fields}`);
  }

  return `RECORD GROUNDING (facts read from stored records):
${moduleLines.join('\n')}
Storage assigned: ${storageAssigned.join(', ') || 'none recorded'}
Valuation coverage: ${valued.join(' | ') || 'none recorded'}
${inconsistent.length ? `Inconsistencies worth naming:\n${inconsistent.map((line) => `- ${line}`).join('\n')}` : 'Inconsistencies: none detected in the loaded records.'}
${decisionLines.length ? `PREVIOUS DECISIONS IN THIS CONVERSATION:\n${decisionLines.join('\n')}` : 'PREVIOUS DECISIONS: none recorded yet.'}

HOW TO SPEAK ABOUT EVIDENCE:
- Attribute recorded facts to the record ("your log shows", "the record lists").
- Mark your own reading of them as an interpretation ("what this suggests", "my read").
- Name uncertainty and its cause ("thin session history", "no acquisition date recorded").
- Never state a value the records do not contain, and never claim a change was made.
- When a record is missing information, say which field is empty rather than guessing it.
`;
}

/** Compact history block so a follow-up keeps the thread without blowing the prompt. */
export function buildHistoryBlock(history = [], limit = 8, maxChars = 400) {
  const turns = (Array.isArray(history) ? history : [])
    .filter((message) => message?.content && (message.role === 'user' || message.role === 'assistant'))
    .slice(-limit);

  if (turns.length === 0) return '';

  const lines = turns.map((message) => {
    const speaker = message.role === 'user' ? 'COLLECTOR' : 'CURATOR';
    return `${speaker}: ${String(message.content).slice(0, maxChars)}`;
  });

  return `CONVERSATION SO FAR (oldest first — resolve references like "that one" against this):\n${lines.join('\n')}\n`;
}

const REPORT_INTENTS = [
  { pattern: /\bvaluation report\b|\binsurance (report|documentation|summary)\b/i, report: 'valuation', title: 'Valuation report', route: '/ValuationCenter' },
  { pattern: /\bcollection report\b|\binventory report\b|\bcollection summary report\b/i, report: 'collection', title: 'Collection report', route: '/CollectionReports' },
  { pattern: /\baging report\b|\bcellar report\b/i, report: 'aging', title: 'Aging report', route: '/CollectionReports' },
  { pattern: /\bpipe report\b|\bpipe collection report\b/i, report: 'pipe', title: 'Pipe collection report', route: '/CollectionReports' },
];

/** Detect a request to produce a report conversationally. */
export function detectReportRequest(text) {
  const value = String(text || '');
  if (!/\breport\b|\bdocumentation pack\b|\bexport\b/i.test(value)) return null;
  const matched = REPORT_INTENTS.find((entry) => entry.pattern.test(value));
  return matched ? { report: matched.report, title: matched.title, route: matched.route } : null;
}

const PURCHASE_INTENT = [
  /\bwhere (can|could|should) i (buy|purchase|order|find)\b/i,
  /\bwhat should i (buy|purchase|order|restock)\b/i,
  /\bshould i (buy|purchase|order|restock)\b/i,
  /\b(best|cheapest) (price|deal|retailer|shop|place to buy)\b/i,
  /\brestock(ing)? (advice|recommendation|list)\b/i,
  /\brecommend (a|some) (retailer|shop|store|vendor)\b/i,
  /\badd (it|that|this) to my (cart|basket)\b/i,
];

/** Detect a request that would cross the product boundary if answered. */
export function detectPurchaseBoundaryRequest(text) {
  const value = String(text || '');
  const matched = PURCHASE_INTENT.some((pattern) => pattern.test(value));
  if (matched) return { blocked: true, lane: 'purchasing' };
  const classification = isWithinBoundaries(value) ? null : value;
  return classification ? { blocked: true, lane: 'commercial_copy' } : null;
}

/**
 * Conversational report: a short, record-grounded summary plus the route that
 * produces the printable version. Curator describes what is in the records; it
 * does not invent figures.
 */
export function buildConversationalReport(context = {}, reportRequest = {}) {
  const { modules, inconsistent } = analyseDocumentationGaps(context);
  if (modules.length === 0) {
    return `There are no collection records loaded yet, so a ${String(reportRequest?.title || 'report').toLowerCase()} would come back empty. Add or import records first and I will summarise them.`;
  }

  const totals = modules.map((entry) => `${entry.total} in ${entry.label}`).join(', ');
  const gapLines = modules
    .filter((entry) => entry.gaps.length > 0)
    .map((entry) => `${entry.label}: ${entry.gaps.join(', ')}`);

  const parts = [
    `For a ${String(reportRequest?.title || 'collection report').toLowerCase()} I would draw on ${totals}.`,
    gapLines.length
      ? `The documentation gaps a report will show are ${gapLines.join(' | ')}.`
      : 'Every loaded record has its core documentation fields filled, so the report would be complete.',
    inconsistent.length
      ? `I would also flag ${inconsistent.length} record${inconsistent.length === 1 ? '' : 's'} where the entries disagree with each other.`
      : '',
    `The printable version, with the same records and its generation date, is in the reports area.`,
  ].filter(Boolean);

  return parts.join(' ');
}

export const BOUNDARY_REFUSAL = 'I keep Curator inside documentation: I can record what you own, how it is stored, how it has aged and what your records show about value — but I will not point you at a retailer, compare prices or suggest buying or restocking anything. If you want, I can show which records are thin on acquisition or storage detail instead.';