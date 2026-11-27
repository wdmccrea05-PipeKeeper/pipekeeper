/* eslint-disable */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import {
  detectRecordChangeRequest,
  detectUndoRequest,
  parseChangeRequest,
  resolveEntityField,
  resolveRecordFromPhrase,
  buildChangeProposal,
  formatAmbiguity,
  formatChangePreview,
} from '../lib/curator/curatorRecordChanges.js';
import {
  BOUNDARY_REFUSAL,
  analyseDocumentationGaps,
  buildConversationalReport,
  buildGroundingBlock,
  buildHistoryBlock,
  detectPurchaseBoundaryRequest,
  detectReportRequest,
} from '../lib/curator/curatorGrounding.js';
import { routeCuratorRequest } from '../lib/curator/curatorRequestRouter.js';
import {
  describeCuratorFailure,
  extractCuratorReply,
  invokeCuratorWithTimeout,
} from '../lib/curator/curatorInvocation.js';
import { buildCuratorContextWithLogging } from '../lib/curator/buildCuratorContext.js';
import {
  isPipeSpecializationQuery,
  resolveSpecializationPipe,
} from '../lib/curator/curatorDeterministicChat.js';

const REPO_ROOT = globalThis.process?.cwd?.() || '';

function readSource(relativePath) {
  const file = path.resolve(REPO_ROOT, relativePath);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

const pipes = [
  { id: 'p1', name: 'Dunhill Root', created_by: 'collector@example.com', tags: [], maker: 'Dunhill' },
  { id: 'p2', name: 'Dunhill Shell', created_by: 'collector@example.com', tags: ['estate'] },
];
const bottles = [
  { id: 'b1', name: 'Lagavulin 16', created_by: 'collector@example.com', storage_location_id: null },
];
const storageLocations = [
  { id: 's1', name: 'Cellar B', created_by: 'collector@example.com' },
];

const collections = { Pipe: pipes, Bottle: bottles };

describe('Curator — specialization questions', () => {
  it('recognises specialization intent in natural phrasing', () => {
    expect(isPipeSpecializationQuery('should I dedicate this pipe to Virginia flake?')).toBe(true);
    expect(isPipeSpecializationQuery('what could I reassign this pipe to?')).toBe(true);
    expect(isPipeSpecializationQuery('what should I smoke tonight?')).toBe(false);
  });

  it('resolves the named pipe and keeps it as the subject', () => {
    const resolved = resolveSpecializationPipe('should I re-specialize my Dunhill Root?', pipes);
    expect(resolved?.id).toBe('p1');
  });

  it('does not substitute another pipe when the reference is ambiguous', () => {
    const resolved = resolveSpecializationPipe('should I re-specialize my Dunhill?', pipes);
    expect(resolved).toBeNull();
  });
});

describe('Curator — historical conversational context', () => {
  const history = Array.from({ length: 10 }, (_, index) => ({
    role: index % 2 === 0 ? 'user' : 'assistant',
    content: `turn ${index}`,
  }));

  it('carries the recent turns into the prompt, oldest first', () => {
    const block = buildHistoryBlock(history, 8);
    expect(block).toContain('CONVERSATION SO FAR');
    expect(block).toContain('turn 9');
    expect(block).toContain('turn 2');
  });

  it('returns nothing when there is no history yet', () => {
    expect(buildHistoryBlock([])).toBe('');
  });

  it('persists and restores the thread through the backend', () => {
    const chat = readSource('src/components/agent/ExpertTobacconistChat.jsx');
    // Optional chaining is used at the persist call site, so match the call
    // shape rather than one exact spelling.
    expect(chat).toMatch(/functions\??\.invoke\??\(\s*['"]curatorConversationHistory['"]/);
    expect(chat).toMatch(/functions\??\.invoke\??\(\s*['"]persistCuratorMessage['"]/);
    expect(chat).toContain('ck_curator_thread');
  });

  it('scopes restored history to the signed-in collector', () => {
    const source = readSource('base44/functions/curatorConversationHistory/entry.ts');
    expect(source).toContain('user_email: user.email');
    expect(source).toContain('auth.me()');
  });
});

describe('Curator — named item resolution', () => {
  it('matches a full record name', () => {
    const { match, candidates } = resolveRecordFromPhrase('Dunhill Root', pipes);
    expect(match?.id).toBe('p1');
    expect(candidates).toHaveLength(0);
  });

  it('returns candidates instead of guessing when a name is ambiguous', () => {
    const { match, candidates } = resolveRecordFromPhrase('Dunhill', pipes);
    expect(match).toBeNull();
    expect(candidates.map((record) => record.id).sort()).toEqual(['p1', 'p2']);
    expect(formatAmbiguity(candidates)).toContain('matches more than one record');
  });
});

describe('Curator — record change proposals', () => {
  it('recognises change requests and ignores questions about records', () => {
    expect(detectRecordChangeRequest('tag my Dunhill Root as estate')).toBe(true);
    expect(detectRecordChangeRequest('move my Lagavulin 16 to Cellar B')).toBe(true);
    expect(detectRecordChangeRequest('what tags does my Dunhill Root have?')).toBe(false);
    expect(detectRecordChangeRequest('what should I smoke tonight?')).toBe(false);
  });

  it('parses tags, storage, specialization and notes', () => {
    expect(parseChangeRequest('tag my Dunhill Root as estate')).toMatchObject({
      logicalField: 'tags',
      recordPhrase: 'Dunhill Root',
      value: ['estate'],
    });
    expect(parseChangeRequest('move my Lagavulin 16 to Cellar B')).toMatchObject({
      logicalField: 'storage',
      recordPhrase: 'Lagavulin 16',
      value: 'Cellar B',
    });
    expect(parseChangeRequest('set the specialization of my Dunhill Root to Virginia')).toMatchObject({
      logicalField: 'specialization',
      recordPhrase: 'Dunhill Root',
      value: 'Virginia',
    });
    expect(parseChangeRequest('add a note to my Dunhill Root: smokes best with Virginia')).toMatchObject({
      logicalField: 'notes',
      recordPhrase: 'Dunhill Root',
    });
  });

  it('maps a logical field onto the right field per module', () => {
    expect(resolveEntityField('Pipe', 'specialization')).toBe('focus');
    expect(resolveEntityField('TobaccoBlend', 'classification')).toBe('blend_type');
    expect(resolveEntityField('Cigar', 'notes')).toBe('personal_notes');
    expect(resolveEntityField('Wine', 'notes')).toBe('notes');
    expect(resolveEntityField('Cigar', 'specialization')).toBeNull();
  });

  it('builds a preview with the recorded value beside the proposed one', () => {
    const result = buildChangeProposal({
      text: 'move my Lagavulin 16 to Cellar B',
      collections,
      storageLocations,
      enabledModules: { whiskeykeeper: true },
    });

    expect(result.ok).toBe(true);
    expect(result.proposal.entityName).toBe('Bottle');
    expect(result.proposal.patch).toEqual({ storage_location_id: 's1' });
    expect(result.proposal.changes[0]).toMatchObject({ field: 'storage_location_id', to: 'Cellar B' });
    expect(result.proposal.undoable).toBe(true);
    expect(formatChangePreview(result.proposal)).toContain('Nothing is written until you confirm it');
  });

  it('refuses to propose a change it cannot ground in a record', () => {
    const result = buildChangeProposal({
      text: 'tag my Nonexistent Blend as rare',
      collections,
      storageLocations,
      enabledModules: { pipekeeper: true },
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('no_match');
  });

  it('refuses a storage location the collector has not recorded', () => {
    const result = buildChangeProposal({
      text: 'move my Lagavulin 16 to Cellar Z',
      collections,
      storageLocations,
      enabledModules: { whiskeykeeper: true },
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('unknown_storage');
  });

  it('reports when the record already matches the request', () => {
    const result = buildChangeProposal({
      text: 'tag my Dunhill Shell as estate',
      collections,
      storageLocations,
      enabledModules: { pipekeeper: true },
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('no_change');
  });

  it('proposes a duplicate merge only between records of the same module', () => {
    const merged = buildChangeProposal({
      text: 'merge my Dunhill Shell into my Dunhill Root',
      collections,
      storageLocations,
      enabledModules: { pipekeeper: true },
    });
    expect(merged.ok).toBe(true);
    expect(merged.proposal.actionType).toBe('merge');
    expect(merged.proposal.targetId).toBe('p1');
    expect(merged.proposal.sourceIds).toEqual(['p2']);
    expect(merged.proposal.undoable).toBe(false);

    const mismatched = buildChangeProposal({
      text: 'merge my Dunhill Shell into my Lagavulin 16',
      collections,
      storageLocations,
      enabledModules: { pipekeeper: true, whiskeykeeper: true },
    });
    expect(mismatched.ok).toBe(false);
    expect(mismatched.reason).toBe('merge_entity_mismatch');
  });
});

describe('Curator — authorization and server-side enforcement', () => {
  it('allows only documentation, classification, storage and tag fields', () => {
    const shared = readSource('base44/shared/curatorRecordChanges.ts');
    expect(shared).toContain('CURATOR_EXTRA_FIELDS');
    expect(shared).toContain("Pipe: ['storage_location_id', 'focus', 'condition', 'notes', 'maker', 'year_made']");
    expect(shared).toContain("Cigar: ['storage_location_id', 'humidor_id', 'condition', 'personal_notes', 'brand']");
    // Valuation and quantity fields must never be Curator-writable.
    expect(shared).not.toContain("'ai_estimated_value'");
    expect(shared).not.toContain("'estimated_value'");
    expect(shared).not.toContain("'quantity'");
  });

  it('re-reads ownership, allowlist and history on the server', () => {
    const source = readSource('base44/functions/curatorRecordChange/entry.ts');
    expect(source).toContain('auth.me()');
    expect(source).toContain('isAuthorizedForRecord');
    expect(source).toContain('sanitiseCuratorPatch');
    expect(source).toContain('CollectionActivity');
    expect(source).toContain('CuratorActionApplyResult');
    expect(source).toContain('planUndo');
    expect(source).toContain("status: 403");
  });

  it('keeps the ownership rule itself owner-or-admin', () => {
    const records = readSource('base44/shared/collectionRecords.ts');
    expect(records).toContain("if (user.role === 'admin') return true");
    expect(records).toContain('record.created_by_id === user.id');
  });

  it('records every applied change for the record history', () => {
    const source = readSource('base44/functions/curatorRecordChange/entry.ts');
    expect(source).toContain('changed_fields: fields');
    expect(source).toContain('actor_email: user.email');
    expect(source).toContain("event_type: fields.length > 1 || ids.length > 1 ? 'bulk_updated' : 'updated'");
  });
});

describe('Curator — undo', () => {
  it('detects an undo request and never mistakes it for a new change', () => {
    expect(detectUndoRequest('undo that change')).toBe(true);
    expect(detectRecordChangeRequest('undo that change')).toBe(false);
    expect(routeCuratorRequest({ text: 'revert that', collections }).kind).toBe('undo');
  });

  it('only restores values that still match what was applied', () => {
    const shared = readSource('base44/shared/curatorRecordChanges.ts');
    expect(shared).toContain('export function planUndo');
    expect(shared).toContain('blocked.push(field)');
    const fn = readSource('base44/functions/curatorRecordChange/entry.ts');
    expect(fn).toContain("reason: blocked.length ? 'changed_since_apply' : 'nothing_to_restore'");
  });

  it('refuses a second undo of the same run', () => {
    const fn = readSource('base44/functions/curatorRecordChange/entry.ts');
    expect(fn).toContain('already been undone');
  });
});

describe('Curator — routing, cancellation and boundaries', () => {
  it('routes a change request to a proposal and a plain question to the model', () => {
    expect(routeCuratorRequest({
      text: 'tag my Dunhill Root as estate',
      collections,
      storageLocations,
      enabledModules: { pipekeeper: true },
    }).kind).toBe('proposal');

    expect(routeCuratorRequest({ text: 'why is this pipe so wet?', collections }).kind).toBe('none');
  });

  it('explains a module that is not enabled instead of changing it', () => {
    const routed = routeCuratorRequest({
      text: 'tag my Dunhill Root as estate',
      collections,
      storageLocations,
      enabledModules: { pipekeeper: false },
    });
    expect(routed.kind).toBe('message');
    expect(routed.content).toContain('not enabled on this account');
  });

  it('asks which record when the name is ambiguous', () => {
    const routed = routeCuratorRequest({
      text: 'tag my Dunhill as estate',
      collections,
      storageLocations,
      enabledModules: { pipekeeper: true },
    });
    expect(routed.kind).toBe('message');
    expect(routed.content).toContain('more than one record');
  });

  it('never offers a purchase, retailer or restock answer', () => {
    expect(detectPurchaseBoundaryRequest('where can I buy another tin?')).toBeTruthy();
    const routed = routeCuratorRequest({ text: 'what should I restock?', collections });
    expect(routed.kind).toBe('message');
    expect(routed.content).toBe(BOUNDARY_REFUSAL);
    expect(routed.content).toContain('will not point you at a retailer');
  });

  it('describes the cancel path without writing anything', () => {
    const card = readSource('src/components/curator/CuratorChangeProposalCard.jsx');
    expect(card).toContain('Cancel');
    expect(card).toContain('Nothing was written');
    const hook = readSource('src/components/curator/useCuratorRecordProposals.js');
    expect(hook).toContain('cancelProposal');
    expect(hook).toContain("proposalState: 'cancelled'");
    const cancelBlock = hook.slice(hook.indexOf('const cancelProposal'), hook.indexOf('const runUndo'));
    expect(cancelBlock).not.toContain('functions.invoke');
  });

  it('reports a failed apply as a failure, never as success', () => {
    const hook = readSource('src/components/curator/useCuratorRecordProposals.js');
    expect(hook).toContain("proposalState: 'failed'");
    expect(hook).toContain('No record was changed');
    const card = readSource('src/components/curator/CuratorChangeProposalCard.jsx');
    expect(card).toContain('Your record is unchanged');
  });
});

describe('Curator — grounding in records', () => {
  const context = {
    pipes: [{ id: 'p1', name: 'Dunhill Root', tags: ['estate'] }],
    bottles: [{ id: 'b1', name: 'Lagavulin 16', purchase_price: 90, estimated_value: 140 }],
  };

  it('reports documentation gaps per module', () => {
    const { modules, inconsistent } = analyseDocumentationGaps(context);
    const pipeModule = modules.find((entry) => entry.moduleKey === 'pipes');
    expect(pipeModule.total).toBe(1);
    expect(pipeModule.gaps.join(' ')).toContain('acquisition date 0/1');
    expect(inconsistent[0]).toContain('no storage or condition recorded');
  });

  it('tells the model to separate facts, interpretations and uncertainty', () => {
    const block = buildGroundingBlock(context, {});
    expect(block).toContain('RECORD GROUNDING');
    expect(block).toContain('Attribute recorded facts to the record');
    expect(block).toContain('Name uncertainty and its cause');
    expect(block).toContain('Valuation coverage');
  });

  it('carries previous decisions into the next turn', () => {
    const block = buildGroundingBlock(context, {
      rejectedItems: [{ name: 'Boswell Jumbo', reason: 'too bulky' }],
      appliedChanges: [{ name: 'Dunhill Root', fields: ['Tags'] }],
    });
    expect(block).toContain('rejected Boswell Jumbo (too bulky)');
    expect(block).toContain('approved a change to Dunhill Root: Tags');
  });

  it('says plainly when nothing is loaded instead of inventing records', () => {
    expect(buildGroundingBlock({}, {})).toContain('no collection records loaded');
  });

  it('keeps modules the collector has not enabled out of the context', async () => {
    const gated = await buildCuratorContextWithLogging(
      { email: 'collector@example.com' },
      async () => ({ pipes: [{ id: 'p1' }], bottles: [{ id: 'b1' }], wines: [{ id: 'w1' }] }),
      { pipekeeper: false, whiskeykeeper: true, winekeeper: false }
    );
    expect(gated.pipes).toEqual([]);
    expect(gated.wines).toEqual([]);
    expect(gated.bottles).toHaveLength(1);
  });

  it('feeds the grounding block and conversation history into the prompt', () => {
    const chat = readSource('src/components/agent/ExpertTobacconistChat.jsx');
    expect(chat).toContain('${buildGroundingBlock(context, entityContext)}');
  });
});

describe('Curator — conversational reports', () => {
  it('recognises a report request and points at the printable area', () => {
    expect(detectReportRequest('build me a valuation report')).toMatchObject({ route: '/ValuationCenter' });
    expect(detectReportRequest('I need a collection report')).toMatchObject({ route: '/CollectionReports' });
    expect(detectReportRequest('what should I smoke tonight?')).toBeNull();
  });

  it('summarises the records behind the report instead of inventing figures', () => {
    const summary = buildConversationalReport(
      { pipes: [{ id: 'p1', name: 'Dunhill Root' }], bottles: [{ id: 'b1', name: 'Lagavulin 16' }] },
      { title: 'Collection report' }
    );
    expect(summary).toContain('1 in PipeKeeper');
    expect(summary).toContain('1 in WhiskeyKeeper');
    expect(summary).toContain('documentation gaps');
    expect(summary).toContain('printable version');
  });

  it('routes the request through the chat as a message with a report link', () => {
    const routed = routeCuratorRequest({
      text: 'build me a collection report',
      collections,
      context: { pipes },
    });
    expect(routed.kind).toBe('message');
    expect(routed.report?.route).toBe('/CollectionReports');
  });
});

describe('Curator — timeout handling', () => {
  it('returns the reply when the model answers', async () => {
    const result = await invokeCuratorWithTimeout({
      prompt: 'hello',
      invoke: async () => ({ data: { result: 'A considered answer.' } }),
    });
    expect(result).toMatchObject({ ok: true, text: 'A considered answer.', timedOut: false });
  });

  it('gives up instead of hanging when the backend never responds', async () => {
    const result = await invokeCuratorWithTimeout({
      prompt: 'hello',
      timeoutMs: 10,
      invoke: () => new Promise(() => {}),
    });
    expect(result.ok).toBe(false);
    expect(result.timedOut).toBe(true);
    expect(describeCuratorFailure(result)).toContain('stopped waiting');
  });

  it('surfaces an error and an empty response without throwing', async () => {
    const failed = await invokeCuratorWithTimeout({
      prompt: 'hello',
      invoke: async () => { throw new Error('upstream down'); },
    });
    expect(failed).toMatchObject({ ok: false, timedOut: false, error: 'upstream down' });

    const empty = await invokeCuratorWithTimeout({
      prompt: 'hello',
      invoke: async () => ({ data: { result: '   ' } }),
    });
    expect(empty).toMatchObject({ ok: false, error: 'Empty response' });
  });

  it('reads every reply shape the function can return', () => {
    expect(extractCuratorReply({ data: 'plain' })).toBe('plain');
    expect(extractCuratorReply({ data: { result: 'nested' } })).toBe('nested');
    expect(extractCuratorReply({ data: { content: { text: 'deeper' } } })).toBe('deeper');
    expect(extractCuratorReply(null)).toBe('');
  });

  it('always clears its timer so the chat never waits forever', async () => {
    const result = await invokeCuratorWithTimeout({
      prompt: 'hello',
      timeoutMs: 5000,
      invoke: async () => ({ data: { result: 'quick' } }),
    });
    expect(result.ok).toBe(true);
    expect(result.durationMs).toBeLessThan(1000);
  });
});

describe('Curator — mobile surfaces', () => {
  it('stacks the proposal card and keeps tap targets usable on phones', () => {
    const card = readSource('src/components/curator/CuratorChangeProposalCard.jsx');
    expect(card).toContain('grid-cols-1 sm:grid-cols-');
    expect(card).toContain('flex-col sm:flex-row');
    expect(card).toContain('min-h-[44px]');
    expect(card).toContain('break-words');
  });

  it('keeps the chat bubbles and proposal card inside the mobile viewport', () => {
    const chat = readSource('src/components/agent/ExpertTobacconistChat.jsx');
    expect(chat).toContain('max-w-[92%] sm:max-w-[85%]');
    expect(chat).toContain('CuratorChangeProposalCard');
  });
});