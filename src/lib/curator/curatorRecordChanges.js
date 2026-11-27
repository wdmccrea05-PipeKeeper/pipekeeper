/**
 * curatorRecordChanges.js
 *
 * Turns an explicit request ("tag my Dunhill as estate", "move the Lagavulin
 * to Cellar B") into a concrete, reviewable change proposal built from the
 * collector's actual records. Nothing here writes: it produces the existing and
 * proposed values that Curator shows for confirmation, and the patch that the
 * server re-validates before applying.
 *
 * Deliberate limits: only documentation, classification, storage and tag fields
 * are addressable, the record must resolve to exactly one owned record (or an
 * explicit "all"), and an unparsed request returns a reason instead of a guess.
 */

const MODULE_FOR_ENTITY = {
  Pipe: 'pipekeeper',
  TobaccoBlend: 'pipekeeper',
  Cigar: 'cigarkeeper',
  Bottle: 'whiskeykeeper',
  Wine: 'winekeeper',
};

export const FIELD_LABELS = {
  tags: 'Tags',
  storage_location_id: 'Storage location',
  focus: 'Specialization',
  condition: 'Condition',
  notes: 'Notes',
  personal_notes: 'Notes',
  blend_type: 'Blend classification',
  packaging_condition: 'Packaging condition',
  maker: 'Maker',
  brand: 'Brand',
  distillery: 'Distillery',
  producer: 'Producer',
  year_made: 'Year made',
  purchase_source: 'Acquisition source',
  original_owner: 'Original owner',
  provenance_notes: 'Provenance notes',
  serial_number: 'Serial number',
  batch_number: 'Batch number',
  production_date: 'Production date',
  condition_notes: 'Condition notes',
};

/** Logical field name → the actual field on each entity. */
const FIELD_RESOLUTION = {
  tags: { default: 'tags' },
  storage: { default: 'storage_location_id' },
  specialization: { Pipe: 'focus' },
  classification: { TobaccoBlend: 'blend_type' },
  condition: { default: 'condition' },
  notes: { Cigar: 'personal_notes', default: 'notes' },
  maker: { Pipe: 'maker', Cigar: 'brand', Bottle: 'distillery', Wine: 'producer' },
  year_made: { Pipe: 'year_made' },
  purchase_source: { default: 'purchase_source' },
  original_owner: { default: 'original_owner' },
  provenance_notes: { default: 'provenance_notes' },
  serial_number: { default: 'serial_number' },
  batch_number: { default: 'batch_number' },
  production_date: { default: 'production_date' },
  condition_notes: { default: 'condition_notes' },
};

const LABEL_ALIASES = {
  'acquisition source': 'purchase_source',
  source: 'purchase_source',
  'where i got it': 'purchase_source',
  'original owner': 'original_owner',
  provenance: 'provenance_notes',
  'provenance notes': 'provenance_notes',
  'serial number': 'serial_number',
  serial: 'serial_number',
  'batch number': 'batch_number',
  batch: 'batch_number',
  'production date': 'production_date',
  'condition notes': 'condition_notes',
  'year made': 'year_made',
  year: 'year_made',
  maker: 'maker',
  brand: 'maker',
  producer: 'maker',
  distillery: 'maker',
  classification: 'classification',
  'blend type': 'classification',
  condition: 'condition',
  notes: 'notes',
  note: 'notes',
};

const CHANGE_VERB = /\b(add|change|correct|fix|set|assign|move|store|put|tag|update|record|mark|merge)\b/i;
const QUESTION_START = /^(what|why|how|which|who|when|where|is|are|does|do|did|should|could|would|can i)\b/i;

export function resolveEntityField(entityName, logicalKey) {
  const map = FIELD_RESOLUTION[logicalKey];
  if (!map) return null;
  return map[entityName] || map.default || null;
}

function normalise(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanValue(value) {
  return String(value || '')
    .replace(/^["'“”]+|["'“”.]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitTags(value) {
  return cleanValue(value)
    .split(/,| and /i)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

/** True when the message asks Curator to change a record. */
export function detectRecordChangeRequest(text) {
  const value = String(text || '').trim();
  if (!value) return false;
  if (detectUndoRequest(value)) return false;
  if (QUESTION_START.test(value) && !/^can you\b/i.test(value)) return false;
  if (!CHANGE_VERB.test(value)) return false;
  return /\b(my|the)\b/i.test(value) || /^(please\s+)?(tag|add|change|correct|fix|set|assign|move|store|put|update|record|mark|merge)\b/i.test(value);
}

export function detectUndoRequest(text) {
  return /\b(undo|revert|roll ?back|take that back|reverse (that|the) change)\b/i.test(String(text || ''));
}

export function detectMergeRequest(text) {
  const value = String(text || '');
  const match = value.match(/\bmerge\s+(?:my\s+|the\s+)?(.+?)\s+into\s+(?:my\s+|the\s+)?(.+)$/i);
  if (!match) return null;
  return { sourcePhrase: cleanValue(match[1]), targetPhrase: cleanValue(match[2]) };
}

const RULES = [
  {
    logical: 'tags',
    pattern: /^(?:please\s+)?add\s+(?:the\s+)?tags?\s+(.+?)\s+to\s+(?:my\s+|the\s+)?(.+)$/i,
    build: (m) => ({ value: splitTags(m[1]), phrase: m[2] }),
  },
  {
    logical: 'tags',
    pattern: /^(?:please\s+)?tag\s+(?:my\s+|the\s+)?(.+?)\s+(?:as|with)\s+(.+)$/i,
    build: (m) => ({ phrase: m[1], value: splitTags(m[2]) }),
  },
  {
    logical: 'storage',
    pattern: /^(?:please\s+)?(?:move|store|put|assign|place)\s+(?:my\s+|the\s+)?(.+?)\s+(?:in)?to\s+(?:my\s+|the\s+)?(.+)$/i,
    build: (m) => ({ phrase: m[1], value: cleanValue(m[2]) }),
  },
  {
    logical: 'specialization',
    pattern: /^(?:please\s+)?(?:set|change|update)\s+(?:the\s+)?(?:specialization|specialisation|focus|dedication)\s+(?:of|for)\s+(?:my\s+|the\s+)?(.+?)\s+to\s+(.+)$/i,
    build: (m) => ({ phrase: m[1], value: cleanValue(m[2]) }),
  },
  {
    logical: 'notes',
    pattern: /^(?:please\s+)?(?:add|record|save|append)\s+(?:a\s+)?note\s+(?:to|on)\s+(?:my\s+|the\s+)?(.+?)(?::|\s-\s|\s+that\s+)(.+)$/i,
    build: (m) => ({ phrase: m[1], value: cleanValue(m[2]) }),
  },
  {
    logical: 'condition',
    pattern: /^(?:please\s+)?(?:set|change|update|mark)\s+(?:the\s+)?condition\s+(?:of|for|on)\s+(?:my\s+|the\s+)?(.+?)\s+(?:to|as)\s+(.+)$/i,
    build: (m) => ({ phrase: m[1], value: cleanValue(m[2]) }),
  },
  {
    logical: null,
    pattern: /^(?:please\s+)?(?:correct|change|update|fix|set)\s+(?:the\s+)?([a-z ]{2,24}?)\s+(?:of|for|on)\s+(?:my\s+|the\s+)?(.+?)\s+to\s+(.+)$/i,
    build: (m) => ({ label: normalise(m[1]), phrase: m[2], value: cleanValue(m[3]) }),
  },
];

/** Parse a change request into { logicalField, value, recordPhrase }. */
export function parseChangeRequest(text) {
  const value = String(text || '').trim().replace(/^can you\s+/i, '').replace(/^please\s+/i, '');
  for (const rule of RULES) {
    const match = value.match(rule.pattern);
    if (!match) continue;
    const parsed = rule.build(match);
    const logical = rule.logical || LABEL_ALIASES[parsed.label] || null;
    if (!logical) continue;
    return {
      logicalField: logical,
      value: parsed.value,
      recordPhrase: cleanValue(parsed.phrase),
      wantsAll: /\ball\b|\bevery\b/i.test(parsed.phrase),
    };
  }
  return null;
}

/**
 * Resolve a phrase to exactly one record. Equal-scoring candidates are returned
 * as ambiguous rather than guessed at.
 */
export function resolveRecordFromPhrase(phrase, records = []) {
  const query = normalise(String(phrase || '').replace(/\ball\b|\bevery\b|\brecords?\b|\bitems?\b/gi, ' '));
  if (!query) return { match: null, candidates: [] };

  const scored = [];
  for (const record of records) {
    const name = normalise(record?.name || record?.wine_name || record?.blend_name);
    if (!name) continue;
    let score = 0;
    if (name === query) score = 100;
    else if (name.includes(query) || query.includes(name)) score = 70 + Math.min(name.length, query.length) / 10;
    else {
      const words = query.split(' ').filter((word) => word.length > 2);
      const matched = words.filter((word) => name.includes(word)).length;
      if (matched > 0) score = matched * 10;
    }
    if (score > 0) scored.push({ record, score });
  }

  if (scored.length === 0) return { match: null, candidates: [] };
  scored.sort((a, b) => b.score - a.score);
  const top = scored[0];
  const ties = scored.filter((entry) => entry.score === top.score);
  if (ties.length > 1) {
    return { match: null, candidates: ties.slice(0, 6).map((entry) => entry.record) };
  }
  return { match: top.record, candidates: [] };
}

function resolveStorage(value, storageLocations = []) {
  const query = normalise(value);
  if (!query) return null;
  const exact = storageLocations.find((location) => normalise(location?.name) === query);
  if (exact) return exact;
  const partial = storageLocations.filter((location) => {
    const name = normalise(location?.name);
    return name && (name.includes(query) || query.includes(name));
  });
  return partial.length === 1 ? partial[0] : null;
}

function formatValue(field, value) {
  if (Array.isArray(value)) return value.join(', ');
  if (value === null || value === undefined || value === '') return '—';
  if (field === 'focus' && typeof value === 'string') return value;
  return String(value);
}

function fieldLabel(field) {
  return FIELD_LABELS[field] || field.replace(/_/g, ' ');
}

function buildChangeSet(record, field, proposed, storageLocations) {
  const current = record?.[field] ?? null;
  let next = proposed;

  if (field === 'tags') {
    const existing = Array.isArray(current) ? current : [];
    next = Array.from(new Set([...existing, ...(Array.isArray(proposed) ? proposed : [proposed])]));
  }
  if (field === 'focus') {
    const existing = Array.isArray(current) ? current : [];
    next = Array.from(new Set([...existing, String(proposed)]));
  }
  if (field === 'storage_location_id') {
    const location = resolveStorage(proposed, storageLocations);
    next = location ? location.id : null;
  }

  return {
    field,
    label: fieldLabel(field),
    from: formatValue(field, field === 'storage_location_id'
      ? (storageLocations.find((l) => l.id === current)?.name || current)
      : current),
    to: formatValue(field, field === 'storage_location_id'
      ? (storageLocations.find((l) => l.id === next)?.name || proposed)
      : next),
    fromRaw: current,
    toRaw: next,
  };
}

/**
 * Build a change proposal from a request.
 *
 * @returns {{ok: true, proposal: object} | {ok: false, reason: string, candidates?: object[]}}
 */
export function buildChangeProposal({
  text,
  collections = {},
  storageLocations = [],
  enabledModules = {},
} = {}) {
  const merge = detectMergeRequest(text);
  if (merge) {
    const all = Object.entries(collections).flatMap(([entityName, records]) =>
      (records || []).map((record) => ({ entityName, record }))
    );
    const source = resolveRecordFromPhrase(merge.sourcePhrase, all.map((entry) => entry.record));
    const target = resolveRecordFromPhrase(merge.targetPhrase, all.map((entry) => entry.record));
    if (!source.match || !target.match) {
      return {
        ok: false,
        reason: 'ambiguous',
        candidates: [...(source.candidates || []), ...(target.candidates || [])],
      };
    }
    const sourceEntry = all.find((entry) => entry.record === source.match);
    const targetEntry = all.find((entry) => entry.record === target.match);
    if (!sourceEntry || !targetEntry || sourceEntry.entityName !== targetEntry.entityName) {
      return { ok: false, reason: 'merge_entity_mismatch' };
    }
    const moduleKey = MODULE_FOR_ENTITY[sourceEntry.entityName];
    if (enabledModules && enabledModules[moduleKey] === false) {
      return { ok: false, reason: 'module_locked' };
    }
    return {
      ok: true,
      proposal: {
        actionType: 'merge',
        entityName: sourceEntry.entityName,
        moduleKey,
        targetId: targetEntry.record.id,
        targetName: targetEntry.record.name,
        sourceIds: [sourceEntry.record.id],
        sourceNames: [sourceEntry.record.name],
        changes: [
          {
            field: 'merge',
            label: 'Merge record',
            from: sourceEntry.record.name,
            to: `into ${targetEntry.record.name}`,
          },
        ],
        summary: `Merge "${sourceEntry.record.name}" into "${targetEntry.record.name}". The merged record keeps the target's identity and takes the source's documentation.`,
        undoable: false,
      },
    };
  }

  const parsed = parseChangeRequest(text);
  if (!parsed) return { ok: false, reason: 'unparsed' };

  const pool = Object.entries(collections).flatMap(([entityName, records]) =>
    (records || []).map((record) => ({ entityName, record }))
  );
  if (pool.length === 0) return { ok: false, reason: 'no_records' };

  const resolved = resolveRecordFromPhrase(parsed.recordPhrase, pool.map((entry) => entry.record));
  const targets = parsed.wantsAll
    ? pool.filter((entry) => {
        const name = normalise(entry.record?.name);
        const words = normalise(parsed.recordPhrase).split(' ').filter((w) => w.length > 2 && w !== 'all' && w !== 'every');
        return words.length > 0 && words.every((word) => name.includes(word));
      })
    : resolved.match
      ? pool.filter((entry) => entry.record === resolved.match)
      : [];

  if (targets.length === 0) {
    return {
      ok: false,
      reason: resolved.candidates.length ? 'ambiguous' : 'no_match',
      candidates: resolved.candidates || [],
    };
  }

  const entityNames = Array.from(new Set(targets.map((entry) => entry.entityName)));
  if (entityNames.length > 1) {
    return { ok: false, reason: 'ambiguous', candidates: targets.map((entry) => entry.record) };
  }

  const entityName = entityNames[0];
  const moduleKey = MODULE_FOR_ENTITY[entityName];
  if (enabledModules && enabledModules[moduleKey] === false) {
    return { ok: false, reason: 'module_locked' };
  }

  const field = resolveEntityField(entityName, parsed.logicalField);
  if (!field) return { ok: false, reason: 'unsupported_field' };

  if (field === 'storage_location_id' && !resolveStorage(parsed.value, storageLocations)) {
    return { ok: false, reason: 'unknown_storage' };
  }

  const changeSets = targets.map((entry) => buildChangeSet(entry.record, field, parsed.value, storageLocations));
  const first = changeSets[0];
  if (!first || first.toRaw === first.fromRaw || first.to === first.from) {
    return { ok: false, reason: 'no_change', field, label: first?.label };
  }

  const names = targets.map((entry) => entry.record.name);

  return {
    ok: true,
    proposal: {
      actionType: 'record_change',
      entityName,
      moduleKey,
      recordId: targets[0].record.id,
      ids: targets.map((entry) => entry.record.id),
      recordName: names[0],
      recordNames: names,
      bulk: targets.length > 1,
      patch: { [field]: first.toRaw },
      changes: [{ field, label: first.label, from: first.from, to: first.to }],
      summary: targets.length > 1
        ? `Set ${first.label.toLowerCase()} on ${targets.length} ${entityName} records: ${names.slice(0, 4).join(', ')}${names.length > 4 ? '…' : ''}`
        : `Set ${first.label.toLowerCase()} on "${names[0]}" from ${first.from} to ${first.to}.`,
      undoable: true,
    },
  };
}

/**
 * Split a message that asks for several separate changes ("move X to Cellar B;
 * tag Y as estate") into one proposal each. Only explicit separators split, so a
 * record name containing "and" is never broken in two.
 */
export function splitChangeClauses(text) {
  return String(text || '')
    .split(/;|\n| and also | plus /i)
    .map((clause) => clause.trim())
    .filter(Boolean);
}

/**
 * One proposal per change clause. A single-clause message returns one entry, so
 * callers do not need to branch on whether the collector asked for one change or
 * several.
 */
export function buildChangeProposals({ text, collections, storageLocations, enabledModules } = {}) {
  const clauses = splitChangeClauses(text);

  if (clauses.length <= 1) {
    const single = buildChangeProposal({ text, collections, storageLocations, enabledModules });
    return single.ok ? [single] : [];
  }

  const built = [];
  for (const clause of clauses) {
    if (!detectRecordChangeRequest(clause)) continue;
    const result = buildChangeProposal({ text: clause, collections, storageLocations, enabledModules });
    if (result.ok) built.push(result);
  }
  return built;
}

/** Narrative preview shown above the confirmation card. */
export function formatChangePreview(proposal) {
  if (!proposal) return '';
  const lines = proposal.changes.map((change) =>
    `${change.label}: recorded as ${change.from} → proposed ${change.to}`
  );
  return `Here is the change I would make. Nothing is written until you confirm it.\n${lines.join('\n')}\n${proposal.bulk ? 'This applies to every matching record listed below.' : ''}`.trim();
}

export function formatAmbiguity(candidates = []) {
  const names = candidates.map((record) => `"${record.name}"`).filter(Boolean);
  if (names.length === 0) return '';
  return `I can make that change, but the name matches more than one record: ${names.join(', ')}. Tell me which one — the full name is enough — and I will show you the change before anything is written.`;
}

/** Lead-in for one proposal or a set of independent ones. */
export function formatProposalSet(proposals = []) {
  if (proposals.length === 0) return '';
  if (proposals.length === 1) return formatChangePreview(proposals[0]);
  const lines = proposals.map((proposal, index) => `${index + 1}. ${proposal.summary}`);
  return `I can make ${proposals.length} separate changes. Nothing is written until you accept them.\n${lines.join('\n')}\nEach one stands on its own — take the ones you want.`;
}