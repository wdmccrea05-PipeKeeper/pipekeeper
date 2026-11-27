/**
 * src/lib/valuation/valuationCenter.js
 *
 * The shared valuation model behind the Collection Valuation and Documentation
 * Center.
 *
 * It keeps four things apart that are easy to blur:
 *   recorded cost      — what the collector paid, as documented.
 *   owner estimate     — what the owner believes it is worth.
 *   documented appraisal — an independent appraisal the owner holds on paper.
 *   reference valuation  — a figure from an authorized external source.
 *
 * Only a documented appraisal or a documented acquisition is treated as
 * verified. An AI-derived figure is never verified and never presented as a
 * market price. When nothing usable is recorded, the answer is "unknown", not
 * zero.
 *
 * Pure functions only — no SDK access, no writes, no network.
 */

export const BASE_CURRENCY = 'USD';

export const VALUATION_KINDS = Object.freeze({
  acquisition_cost: {
    label: 'Recorded acquisition cost',
    short: 'Acquisition cost',
    evidence: 'documented',
    verified: true,
    countsAsValue: false,
    rank: 0,
  },
  acquisition_correction: {
    label: 'Acquisition cost correction',
    short: 'Cost correction',
    evidence: 'documented',
    verified: true,
    countsAsValue: false,
    rank: 0,
  },
  appraisal: {
    label: 'Documented appraisal',
    short: 'Appraisal',
    evidence: 'documented',
    verified: true,
    countsAsValue: true,
    rank: 4,
  },
  user_estimate: {
    label: 'Owner estimate',
    short: 'Owner estimate',
    evidence: 'user_entered',
    verified: false,
    countsAsValue: true,
    rank: 3,
  },
  replacement_value: {
    label: 'Estimated replacement value',
    short: 'Replacement value',
    evidence: 'user_entered',
    verified: false,
    countsAsValue: true,
    rank: 2,
  },
  reference_valuation: {
    label: 'Reference valuation',
    short: 'Reference',
    evidence: 'reference',
    verified: false,
    countsAsValue: true,
    rank: 1,
  },
});

export const EVIDENCE_LABELS = Object.freeze({
  documented: 'Documented',
  user_entered: 'Owner entered',
  reference: 'Reference source',
  none: 'No record',
});

export const CONFIDENCE_LABELS = Object.freeze({
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
  unknown: 'Unknown',
});

export const AI_DISCLOSURE = 'AI-generated estimate — not a verified market price.';

export const VALUATION_DISCLOSURE =
  'Figures are the collector\'s own records for documentation, insurance and estate purposes. They are not market prices, not appraisals unless a documented appraisal is named, and not a valuation of sale.';

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKey(value) {
  const date = toDate(value);
  return date ? date.toISOString().slice(0, 10) : null;
}

/**
 * Convert an amount to the base currency.
 *
 * `rates` follows the app's convention: rates[CODE] is how many units of CODE
 * one unit of the base currency buys. A missing or zero rate returns null — an
 * amount that cannot be converted must never be summed as if it were zero.
 */
export function convertToBase(amount, currency = BASE_CURRENCY, rates = {}, baseCurrency = BASE_CURRENCY) {
  // A missing amount stays missing: Number(null) is 0, which would report an
  // unrecorded figure as worth nothing.
  if (amount === null || amount === undefined || amount === '') return null;
  const value = num(amount);
  if (value === null) return null;
  const code = String(currency || baseCurrency).toUpperCase();
  if (code === baseCurrency) return value;
  const rate = num(rates?.[code]);
  if (!rate || rate <= 0) return null;
  return Math.round((value / rate) * 100) / 100;
}

/**
 * Normalise one stored entry into the shape the rest of the app uses.
 *
 * Confidence and verification are derived, never trusted from the record alone:
 * an AI estimate is always low confidence and unverified, and a reference
 * valuation is only verified-adjacent when an authorized source is named.
 */
export function normaliseValuation(record = {}, rates = {}) {
  // Idempotent: an entry that has already been normalised is returned as is, so
  // callers can pass stored entries or normalised ones without losing fields.
  if (record?.__normalised === true) return record;
  const kind = VALUATION_KINDS[record?.kind] ? record.kind : null;
  const definition = kind ? VALUATION_KINDS[kind] : null;
  const currency = String(record?.currency || BASE_CURRENCY).toUpperCase();
  const amount = num(record?.amount);
  const storedBase = num(record?.amount_base);
  const amountBase = storedBase !== null ? storedBase : convertToBase(amount, currency, rates);
  const isAi = record?.source_type === 'ai_estimate';
  const isReference = kind === 'reference_valuation';
  const authorizedReference = isReference && record?.independent_source === true && Boolean(record?.reference_source_name);

  let confidence = record?.confidence || 'unknown';
  if (isAi) confidence = 'low';
  else if (isReference && !authorizedReference) confidence = 'unknown';
  else if (!definition) confidence = 'unknown';

  let verified = Boolean(definition?.verified);
  if (isAi) verified = false;
  if (isReference) verified = false;

  const rangeLow = num(record?.range_low);
  const rangeHigh = num(record?.range_high);

  return {
    __normalised: true,
    id: record?.id || null,
    recordEntity: record?.record_entity || null,
    recordId: record?.record_id || null,
    recordName: record?.record_name || '',
    moduleKey: record?.module_key || null,
    kind,
    kindLabel: definition?.label || 'Unclassified entry',
    kindShort: definition?.short || 'Unclassified',
    evidence: definition?.evidence || 'none',
    evidenceLabel: EVIDENCE_LABELS[definition?.evidence || 'none'],
    countsAsValue: Boolean(definition?.countsAsValue),
    rank: definition?.rank ?? -1,
    amount,
    currency,
    amountBase,
    convertible: amountBase !== null,
    valuationDate: record?.valuation_date || null,
    dateKey: dateKey(record?.valuation_date),
    source: record?.source || '',
    sourceType: record?.source_type || 'manual',
    methodology: record?.methodology || '',
    confidence,
    confidenceLabel: CONFIDENCE_LABELS[confidence] || CONFIDENCE_LABELS.unknown,
    verified,
    rangeLow,
    rangeHigh,
    hasRange: rangeLow !== null && rangeHigh !== null,
    appraiser: record?.appraiser || '',
    appraisalReference: record?.appraisal_reference || '',
    authorizedReference,
    referenceSourceName: record?.reference_source_name || '',
    supersedesId: record?.supersedes_id || null,
    documents: Array.isArray(record?.documents) ? record.documents : [],
    documentCount: Array.isArray(record?.documents) ? record.documents.length : 0,
    notes: record?.notes || '',
    aiDerived: isAi,
    disclosure: isAi ? AI_DISCLOSURE : isReference && !authorizedReference
      ? 'Reference figure without an authorized, reviewed source — treat as unknown.'
      : '',
  };
}

export function normaliseValuations(records = [], rates = {}) {
  return (Array.isArray(records) ? records : [])
    .map((record) => normaliseValuation(record, rates))
    .sort((a, b) => (toDate(b.valuationDate)?.getTime() || 0) - (toDate(a.valuationDate)?.getTime() || 0));
}

/** Entries grouped by the collection record they belong to. */
export function groupByRecord(records = [], rates = {}) {
  return normaliseValuations(records, rates).reduce((acc, entry) => {
    const key = entry.recordId;
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});
}

/** Latest entry of one kind within a record's history. */
function latestOfKind(entries = [], kind) {
  return entries.find((entry) => entry.kind === kind) || null;
}

/**
 * The figure to show for one record.
 *
 * Precedence: documented appraisal → owner estimate → replacement value →
 * authorized reference → recorded acquisition cost. Acquisition cost is only a
 * fallback, and it is labelled as cost, never as value.
 */
export function resolveHeadlineValuation(entries = [], options = {}) {
  const list = Array.isArray(entries) ? entries : [];
  const rateLookup = options.rates || {};
  const normalised = list.length && list[0].kindLabel ? list : normaliseValuations(list, rateLookup);
  if (!normalised.length) {
    return {
      known: false,
      kind: null,
      kindLabel: 'No valuation recorded',
      evidence: 'none',
      evidenceLabel: EVIDENCE_LABELS.none,
      confidence: 'unknown',
      confidenceLabel: CONFIDENCE_LABELS.unknown,
      verified: false,
      amountBase: null,
      currency: null,
      valuationDate: null,
      isCost: false,
      disclosure: '',
      source: '',
      methodology: '',
    };
  }

  const ordered = [...normalised].sort((a, b) => {
    if (b.rank !== a.rank) return b.rank - a.rank;
    return (toDate(b.valuationDate)?.getTime() || 0) - (toDate(a.valuationDate)?.getTime() || 0);
  });

  const chosen = ordered.find((entry) => entry.countsAsValue && entry.amountBase !== null) || ordered[0];
  const isCost = !chosen.countsAsValue;

  return {
    known: chosen.amountBase !== null,
    kind: chosen.kind,
    kindLabel: chosen.kindLabel,
    evidence: chosen.evidence,
    evidenceLabel: chosen.evidenceLabel,
    confidence: chosen.confidence,
    confidenceLabel: chosen.confidenceLabel,
    verified: chosen.verified,
    amountBase: chosen.amountBase,
    amount: chosen.amount,
    currency: chosen.currency,
    valuationDate: chosen.valuationDate,
    source: chosen.source,
    methodology: chosen.methodology,
    rangeLow: chosen.rangeLow,
    rangeHigh: chosen.rangeHigh,
    hasRange: chosen.hasRange,
    appraiser: chosen.appraiser,
    documentCount: chosen.documentCount,
    isCost,
    aiDerived: chosen.aiDerived,
    disclosure: isCost
      ? 'Recorded acquisition cost — a historical cost, not a current value.'
      : chosen.disclosure,
  };
}

/** Chronological history for one record, oldest first. */
export function buildRecordValuationHistory(entries = []) {
  return [...(Array.isArray(entries) ? entries : [])]
    .sort((a, b) => (toDate(a.valuationDate)?.getTime() || 0) - (toDate(b.valuationDate)?.getTime() || 0))
    .map((entry) => ({
      id: entry.id,
      date: entry.valuationDate,
      kind: entry.kind,
      label: entry.kindShort,
      amountBase: entry.amountBase,
      currency: entry.currency,
      confidence: entry.confidence,
      evidence: entry.evidence,
      source: entry.source,
    }));
}

/** Collection-level value over time: the headline of every record known at each date. */
export function buildValueOverTime(records = [], rates = {}) {
  const byRecord = groupByRecord(records, rates);
  const dates = [...new Set(
    Object.values(byRecord)
      .flat()
      .map((entry) => entry.dateKey)
      .filter(Boolean)
  )].sort();

  return dates.map((date) => {
    let total = 0;
    let counted = 0;
    Object.values(byRecord).forEach((entries) => {
      const upTo = entries.filter((entry) => entry.dateKey && entry.dateKey <= date);
      const headline = resolveHeadlineValuation(upTo, { rates });
      if (headline.known && !headline.isCost) {
        total += headline.amountBase;
        counted += 1;
      }
    });
    return { date, total: Math.round(total * 100) / 100, records: counted };
  });
}

function countBy(list, getKey) {
  const map = new Map();
  list.forEach((item) => {
    const key = getKey(item);
    if (!key) return;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function addToBucket(map, key, amount) {
  const label = key || 'Not recorded';
  const bucket = map.get(label) || { label, amount: 0, records: 0 };
  bucket.amount += amount || 0;
  bucket.records += 1;
  map.set(label, bucket);
}

/**
 * Collection summary across every module.
 *
 * @param {{
 *   valuations?: object[],
 *   items?: Array<{ id: string, name?: string, moduleKey?: string, entity?: string, maker?: string, category?: string, storageLocationName?: string }>,
 *   rates?: object,
 *   baseCurrency?: string,
 *   staleAfterMonths?: number,
 *   now?: Date,
 * }} input
 */
export function buildCollectionValuationSummary(input = {}) {
  const items = Array.isArray(input.items) ? input.items : [];
  const rates = input.rates || {};
  const now = input.now instanceof Date ? input.now : new Date();
  const staleAfterMonths = Number(input.staleAfterMonths) > 0 ? Number(input.staleAfterMonths) : 18;
  const byRecord = groupByRecord(input.valuations, rates);
  const itemsById = new Map(items.map((item) => [item.id, item]));

  let recordedCost = 0;
  let estimatedValue = 0;
  let valuedRecords = 0;
  let costOnlyRecords = 0;
  let appraisedRecords = 0;
  let replacementRecords = 0;
  let unknownRecords = 0;
  let lowConfidenceRecords = 0;
  let unconvertibleEntries = 0;
  let entriesTotal = 0;
  const needingUpdate = [];
  const missingDocumentation = [];

  const byModule = new Map();
  const byMaker = new Map();
  const byCategory = new Map();
  const byStorage = new Map();

  const staleCutoff = new Date(now);
  staleCutoff.setMonth(staleCutoff.getMonth() - staleAfterMonths);

  items.forEach((item) => {
    const entries = byRecord[item.id] || [];
    const normalised = normaliseValuations(entries, rates);
    entriesTotal += normalised.length;
    unconvertibleEntries += normalised.filter((entry) => !entry.convertible).length;

    const costEntry = latestOfKind(normalised, 'acquisition_correction') || latestOfKind(normalised, 'acquisition_cost');
    if (costEntry && costEntry.amountBase !== null) recordedCost += costEntry.amountBase;

    const headline = resolveHeadlineValuation(normalised, { rates });
    if (headline.known && !headline.isCost) {
      estimatedValue += headline.amountBase;
      valuedRecords += 1;
      addToBucket(byModule, item.moduleKey, headline.amountBase);
      addToBucket(byMaker, item.maker, headline.amountBase);
      addToBucket(byCategory, item.category, headline.amountBase);
      addToBucket(byStorage, item.storageLocationName, headline.amountBase);
      if (headline.confidence === 'low' || headline.confidence === 'unknown') lowConfidenceRecords += 1;
    } else if (costEntry && costEntry.amountBase !== null) {
      costOnlyRecords += 1;
      unknownRecords += 1;
    } else {
      unknownRecords += 1;
    }

    if (normalised.some((entry) => entry.kind === 'appraisal')) appraisedRecords += 1;
    if (normalised.some((entry) => entry.kind === 'replacement_value')) replacementRecords += 1;

    const lastValuationDate = normalised
      .map((entry) => toDate(entry.valuationDate))
      .filter(Boolean)
      .sort((a, b) => b.getTime() - a.getTime())[0] || null;

    if (!lastValuationDate || lastValuationDate < staleCutoff) {
      needingUpdate.push({
        id: item.id,
        name: item.name || 'Unnamed record',
        moduleKey: item.moduleKey || null,
        lastValuationDate: lastValuationDate ? lastValuationDate.toISOString().slice(0, 10) : null,
        reason: lastValuationDate ? 'Valuation older than the review window' : 'No valuation recorded',
      });
    }

    if (!normalised.some((entry) => entry.documentCount > 0)) {
      missingDocumentation.push({
        id: item.id,
        name: item.name || 'Unnamed record',
        moduleKey: item.moduleKey || null,
        reason: 'No supporting document attached',
      });
    }
  });

  const sortBuckets = (map) => [...map.values()].sort((a, b) => b.amount - a.amount);

  return {
    items: items.length,
    entries: entriesTotal,
    recordedCost: Math.round(recordedCost * 100) / 100,
    estimatedValue: Math.round(estimatedValue * 100) / 100,
    valuedRecords,
    costOnlyRecords,
    unknownRecords,
    percentValued: items.length ? Math.round((valuedRecords / items.length) * 100) : 0,
    lowConfidenceRecords,
    unconvertibleEntries,
    appraisedRecords,
    replacementRecords,
    appraisalCoverage: items.length ? Math.round((appraisedRecords / items.length) * 100) : 0,
    insuranceReady: items.filter((item) => {
      const normalised = normaliseValuations(byRecord[item.id] || [], rates);
      return normalised.some((entry) => entry.kind === 'appraisal') && normalised.some((entry) => entry.documentCount > 0);
    }).length,
    byModule: sortBuckets(byModule),
    byMaker: sortBuckets(byMaker).slice(0, 10),
    byCategory: sortBuckets(byCategory),
    byStorage: sortBuckets(byStorage),
    needingUpdate,
    missingDocumentation,
    valueOverTime: buildValueOverTime(input.valuations, rates),
    disclosure: VALUATION_DISCLOSURE,
  };
}

/** Records whose most recent valuation is not a documented one. */
export function listUnverifiedRecords(items = [], valuations = [], rates = {}) {
  const byRecord = groupByRecord(valuations, rates);
  return (Array.isArray(items) ? items : [])
    .map((item) => ({ item, headline: resolveHeadlineValuation(byRecord[item.id] || [], { rates }) }))
    .filter(({ headline }) => headline.known && !headline.verified)
    .map(({ item, headline }) => ({
      id: item.id,
      name: item.name,
      kind: headline.kind,
      kindLabel: headline.kindLabel,
      confidence: headline.confidence,
      amountBase: headline.amountBase,
      disclosure: headline.disclosure,
    }));
}

/** Module/category buckets reused by the dashboards and reports. */
export function summariseBuckets(buckets = []) {
  const total = buckets.reduce((sum, bucket) => sum + (bucket.amount || 0), 0);
  return buckets.map((bucket) => ({
    ...bucket,
    sharePercent: total > 0 ? Math.round((bucket.amount / total) * 1000) / 10 : 0,
  }));
}

export { countBy };