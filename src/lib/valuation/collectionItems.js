/**
 * src/lib/valuation/collectionItems.js
 *
 * Flattens the five collection modules into the single item shape the valuation
 * dashboards and reports consume. Identity, provenance and documentation facts
 * come from the shared record framework, so a pipe and a wine are described the
 * same way.
 *
 * Pure functions only.
 */

import {
  computeDocumentationCompleteness,
  resolveAcquisition,
  recordDisplayName,
} from '../collection/itemRecord.js';

export const MODULE_SOURCES = Object.freeze([
  { entity: 'Pipe', listKey: 'pipes', moduleKey: 'pipekeeper', moduleLabel: 'PipeKeeper', makerKeys: ['maker'], categoryKey: 'shape' },
  { entity: 'TobaccoBlend', listKey: 'blends', moduleKey: 'tobacco', moduleLabel: 'Tobacco cellar', makerKeys: ['manufacturer'], categoryKey: 'blend_type' },
  { entity: 'Cigar', listKey: 'cigars', moduleKey: 'cigarkeeper', moduleLabel: 'CigarKeeper', makerKeys: ['brand'], categoryKey: 'vitola' },
  { entity: 'Bottle', listKey: 'bottles', moduleKey: 'whiskeykeeper', moduleLabel: 'WhiskeyKeeper', makerKeys: ['distillery'], categoryKey: 'type' },
  { entity: 'Wine', listKey: 'wines', moduleKey: 'winekeeper', moduleLabel: 'WineKeeper', makerKeys: ['producer'], categoryKey: 'style' },
]);

function firstFilled(record, keys = []) {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== null && value !== undefined && String(value).trim() !== '') return String(value);
  }
  return '';
}

function mapRecord(record, source, locationNames, valuedRecordIds) {
  if (!record?.id) return null;
  const acquisition = resolveAcquisition(record);
  const documentation = computeDocumentationCompleteness(record);
  return {
    id: record.id,
    entity: source.entity,
    moduleKey: source.moduleKey,
    moduleLabel: source.moduleLabel,
    name: recordDisplayName(record, source.entity),
    maker: firstFilled(record, source.makerKeys),
    category: firstFilled(record, [source.categoryKey]),
    storageLocationName: locationNames.get(record.storage_location_id) || locationNames.get(record.humidor_id) || '',
    purchaseDate: acquisition.date,
    purchaseSource: acquisition.source,
    purchaseCost: acquisition.cost,
    originalOwner: record.original_owner || '',
    provenanceNotes: record.provenance_notes || '',
    condition: record.condition || '',
    conditionNotes: record.condition_notes || '',
    serialNumber: record.serial_number || '',
    batchNumber: record.batch_number || '',
    productionDate: record.production_date || '',
    photos: Array.isArray(record.photos) ? record.photos.filter(Boolean) : [],
    documents: Array.isArray(record.documents) ? record.documents : [],
    tags: Array.isArray(record.tags) ? record.tags : [],
    lifecycleStatus: record.lifecycle_status || 'active',
    documentationPercent: documentation.score,
    missingDocumentation: documentation.missing,
    hasValuation: valuedRecordIds.has(record.id),
  };
}

/**
 * @param {{
 *   pipes?: object[], blends?: object[], cigars?: object[], bottles?: object[], wines?: object[],
 *   locations?: object[], valuations?: object[],
 * }} input
 */
export function buildValuationItems(input = {}) {
  const locationNames = new Map(
    (Array.isArray(input.locations) ? input.locations : [])
      .filter((location) => location?.id)
      .map((location) => [location.id, location.name || 'Unnamed location'])
  );
  const valuedRecordIds = new Set(
    (Array.isArray(input.valuations) ? input.valuations : [])
      .map((valuation) => valuation?.record_id)
      .filter(Boolean)
  );

  return MODULE_SOURCES.flatMap((source) =>
    (Array.isArray(input[source.listKey]) ? input[source.listKey] : [])
      .map((record) => mapRecord(record, source, locationNames, valuedRecordIds))
      .filter(Boolean)
  );
}

/** Filter items for a ledger drill-down (module, maker, category or storage bucket). */
export function filterItems(items = [], filter = {}) {
  const list = Array.isArray(items) ? items : [];
  return list.filter((item) => {
    if (filter.moduleKey && item.moduleKey !== filter.moduleKey) return false;
    if (filter.maker && item.maker !== filter.maker) return false;
    if (filter.category && item.category !== filter.category) return false;
    if (filter.storageLocationName && item.storageLocationName !== filter.storageLocationName) return false;
    if (filter.needsUpdate && !filter.needsUpdate.includes(item.id)) return false;
    if (filter.missingDocs && !filter.missingDocs.includes(item.id)) return false;
    if (filter.valuedOnly && !item.hasValuation) return false;
    return true;
  });
}