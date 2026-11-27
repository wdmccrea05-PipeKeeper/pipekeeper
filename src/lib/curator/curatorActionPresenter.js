/**
 * curatorActionPresenter.js
 *
 * Turns what Curator found into Universal Action Framework actions, so the
 * collector can act inside the conversation instead of being sent away to find
 * the record and recreate the change.
 *
 * Nothing here writes and nothing here authorizes: an action names a registered
 * type, the records it targets and the values it would write, and the server
 * re-checks ownership, entitlement, the field allowlist and whether the record
 * still holds what the proposal was built from.
 *
 * Options are only offered where the collector's own data provides them
 * (another recorded storage location, the specialization candidates the review
 * actually produced). Where there is one sensible value, no choice is invented.
 */

import { createAction } from '@/lib/actions/actionModel';

export const CURATOR_ORIGIN = 'curator';

const MODULE_FOR_ENTITY = {
  Pipe: 'pipekeeper',
  TobaccoBlend: 'pipekeeper',
  Cigar: 'cigarkeeper',
  Bottle: 'whiskeykeeper',
  Wine: 'winekeeper',
};

/** StorageLocation.module uses the module's short name, not its key. */
const STORAGE_MODULE_FOR_ENTITY = {
  Pipe: 'pipes',
  TobaccoBlend: 'tobacco',
  Cigar: 'cigars',
  Wine: 'wine',
};

const DETAIL_ROUTE = {
  Pipe: '/PipeDetail',
  TobaccoBlend: '/TobaccoDetail',
  Cigar: '/CigarDetail',
  Bottle: '/BottleDetail',
  Wine: '/WineDetail',
};

const STORAGE_FIELDS = ['storage_location_id', 'humidor_id'];

/** Fields a collector can reasonably type their own value for. */
const CUSTOM_FIELD_LABELS = {
  tags: 'tags',
  notes: 'notes',
  personal_notes: 'notes',
  provenance_notes: 'provenance notes',
  condition_notes: 'condition notes',
  focus: 'specialization',
  blend_type: 'classification',
  maker: 'maker',
  brand: 'brand',
  distillery: 'distillery',
  producer: 'producer',
};

export function recordLink(entityName, recordId, name) {
  const route = DETAIL_ROUTE[entityName];
  if (!route || !recordId) return null;
  return { to: `${route}?id=${encodeURIComponent(recordId)}`, label: name ? `Open ${name}` : 'Open record' };
}

/**
 * Other storage locations this collector has recorded for this module.
 * Returns nothing when the only location is the one the record already sits in.
 */
export function storageAlternatives(entityName, currentId, storageLocations = []) {
  const moduleKey = STORAGE_MODULE_FOR_ENTITY[entityName] || null;
  return (storageLocations || [])
    .filter((location) => location?.id && location.id !== currentId)
    .filter((location) => {
      if (!moduleKey) return true;
      const module = String(location?.module || '').toLowerCase();
      return !module || module === 'shared' || module === moduleKey;
    })
    .slice(0, 6)
    .map((location) => ({
      id: `loc_${location.id}`,
      label: location.name || 'Storage location',
      patch: { storage_location_id: location.id },
    }));
}

function customConfig(field) {
  if (!field || !CUSTOM_FIELD_LABELS[field]) return {};
  return { customField: field, customLabel: CUSTOM_FIELD_LABELS[field] };
}

/** One parsed change request → one framework action. */
export function buildActionFromProposal(proposal, { storageLocations = [] } = {}) {
  if (!proposal) return null;

  const fields = Object.keys(proposal.patch || {});
  const isStorage = fields.length > 0 && fields.every((field) => STORAGE_FIELDS.includes(field));
  const isMerge = proposal.actionType === 'merge';
  const type = isMerge ? 'record_merge' : isStorage ? 'storage_assign' : 'record_update';

  const change = (proposal.changes || [])[0] || {};
  const ids = proposal.ids || [];
  const names = proposal.recordNames || [];
  const changes = (proposal.changes || []).map((entry) => ({
    label: entry.label,
    from: entry.from,
    to: entry.to,
  }));

  const targets = isMerge
    ? [
      { entity: proposal.entityName, recordId: proposal.targetId, name: proposal.targetName, role: 'survivor' },
      ...(proposal.sourceIds || []).map((id, index) => ({
        entity: proposal.entityName,
        recordId: id,
        name: (proposal.sourceNames || [])[index] || '',
        role: 'source',
      })),
    ]
    : ids.map((id, index) => ({
      entity: proposal.entityName,
      recordId: id,
      name: names[index] || proposal.recordName || '',
      // Staleness is asserted per record, so it is only claimed when the
      // proposal targets exactly one: a bulk edit legitimately spans records
      // whose current values differ from the first one.
      expected: ids.length === 1 && change.field && change.fromRaw !== undefined
        ? { [change.field]: change.fromRaw }
        : null,
      patch: proposal.patch,
    }));

  return createAction({
    type,
    origin: CURATOR_ORIGIN,
    module: proposal.moduleKey || MODULE_FOR_ENTITY[proposal.entityName] || null,
    title: proposal.summary || change.label || 'Proposed change',
    description: isMerge
      ? 'The surviving record keeps its identity and takes the duplicate\'s documentation. This cannot be undone.'
      : '',
    targets,
    currentValues: changes,
    proposedValues: changes,
    alternatives: isStorage
      ? storageAlternatives(proposal.entityName, change.fromRaw, storageLocations)
      : [],
    rationale: proposal.rationale || '',
    recordLinks: ids.length === 1
      ? [recordLink(proposal.entityName, ids[0], names[0])].filter(Boolean)
      : [],
    ...customConfig(fields.length === 1 ? fields[0] : null),
  });
}

export function buildActionsFromProposals(proposals = [], options = {}) {
  return (Array.isArray(proposals) ? proposals : [])
    .map((proposal) => buildActionFromProposal(proposal, options))
    .filter(Boolean);
}

function currentFocus(pipe = {}) {
  if (Array.isArray(pipe.focus)) return pipe.focus.filter(Boolean);
  return pipe.specialization ? [pipe.specialization] : [];
}

/**
 * A specialization review already carries several grounded candidates, each
 * with its own confidence and rationale, so they become the options — the
 * review's own recommendation is preselected and labelled as such.
 */
export function buildSpecializationActions({ pipe, review } = {}) {
  if (!pipe?.id || !review) return [];

  const current = currentFocus(pipe);
  const alternatives = (review.alternatives || []).slice(0, 4).map((alternative, index) => ({
    id: `focus_${index}`,
    label: alternative.classification,
    description: `${alternative.confidence} confidence, ${alternative.basis}`,
    rationale: alternative.rationale,
    patch: { focus: [alternative.classification] },
    recommended: review.proposed?.focus?.[0] === alternative.classification,
  }));

  const recommended = alternatives.find((alternative) => alternative.recommended) || alternatives[0];
  if (!recommended) return [];

  return [createAction({
    type: 'record_update',
    origin: CURATOR_ORIGIN,
    module: 'pipekeeper',
    title: `Set ${pipe.name || 'this pipe'} to ${recommended.label}`,
    description: current.length
      ? `Currently dedicated to ${current.join(', ')}.`
      : 'No dedication recorded yet.',
    targets: [{
      entity: 'Pipe',
      recordId: pipe.id,
      name: pipe.name || '',
      expected: { focus: current },
      patch: recommended.patch,
    }],
    currentValues: [{ label: 'Specialization', from: current.length ? current.join(', ') : 'none recorded', to: recommended.label }],
    proposedValues: [{ label: 'Specialization', from: current.length ? current.join(', ') : 'none recorded', to: recommended.label }],
    alternatives,
    rationale: recommended.rationale || '',
    evidence: (review.evidence?.families || [])
      .slice(0, 3)
      .map((family) => `${family.family}: ${family.count} session${family.count === 1 ? '' : 's'}`),
    confidence: recommended.recommended ? (review.proposed?.confidence || 'medium') : 'low',
    recordLinks: [recordLink('Pipe', pipe.id, pipe.name)].filter(Boolean),
    ...customConfig('focus'),
  })];
}

/** Estimated drinking windows are documentation, so they go through record_update. */
export function buildDrinkingWindowActions(fix, wines = []) {
  const items = Array.isArray(fix?.items) ? fix.items : [];
  if (!items.length) return [];

  const byId = new Map((wines || []).map((wine) => [wine.id, wine]));
  const targets = items
    .filter((item) => item?.recordId && item?.proposedChange?.payload)
    .map((item) => {
      const wine = byId.get(item.recordId);
      return {
        entity: 'Wine',
        recordId: item.recordId,
        name: item.recordName || wine?.name || '',
        expected: {
          drink_window_start: wine?.drink_window_start ?? null,
          drink_window_end: wine?.drink_window_end ?? null,
        },
        patch: item.proposedChange.payload,
      };
    });

  if (!targets.length) return [];

  return [createAction({
    type: 'record_update',
    origin: CURATOR_ORIGIN,
    module: 'winekeeper',
    title: `Estimate drinking windows for ${targets.length} wine${targets.length === 1 ? '' : 's'}`,
    description: 'Sets drink-from and drink-by dates estimated from each wine\'s vintage and style. Nothing else on the record changes.',
    targets,
    rationale: 'The estimate uses the recorded vintage and style — the same basis WineKeeper uses everywhere else for a drinking window.',
    confidence: 'medium',
    recordLinks: targets.length === 1
      ? [recordLink('Wine', targets[0].recordId, targets[0].name)].filter(Boolean)
      : [],
  })];
}

/**
 * Replace the proposed value with one the collector typed.
 *
 * Tags keep what the record already carries and add the new ones, because a
 * custom tag is an addition, not a replacement.
 */
export function withCustomValue(action, raw) {
  const field = action?.customField;
  const text = String(raw ?? '').trim();
  if (!field || !text) return action;

  let value;
  if (field === 'tags') {
    const existing = String(action.currentValues?.[0]?.from || '')
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag && tag !== '—');
    value = Array.from(new Set([
      ...existing,
      ...text.split(',').map((tag) => tag.trim()).filter(Boolean),
    ]));
  } else if (field === 'focus') {
    value = [text];
  } else {
    value = text;
  }

  return {
    ...action,
    // Held on the action itself so it survives choosing an option afterwards and
    // is applied last, which is what makes a typed value authoritative.
    customValue: value,
    targets: (action.targets || []).map((target) => ({
      ...target,
      patch: { ...target.patch, [field]: value },
    })),
    proposedValues: (action.proposedValues || []).map((row) => ({
      ...row,
      to: Array.isArray(value) ? value.join(', ') : value,
    })),
  };
}

/** Selection and option defaults for a freshly presented set of actions. */
export function initialActionState(actions = []) {
  const actionSelections = {};
  const actionAlternatives = {};

  for (const action of actions) {
    actionSelections[action.id] = Boolean(action.defaultSelected);
    if (action.alternatives?.length > 0) {
      const recommended = action.alternatives.find((alternative) => alternative.recommended);
      actionAlternatives[action.id] = (recommended || action.alternatives[0]).id;
    }
  }

  return { actionSelections, actionAlternatives };
}