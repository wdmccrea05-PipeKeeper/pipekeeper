import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import {
  buildActionFromProposal,
  buildActionsFromProposals,
  buildDrinkingWindowActions,
  buildSpecializationActions,
  initialActionState,
  storageAlternatives,
  withCustomValue,
  CURATOR_ORIGIN,
} from '../lib/curator/curatorActionPresenter.js';
import { parseOrdinal, resolveActionReference } from '../lib/curator/curatorActionReferences.js';
import {
  buildChangeProposals,
  formatProposalSet,
} from '../lib/curator/curatorRecordChanges.js';
import { buildSpecializationReview } from '../lib/curator/specializationReview.js';
import { buildExecutionPayload } from '../lib/actions/actionModel.js';
import { getActionType } from '../lib/actions/actionRegistry.js';

const read = (path) => fs.readFileSync(path, 'utf8');

const storageLocations = [
  { id: 's1', name: 'Cellar A', module: 'wine' },
  { id: 's2', name: 'Cellar B', module: 'wine' },
  { id: 's3', name: 'Pipe Cabinet', module: 'pipes' },
];

const collections = {
  Bottle: [
    { id: 'b1', name: 'Lagavulin 16', storage_location_id: 's1', created_by: 'me@example.com' },
    { id: 'b2', name: 'Talisker 10', storage_location_id: 's1', created_by: 'me@example.com' },
  ],
  Pipe: [
    { id: 'p1', name: 'Dunhill Shell', focus: ['Virginia'], tags: [], created_by: 'me@example.com' },
    { id: 'p2', name: 'Dunhill Root', focus: [], tags: [], created_by: 'me@example.com' },
  ],
  Wine: [
    { id: 'w1', name: 'Barolo 2016', vintage: 2016, style: 'red', varietal: 'Nebbiolo', created_by: 'me@example.com' },
  ],
};

function proposalFor(text, modules = { pipekeeper: true, whiskeykeeper: true, winekeeper: true }) {
  const batch = buildChangeProposals({ text, collections, storageLocations, enabledModules: modules });
  return batch[0]?.proposal || null;
}

function specializationFixture() {
  const pipe = { id: 'p1', name: 'Dunhill Shell', focus: ['Virginia'], shape: 'Billiard', bowl_material: 'Briar' };
  const blends = [
    { id: 'bl1', name: 'Nightcap', blend_type: 'English' },
    { id: 'bl2', name: '1-Q', blend_type: 'Aromatic' },
    { id: 'bl3', name: 'Haunted Bookshop', blend_type: 'Burley' },
  ];
  const smokingLogs = Array.from({ length: 5 }).map((_, index) => ({
    id: `l${index}`,
    pipe_id: 'p1',
    blend_id: 'bl1',
  }));
  return buildSpecializationReview({ pipe, smokingLogs, blends });
}

describe('Curator → Universal Action Framework: proposals become actions', () => {
  it('turns a storage request into a storage_assign action with the recorded value', () => {
    const proposal = proposalFor('move my Lagavulin 16 to Cellar B');
    const action = buildActionFromProposal(proposal, { storageLocations });

    expect(action.type).toBe('storage_assign');
    expect(action.origin).toBe(CURATOR_ORIGIN);
    expect(action.module).toBe('whiskeykeeper');
    expect(action.targets[0].expected).toEqual({ storage_location_id: 's1' });
    expect(action.targets[0].patch).toEqual({ storage_location_id: 's2' });
    // The location the record already sits in is not offered as an option.
    expect(action.alternatives.map((entry) => entry.label)).not.toContain('Cellar A');
    expect(action.alternatives.map((entry) => entry.label)).toContain('Cellar B');
  });

  it('does not invent options when the collector has nowhere else recorded', () => {
    expect(storageAlternatives('Bottle', 's1', [storageLocations[0]])).toEqual([]);
  });

  it("scopes storage options to the record's own module", () => {
    const options = storageAlternatives('Pipe', null, storageLocations);
    expect(options.map((entry) => entry.label)).toEqual(['Pipe Cabinet']);
  });

  it('marks a merge as needing explicit confirmation and as not reversible', () => {
    const proposal = proposalFor('merge my Dunhill Shell into my Dunhill Root');
    const action = buildActionFromProposal(proposal);

    expect(action.type).toBe('record_merge');
    expect(action.confirmation).toBe('explicit');
    expect(action.highImpact).toBe(true);
    expect(action.undoEligible).toBe(false);
    expect(action.defaultSelected).toBe(false);
    expect(action.targets.map((target) => target.role)).toEqual(['survivor', 'source']);
  });

  it('never claims a single stale value for a bulk edit', () => {
    const action = buildActionFromProposal({
      actionType: 'record_change',
      entityName: 'Bottle',
      moduleKey: 'whiskeykeeper',
      ids: ['b1', 'b2'],
      recordNames: ['Lagavulin 16', 'Talisker 10'],
      patch: { tags: ['estate'] },
      changes: [{ field: 'tags', label: 'Tags', from: '', to: 'estate', fromRaw: [] }],
    });

    expect(action.targets).toHaveLength(2);
    expect(action.targets.every((target) => target.expected === null)).toBe(true);
  });

  it('offers a typed value only for fields a collector can reasonably write', () => {
    const tagsAction = buildActionFromProposal(proposalFor('tag my Dunhill Shell as estate'));
    expect(tagsAction.customField).toBe('tags');

    const storageAction = buildActionFromProposal(proposalFor('move my Lagavulin 16 to Cellar B'), { storageLocations });
    expect(storageAction.customField).toBeNull();
  });
});

describe('Curator → Universal Action Framework: several grounded options', () => {
  it("presents the specialization review's own candidates and preselects its recommendation", () => {
    const review = specializationFixture();
    const pipe = { id: 'p1', name: 'Dunhill Shell', focus: ['Virginia'] };
    const [action] = buildSpecializationActions({ pipe, review });

    expect(review.alternatives.length).toBeGreaterThan(1);
    expect(action.type).toBe('record_update');
    expect(action.targets[0].expected).toEqual({ focus: ['Virginia'] });
    expect(action.alternatives.length).toBe(review.alternatives.length);

    const recommended = action.alternatives.find((entry) => entry.recommended);
    expect(recommended).toBeTruthy();
    expect(recommended.patch).toEqual({ focus: [recommended.label] });
    expect(action.targets[0].patch).toEqual(recommended.patch);

    const state = initialActionState([action]);
    expect(state.actionAlternatives[action.id]).toBe(recommended.id);
  });

  it('estimates drinking windows as one action covering every estimable wine', () => {
    const fix = {
      items: [
        {
          recordId: 'w1',
          recordName: 'Barolo 2016',
          proposedChange: { payload: { drink_window_start: '2024-01-01', drink_window_end: '2030-12-31' } },
        },
      ],
    };
    const [action] = buildDrinkingWindowActions(fix, collections.Wine);

    expect(action.type).toBe('record_update');
    expect(action.module).toBe('winekeeper');
    expect(action.targets[0].expected).toEqual({ drink_window_start: null, drink_window_end: null });
    expect(action.targets[0].patch).toEqual({ drink_window_start: '2024-01-01', drink_window_end: '2030-12-31' });
    expect(buildDrinkingWindowActions(null, [])).toEqual([]);
  });

  it('keeps existing tags when the collector types their own', () => {
    const action = {
      id: 'a1',
      customField: 'tags',
      currentValues: [{ label: 'Tags', from: 'cellar, 2019', to: 'estate' }],
      proposedValues: [{ label: 'Tags', from: 'cellar, 2019', to: 'estate' }],
      targets: [{ entity: 'Pipe', recordId: 'p1', patch: { tags: ['estate'] } }],
    };
    const updated = withCustomValue(action, 'gift, estate');

    expect(updated.targets[0].patch.tags).toEqual(['cellar', '2019', 'gift', 'estate']);
    expect(updated.proposedValues[0].to).toBe('cellar, 2019, gift, estate');
    // An empty entry changes nothing.
    expect(withCustomValue(action, '   ')).toBe(action);
  });
});

describe('Curator → Universal Action Framework: conversational references', () => {
  const review = specializationFixture();
  const [specialization] = buildSpecializationActions({
    pipe: { id: 'p1', name: 'Dunhill Shell', focus: ['Virginia'] },
    review,
  });

  const storageAction = buildActionFromProposal(proposalFor('move my Lagavulin 16 to Cellar B'), { storageLocations });
  const tagsAction = buildActionFromProposal(proposalFor('tag my Dunhill Shell as estate'));

  it('reads ordinals in words and digits', () => {
    expect(parseOrdinal('apply the second option')).toBe(2);
    expect(parseOrdinal('option 3')).toBe(3);
    expect(parseOrdinal('the 3rd one')).toBe(3);
    expect(parseOrdinal('apply it')).toBeNull();
  });

  it('resolves "explain the third option" to that option of the card', () => {
    const result = resolveActionReference('explain the third option', { actions: [specialization] });

    expect(result.kind).toBe('explain');
    expect(result.alternativeId).toBe(specialization.alternatives[2].id);
    expect(result.message).toContain(specialization.alternatives[2].label);
  });

  it('resolves "apply the second option" to that option and selects it', () => {
    const result = resolveActionReference('apply the second option', { actions: [specialization] });

    expect(result.kind).toBe('apply');
    expect(result.alternativeId).toBe(specialization.alternatives[1].id);
    expect(result.selections[specialization.id]).toBe(true);
  });

  it('resolves "keep the existing classification" without changing anything', () => {
    const blendAction = buildActionFromProposal({
      actionType: 'record_change',
      entityName: 'TobaccoBlend',
      moduleKey: 'pipekeeper',
      ids: ['bl1'],
      recordNames: ['Nightcap'],
      patch: { blend_type: 'English' },
      changes: [{ field: 'blend_type', label: 'Blend classification', from: 'Aromatic', to: 'English', fromRaw: 'Aromatic' }],
    });

    const result = resolveActionReference('keep the existing classification', {
      actions: [tagsAction, blendAction],
      selections: { [tagsAction.id]: true, [blendAction.id]: true },
    });

    expect(result.kind).toBe('reject');
    expect(result.selections[blendAction.id]).toBe(false);
    expect(result.selections[tagsAction.id]).toBe(true);
    expect(result.message).toContain('Nothing was changed');
  });

  it('resolves "apply everything except the storage change"', () => {
    const result = resolveActionReference('apply everything except the storage change', {
      actions: [storageAction, tagsAction],
      selections: { [storageAction.id]: true, [tagsAction.id]: true },
    });

    expect(result.kind).toBe('apply');
    expect(result.selections[storageAction.id]).toBe(false);
    expect(result.selections[tagsAction.id]).toBe(true);
  });

  it('names the affected records when asked', () => {
    const result = resolveActionReference('show me the affected records', { actions: [storageAction] });

    expect(result.kind).toBe('records');
    expect(result.message).toContain('Lagavulin 16');
  });

  it('routes an undo request', () => {
    expect(resolveActionReference('undo the last change', { actions: [tagsAction] }).kind).toBe('undo');
  });

  it('asks instead of guessing when "apply it" could mean several changes', () => {
    const result = resolveActionReference('apply it', { actions: [storageAction, tagsAction] });

    expect(result.kind).toBe('clarify');
    expect(result.message).toContain('Should I apply all of them');
  });

  it('asks when a word fits more than one change', () => {
    const secondTags = buildActionFromProposal({
      actionType: 'record_change',
      entityName: 'Pipe',
      moduleKey: 'pipekeeper',
      ids: ['p2'],
      recordNames: ['Dunhill Root'],
      patch: { tags: ['estate'] },
      changes: [{ field: 'tags', label: 'Tags', from: '', to: 'estate', fromRaw: [] }],
    });

    const result = resolveActionReference('keep the existing tags', { actions: [tagsAction, secondTags] });
    expect(result.kind).toBe('clarify');
  });

  it('asks when an ordinal is out of range', () => {
    const result = resolveActionReference('apply the fifth option', { actions: [specialization] });
    expect(result.kind).toBe('clarify');
  });

  it('leaves an ordinary question alone', () => {
    expect(resolveActionReference('what should I smoke tonight?', { actions: [tagsAction] }).kind).toBe('none');
    expect(resolveActionReference('apply the second option', { actions: [] }).kind).toBe('none');
  });
});

describe('Curator → Universal Action Framework: execution and safety', () => {
  it('sends only the accepted actions, never the rejected ones', () => {
    const storageAction = buildActionFromProposal(proposalFor('move my Lagavulin 16 to Cellar B'), { storageLocations });
    const tagsAction = buildActionFromProposal(proposalFor('tag my Dunhill Shell as estate'));

    const payload = buildExecutionPayload([storageAction, tagsAction], {
      selections: { [storageAction.id]: true, [tagsAction.id]: false },
      idempotencyKey: 'k',
    });

    expect(payload.actions).toHaveLength(1);
    expect(payload.actions[0].type).toBe('storage_assign');
    expect(payload.idempotency_key).toBe('k');
  });

  it('builds only registered action types, each with its own confirmation level', () => {
    const actions = buildActionsFromProposals([
      proposalFor('move my Lagavulin 16 to Cellar B'),
      proposalFor('merge my Dunhill Shell into my Dunhill Root'),
      proposalFor('tag my Dunhill Shell as estate'),
    ], { storageLocations });

    expect(actions.length).toBe(3);
    for (const action of actions) {
      expect(getActionType(action.type)).toBeTruthy();
      expect(['immediate', 'review', 'explicit']).toContain(action.confirmation);
      expect(action.origin).toBe(CURATOR_ORIGIN);
    }
  });

  it('splits a message asking for several changes into independent actions', () => {
    const batch = buildChangeProposals({
      text: 'move my Lagavulin 16 to Cellar B; tag my Dunhill Shell as estate',
      collections,
      storageLocations,
      enabledModules: { pipekeeper: true, whiskeykeeper: true },
    });

    expect(batch).toHaveLength(2);
    expect(formatProposalSet(batch.map((entry) => entry.proposal))).toContain('2 separate changes');
  });

  it('keeps Curator on the shared executor with one idempotency key per message', () => {
    const hook = read('src/components/curator/useCuratorRecordProposals.js');
    expect(hook).toContain('executeActions');
    expect(hook).toContain('undoActionExecution');
    expect(hook).toContain('curator_${message.id}');
    expect(hook).not.toContain('curatorRecordChange');
    expect(hook).not.toContain('entities.Pipe.update');
  });

  it('presents actions in the conversation through the shared action components', () => {
    const chat = read('src/components/agent/ExpertTobacconistChat.jsx');
    expect(chat).toContain('CuratorActionSet');
    expect(chat).toContain('resolveActionReference');
    expect(chat).toContain('buildActionsFromProposals');
    expect(chat).not.toContain('CuratorChangeProposalCard');
    expect(chat).not.toContain('applySpecializationChange');
    expect(chat).not.toContain('applySuggestedFix');

    const set = read('src/components/curator/CuratorActionSet.jsx');
    expect(set).toContain('ActionCard');
    expect(set).toContain('ActionReviewDialog');
    expect(set).toContain('ActionResultSummary');
  });
});