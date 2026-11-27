/* eslint-disable */
import { describe, it, expect } from 'vitest';
import {
  buildFindings,
  summarizeFindings,
  countAttentionFindings,
  findingKey,
  FINDING_TYPE_KEYS,
} from '@/lib/actions/collectionFindings';
import { buildExecutionPayload } from '@/lib/actions/actionModel';
import { ACTION_LABELS, applySelectedLabel } from '@/lib/actions/actionLabels';
import { indexFindingStates } from '@/lib/actions/findingState';

const pipe = (overrides = {}) => ({
  id: 'pipe-1',
  name: 'Savinelli 320',
  created_by: 'me@example.com',
  lifecycle_status: 'active',
  condition: 'Mint',
  ...overrides,
});

const blend = (overrides = {}) => ({
  id: 'blend-1',
  name: 'Escudo Navy De Luxe',
  created_by: 'me@example.com',
  lifecycle_status: 'active',
  condition: 'Excellent',
  purchase_date: '2024-01-02',
  blend_type: 'Virginia/Perique',
  ...overrides,
});

const location = (id, name, module) => ({ id, name, module, location_type: 'cabinet' });

describe('collection findings — storage', () => {
  it('offers the collector their own storage locations as alternatives', () => {
    const findings = buildFindings({
      collections: [{ moduleKey: 'pipekeeper', records: [pipe()] }],
      locations: [location('loc-1', 'Study cabinet', 'pipes'), location('loc-2', 'Cellar', 'tobacco')],
    });

    const storage = findings.find((entry) => entry.type === 'storage');
    expect(storage).toBeTruthy();
    expect(storage.key).toBe(findingKey('storage', 'Pipe', 'pipe-1'));
    expect(storage.actions).toHaveLength(1);

    const action = storage.actions[0];
    expect(action.type).toBe('storage_assign');
    expect(action.origin).toBe('collection_health');
    // Only locations that belong to this module are offered.
    expect(action.alternatives.map((entry) => entry.label)).toEqual(['Study cabinet']);
    expect(action.targets[0].patch).toEqual({ storage_location_id: 'loc-1' });
  });

  it('says nothing when the record already has storage', () => {
    const findings = buildFindings({
      collections: [{ moduleKey: 'pipekeeper', records: [pipe({ storage_location_id: 'loc-1' })] }],
      locations: [location('loc-1', 'Study cabinet', 'pipes')],
    });
    expect(findings.filter((entry) => entry.type === 'storage')).toHaveLength(0);
  });

  it('uses humidors and the humidor field for cigars', () => {
    const findings = buildFindings({
      collections: [{ moduleKey: 'cigarkeeper', records: [{ id: 'cigar-1', name: 'Padron 1964', lifecycle_status: 'active', condition: 'Mint' }] }],
      humidors: [{ id: 'hum-1', name: 'Desktop humidor', module: 'cigars' }],
    });
    const storage = findings.find((entry) => entry.type === 'storage');
    expect(storage.actions[0].targets[0].patch).toEqual({ humidor_id: 'hum-1' });
  });

  it('still reports the gap when there is nowhere to put the record yet', () => {
    const findings = buildFindings({
      collections: [{ moduleKey: 'pipekeeper', records: [pipe()] }],
      locations: [],
    });
    const storage = findings.find((entry) => entry.type === 'storage');
    expect(storage.actions).toHaveLength(0);
    expect(storage.links[0].to).toContain('/PipeDetail?id=pipe-1');
  });
});

describe('collection findings — classification', () => {
  it('offers a canonical correction for a non-standard blend type', () => {
    const findings = buildFindings({
      collections: [{ moduleKey: 'tobacco', records: [blend({ blend_type: 'VaPer' })] }],
    });
    const classification = findings.find((entry) => entry.type === 'classification');
    expect(classification).toBeTruthy();

    const action = classification.actions[0];
    expect(action.type).toBe('record_update');
    expect(action.targets[0].patch).toEqual({ blend_type: 'Virginia/Perique' });
    expect(action.targets[0].expected).toEqual({ blend_type: 'VaPer' });
  });

  it('does not treat a standard blend family as a finding', () => {
    const findings = buildFindings({
      collections: [{ moduleKey: 'tobacco', records: [blend()] }],
    });
    expect(findings.filter((entry) => entry.type === 'classification')).toHaveLength(0);
  });

  it('asks for the collector to choose when nothing is recorded', () => {
    const findings = buildFindings({
      collections: [{ moduleKey: 'tobacco', records: [blend({ blend_type: '' })] }],
    });
    const classification = findings.find((entry) => entry.type === 'classification');
    expect(classification.actions).toHaveLength(0);
    expect(classification.hint).toContain('blend type');
  });
});

describe('collection findings — documentation, valuation, condition', () => {
  it('reports missing documentation only when nothing at all is recorded', () => {
    const bare = buildFindings({
      collections: [{ moduleKey: 'pipekeeper', records: [pipe()] }],
    });
    expect(bare.some((entry) => entry.type === 'documentation')).toBe(true);

    const documented = buildFindings({
      collections: [{ moduleKey: 'pipekeeper', records: [pipe({ provenance_notes: 'Bought at the Chicago show' })] }],
    });
    expect(documented.some((entry) => entry.type === 'documentation')).toBe(false);
  });

  it('reports a cost with no valuation entry behind it', () => {
    const withoutValuation = buildFindings({
      collections: [{ moduleKey: 'pipekeeper', records: [pipe({ purchase_price: 240 })] }],
    });
    const valuation = withoutValuation.find((entry) => entry.type === 'valuation');
    expect(valuation).toBeTruthy();
    expect(valuation.actions).toHaveLength(0);

    const withValuation = buildFindings({
      collections: [{ moduleKey: 'pipekeeper', records: [pipe({ purchase_price: 240 })] }],
      valuations: [{ record_id: 'pipe-1', kind: 'acquisition_cost' }],
    });
    expect(withValuation.some((entry) => entry.type === 'valuation')).toBe(false);
  });

  it('flags condition only when it needs attention', () => {
    const poor = buildFindings({
      collections: [{ moduleKey: 'pipekeeper', records: [pipe({ condition: 'Poor' })] }],
    });
    expect(poor.some((entry) => entry.type === 'condition')).toBe(true);

    const fine = buildFindings({
      collections: [{ moduleKey: 'pipekeeper', records: [pipe({ condition: 'Excellent' })] }],
    });
    expect(fine.some((entry) => entry.type === 'condition')).toBe(false);
  });
});

describe('collection findings — duplicates and summaries', () => {
  it('points a duplicate group at the review that can merge it', () => {
    const findings = buildFindings({
      duplicateGroups: [
        { moduleKey: 'pipekeeper', entity: 'Pipe', signature: 'savinelli|320', label: 'Savinelli 320', count: 2 },
      ],
    });
    const duplicate = findings.find((entry) => entry.type === 'duplicate');
    expect(duplicate.title).toContain('2 records');
    expect(duplicate.links[0].to).toContain('/CollectionTools?tab=duplicates&module=Pipe');
    expect(duplicate.actions).toHaveLength(0);
  });

  it('counts findings by type and how many can be fixed in place', () => {
    const findings = buildFindings({
      collections: [{ moduleKey: 'pipekeeper', records: [pipe(), pipe({ id: 'pipe-2', name: 'Dunhill' })] }],
      locations: [location('loc-1', 'Study cabinet', 'pipes')],
    });
    const summary = summarizeFindings(findings);
    expect(summary.total).toBe(findings.length);
    expect(summary.byType.storage).toBe(2);
    expect(summary.actionable).toBe(2);
    for (const key of FINDING_TYPE_KEYS) expect(summary.byType).toHaveProperty(key);
  });

  it('skips archived and merged records entirely', () => {
    const findings = buildFindings({
      collections: [
        {
          moduleKey: 'pipekeeper',
          records: [
            pipe({ id: 'a', is_archived: true }),
            pipe({ id: 'b', merged_into_id: 'x' }),
            pipe({ id: 'c', lifecycle_status: 'sold' }),
          ],
        },
      ],
      locations: [location('loc-1', 'Study cabinet', 'pipes')],
    });
    expect(findings).toHaveLength(0);
    expect(countAttentionFindings([{ moduleKey: 'pipekeeper', records: [pipe()] }])).toBeGreaterThan(0);
  });
});

describe('findings use the shared executor payload', () => {
  it('sends the chosen alternative, not the first one', () => {
    const findings = buildFindings({
      collections: [{ moduleKey: 'pipekeeper', records: [pipe()] }],
      locations: [location('loc-1', 'Study cabinet', 'pipes'), location('loc-2', 'Living room rack', 'pipes')],
    });
    const action = findings.find((entry) => entry.type === 'storage').actions[0];

    const payload = buildExecutionPayload([action], {
      selections: { [action.id]: true },
      alternatives: { [action.id]: 'storage_loc-2' },
      idempotencyKey: 'test-key',
    });

    expect(payload.actions).toHaveLength(1);
    expect(payload.actions[0].type).toBe('storage_assign');
    expect(payload.actions[0].targets[0].patch).toEqual({ storage_location_id: 'loc-2' });
    expect(payload.actions[0].origin).toBe('collection_health');
  });
});

describe('shared action vocabulary', () => {
  it('uses one word per operation', () => {
    expect(ACTION_LABELS.viewRecords).toBe('View records');
    expect(ACTION_LABELS.explain).toBe('Explain');
    expect(ACTION_LABELS.reviewChanges).toBe('Review changes');
    expect(ACTION_LABELS.accept).toBe('Accept');
    expect(ACTION_LABELS.applySelected).toBe('Apply selected');
    expect(ACTION_LABELS.cancel).toBe('Cancel');
    expect(ACTION_LABELS.undo).toBe('Undo');
    expect(ACTION_LABELS.done).toBe('Done');
    expect(applySelectedLabel(3)).toBe('Apply selected (3)');
  });
});

describe('finding decisions', () => {
  it('indexes the collector’s decisions by finding key', () => {
    const states = indexFindingStates([
      { id: 'row-1', finding_key: 'storage:Pipe:p1', status: 'deferred', note: '' },
      { id: 'row-2', finding_key: 'documentation:Wine:w1', status: 'resolved', resolved_at: '2026-11-27T10:00:00Z' },
    ]);
    expect(states['storage:Pipe:p1']).toMatchObject({ id: 'row-1', status: 'deferred' });
    expect(states['documentation:Wine:w1'].status).toBe('resolved');
  });
});