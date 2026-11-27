/**
 * Collection health findings, expressed as framework actions.
 *
 * A finding says something about a record that the collector may want to fix. A
 * finding that can be fixed without inventing data carries one or more
 * `record_update` / `storage_assign` actions, built with the same `createAction`
 * used by Curator, so it is validated and executed by `actionExecute` and never
 * by a second writer.
 *
 * A finding that cannot be fixed without information only the collector has
 * (provenance, condition notes, valuation evidence) carries links instead of an
 * action: it opens the record and lets the collector document it there.
 *
 * Nothing here writes, and nothing here decides permission.
 */

import { createAction } from './actionModel';
import { ACTION_LABELS } from './actionLabels';
import {
  needsNormalization,
  suggestBlendTypeNormalization,
} from '@/components/tobacco/tobaccoClassificationConstants';

export const FINDING_TYPES = [
  { key: 'storage', label: 'Storage not assigned' },
  { key: 'classification', label: 'Classification needs review' },
  { key: 'documentation', label: 'Documentation missing' },
  { key: 'valuation', label: 'No valuation entry' },
  { key: 'condition', label: 'Condition needs attention' },
  { key: 'duplicate', label: 'Possible duplicates' },
];

export const FINDING_TYPE_KEYS = FINDING_TYPES.map((entry) => entry.key);

export const FINDING_TYPE_LABELS = FINDING_TYPES.reduce((out, entry) => {
  out[entry.key] = entry.label;
  return out;
}, {});

const MODULES = {
  pipekeeper: {
    module: 'pipekeeper',
    entity: 'Pipe',
    label: 'pipe',
    detail: '/PipeDetail',
    storageField: 'storage_location_id',
    storageModule: 'pipes',
  },
  tobacco: {
    module: 'tobacco',
    entity: 'TobaccoBlend',
    label: 'tobacco blend',
    detail: '/TobaccoDetail',
    storageField: 'storage_location_id',
    storageModule: 'tobacco',
  },
  cigarkeeper: {
    module: 'cigarkeeper',
    entity: 'Cigar',
    label: 'cigar',
    detail: '/CigarDetail',
    storageField: 'humidor_id',
    storageModule: 'cigars',
  },
  whiskeykeeper: {
    module: 'whiskeykeeper',
    entity: 'Bottle',
    label: 'bottle',
    detail: '/BottleDetail',
    storageField: 'storage_location_id',
    storageModule: null,
  },
  winekeeper: {
    module: 'winekeeper',
    entity: 'Wine',
    label: 'wine',
    detail: '/WineDetail',
    storageField: 'storage_location_id',
    storageModule: 'wine',
  },
};

export const HEALTH_MODULES = Object.keys(MODULES);

const CONDITION_ATTENTION = ['Poor', 'Fair', 'Estate - Unrestored'];

export function findingKey(type, entity, id) {
  return `${type}:${entity}:${id}`;
}

function isActive(record) {
  if (!record) return false;
  if (record.merged_into_id) return false;
  if (record.is_archived) return false;
  if (record.lifecycle_status && record.lifecycle_status !== 'active') return false;
  return true;
}

function recordName(record) {
  return String(record?.name || record?.blend_name || 'Untitled record');
}

function hasValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function detailLink(config, record) {
  return {
    to: `${config.detail}?id=${encodeURIComponent(record.id)}`,
    label: ACTION_LABELS.viewRecords,
  };
}

function storageValue(config, record) {
  return record?.[config.storageField] || null;
}

function locationMatches(location, storageModule) {
  if (!storageModule) return true;
  const value = String(location?.module || '');
  return !value || value === 'shared' || value === storageModule;
}

function documentationMissing(record) {
  const hasProvenance = ['purchase_date', 'purchase_source', 'provenance_notes', 'original_owner']
    .some((field) => hasValue(record[field]));
  return !hasProvenance && !hasValue(record.documents);
}

function storageFinding({ config, record, name, locations }) {
  const alternatives = locations.map((location) => ({
    id: `storage_${location.id}`,
    label: location.name || 'Storage location',
    description: String(location.location_type || location.humidor_type || '').replace(/_/g, ' '),
    patch: { [config.storageField]: location.id },
  }));
  const first = alternatives[0];
  const link = detailLink(config, record);

  return {
    key: findingKey('storage', config.entity, record.id),
    type: 'storage',
    moduleKey: config.module,
    entity: config.entity,
    recordId: record.id,
    recordName: name,
    title: `Assign storage for ${name}`,
    description: 'No storage location is recorded, so this record cannot be found by location.',
    hint: first ? 'Choose where it is kept.' : 'Add a storage location first, then assign it here.',
    links: [link],
    actions: first
      ? [
          createAction({
            type: 'storage_assign',
            origin: 'collection_health',
            module: config.module,
            title: `Assign storage for ${name}`,
            description: `Record which storage location holds this ${config.label}.`,
            rationale:
              'Storage is documentation. Recording it makes the record easier to find and keeps location reports accurate.',
            currentValues: [{ label: 'Storage', from: 'Not assigned', to: first.label }],
            targets: [
              {
                entity: config.entity,
                recordId: record.id,
                name,
                expected: { [config.storageField]: storageValue(config, record) || '' },
                patch: { ...first.patch },
              },
            ],
            alternatives,
            recordLinks: [link],
          }),
        ]
      : [],
  };
}

function classificationFinding({ config, record, name }) {
  const blendType = String(record.blend_type || '').trim();
  const suggestion = blendType && needsNormalization(blendType) ? suggestBlendTypeNormalization(blendType) : null;
  const link = detailLink(config, record);
  const base = {
    key: findingKey('classification', config.entity, record.id),
    type: 'classification',
    moduleKey: config.module,
    entity: config.entity,
    recordId: record.id,
    recordName: name,
    links: [link],
  };

  if (!blendType) {
    return {
      ...base,
      title: `Classification missing for ${name}`,
      description: 'No blend type is recorded.',
      hint: 'Open the blend and set its blend type.',
      actions: [],
    };
  }

  // A standard blend family is not a finding.
  if (!suggestion) return null;

  return {
    ...base,
    title: `Correct the classification of ${name}`,
    description: `Recorded as "${blendType}", which is not one of the standard blend families.`,
    hint: `Suggested: ${suggestion}`,
    actions: [
      createAction({
        type: 'record_update',
        origin: 'collection_health',
        module: config.module,
        title: `Set blend type to ${suggestion}`,
        description: `Change the blend type from "${blendType}" to "${suggestion}".`,
        rationale:
          'Blend family drives pairing and cellar guidance. A non-standard value is treated as unknown by those calculations.',
        currentValues: [{ label: 'Blend type', from: blendType, to: suggestion }],
        targets: [
          {
            entity: config.entity,
            recordId: record.id,
            name,
            expected: { blend_type: blendType },
            patch: { blend_type: suggestion },
          },
        ],
        recordLinks: [link],
      }),
    ],
  };
}

/**
 * Build every finding for the loaded collections.
 *
 * @param {object} input
 * @param {Array}  input.collections   [{ moduleKey, records }]
 * @param {Array}  [input.locations]   StorageLocation rows
 * @param {Array}  [input.humidors]    HumidorLocation rows (used for cigars)
 * @param {Array}  [input.valuations]  ValuationRecord rows
 * @param {Array}  [input.duplicateGroups] [{ moduleKey, entity, signature, label, count }]
 */
export function buildFindings({
  collections = [],
  locations = [],
  humidors = [],
  valuations = [],
  duplicateGroups = [],
} = {}) {
  const findings = [];
  const valuedRecordIds = new Set((valuations || []).map((row) => row.record_id).filter(Boolean));

  for (const collection of collections) {
    const config = MODULES[collection?.moduleKey];
    if (!config) continue;

    const pool = config.entity === 'Cigar' ? humidors : locations;
    const moduleLocations = (pool || []).filter((location) => locationMatches(location, config.storageModule));
    const records = (collection.records || []).filter(isActive);

    for (const record of records) {
      const name = recordName(record);

      if (!storageValue(config, record)) {
        findings.push(storageFinding({ config, record, name, locations: moduleLocations }));
      }

      if (config.entity === 'TobaccoBlend') {
        const classification = classificationFinding({ config, record, name });
        if (classification) findings.push(classification);
      }

      if (documentationMissing(record)) {
        findings.push({
          key: findingKey('documentation', config.entity, record.id),
          type: 'documentation',
          moduleKey: config.module,
          entity: config.entity,
          recordId: record.id,
          recordName: name,
          title: `Documentation missing for ${name}`,
          description: 'No acquisition source, provenance note or attached document is recorded.',
          hint: 'Add what you know. Every field is optional, and nothing is filled in for you.',
          links: [detailLink(config, record)],
          actions: [],
        });
      }

      const price = Number(record.purchase_price);
      if (Number.isFinite(price) && price > 0 && !valuedRecordIds.has(record.id)) {
        findings.push({
          key: findingKey('valuation', config.entity, record.id),
          type: 'valuation',
          moduleKey: config.module,
          entity: config.entity,
          recordId: record.id,
          recordName: name,
          title: `No valuation entry for ${name}`,
          description: `A purchase price is recorded, but there is no dated valuation entry behind it.`,
          hint: 'Record the cost as a valuation to keep a value history.',
          links: [{ to: '/ValuationCenter', label: ACTION_LABELS.viewRecords }],
          actions: [],
        });
      }

      if (CONDITION_ATTENTION.includes(String(record.condition || ''))) {
        findings.push({
          key: findingKey('condition', config.entity, record.id),
          type: 'condition',
          moduleKey: config.module,
          entity: config.entity,
          recordId: record.id,
          recordName: name,
          title: `${name} is recorded as ${record.condition}`,
          description: 'Condition is documentation. Reviewing it keeps the record and its history accurate.',
          hint: 'Open the record to review its condition and any inspection or maintenance notes.',
          links: [detailLink(config, record)],
          actions: [],
        });
      }
    }
  }

  for (const group of duplicateGroups || []) {
    const config = MODULES[group?.moduleKey];
    if (!config) continue;
    findings.push({
      key: `duplicate:${group.moduleKey}:${group.signature || group.label}`,
      type: 'duplicate',
      moduleKey: config.module,
      entity: config.entity,
      recordId: null,
      recordName: group.label || '',
      title: `${group.count} records look like the same ${config.label}`,
      description: group.label || '',
      hint: 'Review them side by side and keep one.',
      links: [{ to: `/CollectionTools?tab=duplicates&module=${config.entity}`, label: ACTION_LABELS.viewRecords }],
      actions: [],
    });
  }

  return findings;
}

export function summarizeFindings(findings = []) {
  const byType = {};
  for (const key of FINDING_TYPE_KEYS) byType[key] = 0;
  let actionable = 0;

  for (const finding of findings) {
    byType[finding.type] = (byType[finding.type] || 0) + 1;
    if (finding.actions?.length) actionable += 1;
  }

  return { total: findings.length, actionable, byType };
}

/** A single number for a dashboard row: the findings a collector can act on. */
export function countAttentionFindings(collections = []) {
  return buildFindings({ collections }).filter((finding) =>
    ['storage', 'classification', 'documentation'].includes(finding.type)
  ).length;
}