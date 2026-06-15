/**
 * curatorQaRegression.test.js
 *
 * Regression coverage added after the full Curator QA pass.
 *
 * Areas covered (per requirement §12):
 *  1.  PipeKeeper/tobacco gating — context builder enforces, not just detects
 *  2.  Tobacco data tied to PipeKeeper (no standalone tobacco gate)
 *  3.  Deterministic chat — all required query phrases handled before LLM
 *  4.  Audit log — fieldsChanged, previousValues, newValues all captured
 *  5.  Safe-field allowlist — cannot be bypassed via unsupported or image fields
 *  6.  image_url from LLM payload is stripped end-to-end
 *  7.  Approved image candidates apply through image-specific path only
 *  8.  Review-required items do not auto-apply
 *  9.  Auto-apply is a no-op in dry_run mode
 * 10.  Valuation canonical single-value priority (no double-counting; edge cases)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCuratorContextWithLogging } from '../buildCuratorContext.js';
import { answerCuratorDeterministicQuery } from '../curatorDeterministicChat.js';
import { getCuratorAutoApplyDisposition, CURATOR_AUTO_APPLY_POLICY } from '../autoApplyPolicy.js';
import { runCuratorOperation } from '../curatorOperationsEngine.js';
import {
  sanitizeCuratorRecordChanges,
  executeRecommendationAction,
  applyReviewedImageCandidate,
} from '../recommendationActions.js';
import { ACTION_TYPE, CATEGORY, MODULE_KEY } from '../recommendationSchema.js';

// ─── Shared mocks ─────────────────────────────────────────────────────────────

vi.mock('@/lib/curator/curatorAuditLog', () => ({
  logCuratorAuditEntry: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/api/base44Client', () => ({
  base44: {
    entities: {
      TobaccoBlend: {
        update: vi.fn(async (id, payload) => ({ id, ...payload })),
        get: vi.fn(async (id) => ({ id, blend_type: null, notes: null })),
      },
      Bottle: {
        update: vi.fn(async (id, payload) => ({ id, ...payload })),
        get: vi.fn(async (id) => ({
          id,
          notes: null,
          image_url: null,
          distillery: 'Test Distillery',
          expression: 'Test Expression',
        })),
      },
      Pipe: {
        update: vi.fn(async (id, payload) => ({ id, ...payload })),
        get: vi.fn(async (id) => ({ id, specialization: null, focus: [] })),
      },
      Cigar: {
        update: vi.fn(async (id, payload) => ({ id, ...payload })),
        get: vi.fn(async (id) => ({ id, wrapper: null, notes: null })),
      },
      Wine: {
        update: vi.fn(async (id, payload) => ({ id, ...payload })),
        get: vi.fn(async (id) => ({ id, region: null, vintage: null })),
      },
    },
  },
}));

import { logCuratorAuditEntry } from '@/lib/curator/curatorAuditLog';

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── §1 PipeKeeper/tobacco gating enforcement ─────────────────────────────────

describe('buildCuratorContextWithLogging — PipeKeeper gating', () => {
  it('returns pipes, blends, smoking logs and pairings when PipeKeeper is enabled', async () => {
    const context = await buildCuratorContextWithLogging(
      { email: 'user@example.com' },
      vi.fn().mockResolvedValue({
        pipes: [{ id: 'p1', name: 'Pipe A' }],
        blends: [{ id: 'b1', name: 'Blend A' }],
        smokingLogs: [{ id: 's1' }],
        pairingMatrixPairings: [{ pipe_id: 'p1', recommendations: [] }],
        bottles: [],
        wines: [],
        tastingLogs: [],
        inventoryUnits: [],
        wineTastingLogs: [],
        acquisitionItems: [],
        preferences: {},
      }),
      { pipekeeper: true, whiskeykeeper: true }
    );

    expect(context.pipes).toHaveLength(1);
    expect(context.blends).toHaveLength(1);
    expect(context.smokingLogs).toHaveLength(1);
    expect(context.pairingMatrixPairings).toHaveLength(1);
  });

  it('zeroes out pipes, blends, smoking logs, and pairings when PipeKeeper is disabled', async () => {
    const context = await buildCuratorContextWithLogging(
      { email: 'user@example.com' },
      vi.fn().mockResolvedValue({
        pipes: [{ id: 'p1', name: 'Pipe A' }],
        blends: [{ id: 'b1', name: 'Blend A' }],
        smokingLogs: [{ id: 's1' }],
        pairingMatrixPairings: [{ pipe_id: 'p1', recommendations: [] }],
        bottles: [],
        wines: [],
        tastingLogs: [],
        inventoryUnits: [],
        wineTastingLogs: [],
        acquisitionItems: [],
        preferences: {},
      }),
      { pipekeeper: false, whiskeykeeper: true }
    );

    expect(context.pipes).toHaveLength(0);
    expect(context.blends).toHaveLength(0);
    expect(context.smokingLogs).toHaveLength(0);
    expect(context.pairingMatrixPairings).toHaveLength(0);
  });

  // §2 — tobacco gating is derived from PipeKeeper, not a standalone flag
  it('hides tobacco blends when PipeKeeper is disabled (tobacco gate follows PipeKeeper)', async () => {
    const context = await buildCuratorContextWithLogging(
      { email: 'user@example.com' },
      vi.fn().mockResolvedValue({
        pipes: [],
        blends: [{ id: 'b1', name: 'Five Brothers' }, { id: 'b2', name: 'Nightcap' }],
        smokingLogs: [],
        pairingMatrixPairings: [],
        bottles: [],
        wines: [],
        tastingLogs: [],
        inventoryUnits: [],
        wineTastingLogs: [],
        acquisitionItems: [],
        preferences: {},
      }),
      { pipekeeper: false }
    );

    expect(context.blends).toHaveLength(0);
  });

  it('passes through whiskey and wine data when only PipeKeeper is disabled', async () => {
    const context = await buildCuratorContextWithLogging(
      { email: 'user@example.com' },
      vi.fn().mockResolvedValue({
        pipes: [{ id: 'p1' }],
        blends: [{ id: 'b1' }],
        smokingLogs: [],
        pairingMatrixPairings: [],
        bottles: [{ id: 'w1', name: 'Whiskey A' }],
        wines: [{ id: 'v1', name: 'Wine A' }],
        tastingLogs: [],
        inventoryUnits: [],
        wineTastingLogs: [],
        acquisitionItems: [],
        preferences: {},
      }),
      { pipekeeper: false, whiskeykeeper: true, winekeeper: true }
    );

    // PipeKeeper data zeroed
    expect(context.pipes).toHaveLength(0);
    expect(context.blends).toHaveLength(0);
    // Other modules unaffected
    expect(context.bottles).toHaveLength(1);
    expect(context.wines).toHaveLength(1);
  });
});

// ─── §3 Deterministic chat handlers — required query phrases ──────────────────

const baseContext = {
  pipes: [
    { id: 'p1', name: 'Dublin Pipe' },
    { id: 'p2', name: 'Billiard Pipe' },
  ],
  blends: [
    { id: 'b1', name: 'Five Brothers' },
    { id: 'b2', name: 'Nightcap' },
  ],
  bottles: [
    { id: 'w1', name: 'Bottle A', abv: null, estimated_value: 80 },
    { id: 'w2', name: 'Bottle B', abv: 46, estimated_value: 120 },
  ],
  cigars: [
    { id: 'c1', name: 'Cigar A', quantity: 2 },
    { id: 'c2', name: 'Cigar B', quantity: 10 },
  ],
  wines: [
    { id: 'v1', name: 'Chateau A', vintage: null, estimated_value: 55 },
    { id: 'v2', name: 'Chateau B', vintage: 2019, estimated_value: null },
  ],
  smokingLogs: [],
  inventoryUnits: [],
  pairingMatrixPairings: [],
};

describe('answerCuratorDeterministicQuery — required phrases', () => {
  it('handles "Which pipes have not been used recently?" deterministically', () => {
    const result = answerCuratorDeterministicQuery(
      'Which pipes have not been used recently?',
      { ...baseContext, smokingLogs: [] }
    );
    expect(result.handled).toBe(true);
    expect(result.reply).toContain('Dublin Pipe');
    expect(result.reply).toContain('Billiard Pipe');
  });

  it('handles "Which wines are missing vintage?" deterministically', () => {
    const result = answerCuratorDeterministicQuery(
      'Which wines are missing vintage?',
      baseContext
    );
    expect(result.handled).toBe(true);
    expect(result.reply).toContain('Chateau A');
    expect(result.reply).not.toContain('Chateau B');
  });

  it('handles "Which whiskeys are missing ABV?" deterministically', () => {
    const result = answerCuratorDeterministicQuery(
      'Which whiskeys are missing ABV?',
      baseContext
    );
    expect(result.handled).toBe(true);
    expect(result.reply).toContain('Bottle A');
    expect(result.reply).not.toContain('Bottle B');
  });

  it('handles "Which records need images?" deterministically', () => {
    const result = answerCuratorDeterministicQuery(
      'Which records need images?',
      baseContext
    );
    expect(result.handled).toBe(true);
    // All records have no image — some should appear
    expect(result.reply).not.toBe('');
  });

  it('handles "Which records have no valuation?" deterministically', () => {
    const result = answerCuratorDeterministicQuery(
      'Which records have no valuation?',
      baseContext
    );
    expect(result.handled).toBe(true);
    expect(result.reply).toContain('Chateau B');
  });

  it('handles "What are my most valuable items?" deterministically', () => {
    const result = answerCuratorDeterministicQuery(
      'What are my most valuable items?',
      baseContext
    );
    expect(result.handled).toBe(true);
    expect(result.reply).toContain('Bottle B (120.00)');
  });

  it('handles "Which cigars are under 3 sticks?" deterministically', () => {
    const result = answerCuratorDeterministicQuery(
      'Which cigars are under 3 sticks?',
      baseContext
    );
    expect(result.handled).toBe(true);
    expect(result.reply).toContain('Cigar A (2)');
    expect(result.reply).not.toContain('Cigar B');
  });

  it('handles "How many unopened bottles do I have?" deterministically', () => {
    const result = answerCuratorDeterministicQuery(
      'How many unopened bottles do I have?',
      { ...baseContext, bottles: [{ id: 'w1', name: 'Bottle A', is_open: false }], inventoryUnits: [] }
    );
    expect(result.handled).toBe(true);
    expect(result.reply).toBe('You have 1 unopened bottle.');
  });

  it('handles "Which bottles are open?" deterministically', () => {
    const result = answerCuratorDeterministicQuery(
      'Which bottles are open?',
      {
        ...baseContext,
        bottles: [
          { id: 'w1', name: 'Bottle A', is_open: true },
          { id: 'w2', name: 'Bottle B', is_open: false },
        ],
        inventoryUnits: [],
      }
    );
    expect(result.handled).toBe(true);
    expect(result.reply).toContain('Bottle A');
    expect(result.reply).not.toContain('Bottle B');
  });

  it('handles "What are my worst pairings?" when data is present', () => {
    const result = answerCuratorDeterministicQuery('What are my worst pairings?', {
      pairingMatrixPairings: [
        {
          pipe_name: 'Dublin Pipe',
          recommendations: [
            { tobacco_name: 'Five Brothers', score: 3 },
            { tobacco_name: 'Nightcap', score: 8 },
          ],
        },
      ],
    });
    expect(result.handled).toBe(true);
    expect(result.reply).toContain('Five Brothers (3)');
  });

  it('handles "Show pairings scored 4 or lower" deterministically', () => {
    const result = answerCuratorDeterministicQuery('Show pairings scored 4 or lower', {
      pairingMatrixPairings: [
        {
          pipe_name: 'Dublin Pipe',
          recommendations: [
            { tobacco_name: 'Five Brothers', score: 3 },
            { tobacco_name: 'Nightcap', score: 7 },
          ],
        },
      ],
    });
    expect(result.handled).toBe(true);
    expect(result.reply).toContain('Five Brothers (3)');
    expect(result.reply).not.toContain('Nightcap (7)');
  });
});

// ─── §4 Audit log captures fieldsChanged, previousValues, newValues ───────────

describe('audit log — before/after field capture', () => {
  it('captures fieldsChanged, previousValues and newValues for a blend update', async () => {
    await executeRecommendationAction(
      {
        id: 'rec_audit',
        goal: 'blend_missing_type',
        items: [
          {
            id: 'blend_audit_1',
            recordId: 'blend_audit_1',
            recordType: 'blend',
            proposedChange: {
              confidence: 0.95,
              payload: { blend_type: 'Virginia', notes: 'Enriched by Curator' },
            },
          },
        ],
      },
      'apply_fix',
      { userEmail: 'user@example.com' }
    );

    expect(logCuratorAuditEntry).toHaveBeenCalledTimes(1);
    const call = logCuratorAuditEntry.mock.calls[0][0];
    expect(call.fieldsChanged).toContain('blend_type');
    expect(call.fieldsChanged).toContain('notes');
    expect(call.previousValues).toBeDefined();
    expect(call.newValues).toBeDefined();
    expect(call.newValues.blend_type).toBe('Virginia');
    expect(call.appliedAutomatically).toBe(true);
    expect(call.requiredUserApproval).toBe(false);
  });

  it('captures before/after values with requiredUserApproval=true for approve_changes', async () => {
    await executeRecommendationAction(
      {
        id: 'rec_review',
        goal: 'strategy_update',
        items: [
          {
            id: 'bottle_review_1',
            recordId: 'bottle_review_1',
            recordType: 'bottle',
            proposedChange: {
              confidence: 0.88,
              payload: { strategy_state: 'hold', notes: 'Hold for 3 years' },
            },
          },
        ],
      },
      'approve_changes',
      { userEmail: 'user@example.com' }
    );

    expect(logCuratorAuditEntry).toHaveBeenCalledTimes(1);
    const call = logCuratorAuditEntry.mock.calls[0][0];
    expect(call.fieldsChanged).toContain('strategy_state');
    expect(call.previousValues).toBeDefined();
    expect(call.newValues.strategy_state).toBe('hold');
    expect(call.appliedAutomatically).toBe(false);
    expect(call.requiredUserApproval).toBe(true);
  });

  it('captures audit log fields for a reviewed image candidate application', async () => {
    await applyReviewedImageCandidate(
      'bottle',
      'bottle_img_1',
      {
        resolvedBy: 'resolveCuratorImageCandidates',
        imageUrl: 'https://cdn.example.com/bottle.jpg',
        source: 'app_library',
        confidence: 0.95,
        distillery: 'Test Distillery',
        expression: 'Test Expression',
      },
      { approved: true, mode: 'replace', userEmail: 'user@example.com' }
    );

    expect(logCuratorAuditEntry).toHaveBeenCalledTimes(1);
    const call = logCuratorAuditEntry.mock.calls[0][0];
    expect(call.operationType).toBe('apply_reviewed_image_candidate');
    expect(call.fieldsChanged).toBeDefined();
    expect(call.fieldsChanged.length).toBeGreaterThan(0);
    expect(call.previousValues).toBeDefined();
    expect(call.newValues).toBeDefined();
    expect(call.appliedAutomatically).toBe(false);
    expect(call.requiredUserApproval).toBe(true);
  });
});

// ─── §5 Safe-field allowlist cannot be bypassed ───────────────────────────────

describe('safe-field allowlist', () => {
  it('strips unsupported fields from blend payloads', () => {
    expect(
      sanitizeCuratorRecordChanges(
        { blend_type: 'Burley', unsupported_field: 'should-not-write', another_bad: 123 },
        { allowedSet: new Set(['blend_type', 'notes']) }
      )
    ).toEqual({ blend_type: 'Burley' });
  });

  it('empty result when all fields are unsupported', () => {
    expect(
      sanitizeCuratorRecordChanges(
        { totally_fake: 'x', also_fake: 'y' },
        { allowedSet: new Set(['notes']) }
      )
    ).toEqual({});
  });

  it('unsupported payload is rejected without mutating any entity', async () => {
    const { base44 } = await import('@/api/base44Client');
    const result = await executeRecommendationAction(
      {
        id: 'rec_bypass_test',
        goal: 'blend_bypass',
        items: [
          {
            id: 'blend_bypass_1',
            recordId: 'blend_bypass_1',
            recordType: 'blend',
            proposedChange: {
              confidence: 0.99,
              payload: { injected_field: 'malicious', another_bad: 'value' },
            },
          },
        ],
      },
      'apply_fix',
      {}
    );

    expect(result.ok).toBe(false);
    expect(base44.entities.TobaccoBlend.update).not.toHaveBeenCalled();
  });
});

// ─── §6 image_url from LLM payload is blocked end-to-end ─────────────────────

describe('LLM image_url blocking', () => {
  it('sanitizeCuratorRecordChanges strips all image field keys', () => {
    const imageFields = ['photo', 'image', 'image_url', 'photo_url', 'primary_photo', 'photos'];
    imageFields.forEach((field) => {
      const result = sanitizeCuratorRecordChanges({ [field]: 'https://example.com/img.jpg', notes: 'safe' });
      expect(result[field]).toBeUndefined();
      expect(result.notes).toBe('safe');
    });
  });

  it('apply_fix with image-only payload does not write to any entity', async () => {
    const { base44 } = await import('@/api/base44Client');
    const result = await executeRecommendationAction(
      {
        id: 'rec_img_block',
        goal: 'bottle_image_refresh',
        items: [
          {
            id: 'bottle_img_block_1',
            recordId: 'bottle_img_block_1',
            recordType: 'bottle',
            proposedChange: {
              confidence: 0.99,
              payload: { image_url: 'https://cdn.example.com/blocked.jpg' },
            },
          },
        ],
      },
      'apply_fix',
      { userEmail: 'user@example.com' }
    );

    expect(result.ok).toBe(false);
    expect(base44.entities.Bottle.update).not.toHaveBeenCalled();
  });
});

// ─── §7 Approved image candidates apply through image-specific path only ──────

describe('reviewed image candidate application', () => {
  it('requires resolvedBy=resolveCuratorImageCandidates sentinel to apply', async () => {
    await expect(() =>
      applyReviewedImageCandidate(
        'bottle',
        'bottle_sentinel_1',
        {
          imageUrl: 'https://example.com/img.jpg',
          source: 'app_library',
          confidence: 0.95,
          // resolvedBy intentionally omitted
        },
        { approved: true }
      )
    ).rejects.toThrow('Image candidate must come from resolveCuratorImageCandidates().');
  });

  it('requires explicit approved:true flag', async () => {
    await expect(() =>
      applyReviewedImageCandidate(
        'bottle',
        'bottle_approval_1',
        {
          resolvedBy: 'resolveCuratorImageCandidates',
          imageUrl: 'https://example.com/img.jpg',
          source: 'app_library',
          confidence: 0.95,
          distillery: 'Test Distillery',
          expression: 'Test Expression',
        },
        { approved: false }
      )
    ).rejects.toThrow('Reviewed image candidates require explicit approval.');
  });
});

// ─── §8 Review-required items do not auto-apply before user approval ──────────

describe('review-required items — no premature auto-apply', () => {
  it('opinion-based findings (specialization/strategy) are never auto-applied', async () => {
    const applyFn = vi.fn();
    const result = await runCuratorOperation(
      {
        operationType: 'collection_optimization',
        autoApplyRuntime: 'apply',
        applyRecommendation: applyFn,
        routerResults: {
          collectionOptimization: [
            {
              id: 'rec_opinion',
              category: CATEGORY.COLLECTION_OPTIMIZATION,
              goal: 'specialization_candidates',
              actionType: ACTION_TYPE.REVIEW_REQUIRED,
              moduleKey: MODULE_KEY.PIPE,
              confidence: 'high',
              items: [],
            },
          ],
        },
      },
      { _context: {} }
    );

    expect(applyFn).not.toHaveBeenCalled();
    expect(result.reviewItems).toHaveLength(1);
    expect(result.appliedChanges).toHaveLength(0);
  });

  it('image-containing findings are always review-required regardless of confidence', () => {
    const disposition = getCuratorAutoApplyDisposition(
      {
        id: 'rec_img',
        goal: 'record_image_refresh',
        actionType: ACTION_TYPE.AUTO_FIX,
        confidence: 'high',
        items: [
          {
            recordId: 'r1',
            proposedChange: {
              confidence: 0.99,
              payload: { image_url: 'https://example.com/img.jpg' },
            },
          },
        ],
      },
      CURATOR_AUTO_APPLY_POLICY
    );

    expect(disposition.autoApply).toBe(false);
    expect(disposition.reviewRequired).toBe(true);
    expect(disposition.policyKey).toBe('imageUpdate');
  });

  it('hold/strategy/favorite goal keywords force review-required disposition', () => {
    ['hold strategy', 'my favorite blend', 'rotation schedule', 'aging only', 'preferred_use'].forEach((goal) => {
      const disposition = getCuratorAutoApplyDisposition(
        {
          id: `rec_${goal}`,
          goal,
          actionType: ACTION_TYPE.AUTO_FIX,
          confidence: 'high',
          items: [],
        },
        CURATOR_AUTO_APPLY_POLICY
      );
      expect(disposition.autoApply).toBe(false);
      expect(disposition.reviewRequired).toBe(true);
    });
  });
});

// ─── §9 Auto-apply is a no-op in dry_run mode ────────────────────────────────

describe('runCuratorOperation — dry_run vs apply mode', () => {
  it('does not call the apply handler in dry_run mode (default)', async () => {
    const applyFn = vi.fn();
    const result = await runCuratorOperation(
      {
        operationType: 'record_optimization',
        autoApplyRuntime: 'dry_run',
        applyRecommendation: applyFn,
        routerResults: {
          recordOptimization: [
            {
              id: 'rec_dry',
              category: CATEGORY.RECORD_OPTIMIZATION,
              goal: 'blend_missing_type',
              actionType: ACTION_TYPE.AUTO_FIX,
              moduleKey: MODULE_KEY.TOBACCO,
              confidence: 'high',
              items: [
                {
                  id: 'blend_dry_1',
                  recordId: 'blend_dry_1',
                  recordType: 'blend',
                  proposedChange: { confidence: 0.95, payload: { blend_type: 'Virginia' } },
                },
              ],
            },
          ],
        },
      },
      { _context: {} }
    );

    expect(applyFn).not.toHaveBeenCalled();
    expect(result.appliedChanges).toHaveLength(0);
    // Findings are still surfaced for preview
    expect(result.findings).toHaveLength(1);
  });

  it('calls the apply handler exactly once per auto-applicable finding in apply mode', async () => {
    const applyFn = vi.fn().mockResolvedValue({ ok: true });
    const result = await runCuratorOperation(
      {
        operationType: 'record_optimization',
        autoApplyRuntime: 'apply',
        applyRecommendation: applyFn,
        routerResults: {
          recordOptimization: [
            {
              id: 'rec_apply_1',
              category: CATEGORY.RECORD_OPTIMIZATION,
              goal: 'blend_missing_type',
              actionType: ACTION_TYPE.AUTO_FIX,
              moduleKey: MODULE_KEY.TOBACCO,
              confidence: 'high',
              items: [
                {
                  id: 'blend_apply_1',
                  recordId: 'blend_apply_1',
                  recordType: 'blend',
                  proposedChange: { confidence: 0.95, payload: { blend_type: 'Virginia' } },
                },
              ],
            },
          ],
        },
      },
      { _context: {} }
    );

    expect(applyFn).toHaveBeenCalledTimes(1);
    expect(result.appliedChanges).toHaveLength(1);
    expect(result.status).toBe('applied');
  });
});

// ─── §10 Valuation canonical single-value priority ────────────────────────────

describe('valuation — canonical single-value priority and edge cases', () => {
  it('pickCanonicalValue selects the first non-null field (no double-counting)', async () => {
    const { buildCuratorDataSnapshot } = await import('../curatorOperationsEngine.js');
    const snapshot = await buildCuratorDataSnapshot({
      user: { email: 'user@example.com' },
      stableModuleEnabled: { whiskeykeeper: true, winekeeper: true, cigarkeeper: true },
      buildContextFn: vi.fn().mockResolvedValue({
        pipes: [],
        blends: [],
        bottles: [
          { id: 'b1', estimated_value: 100, collector_value: 999, retail_price: 50 },
        ],
        cigars: [
          { id: 'c1', estimated_value: 40, purchase_price: 999 },
        ],
        wines: [
          { id: 'v1', collector_value: 60, purchase_price: 999 },
        ],
        smokingLogs: [],
        tastingLogs: [],
        wineTastingLogs: [],
        cigarSessions: [],
        inventoryUnits: [],
        pairingMatrixPairings: [],
        acquisitionItems: [],
        preferences: {},
        activeModules: { whiskeykeeper: true, winekeeper: true, cigarkeeper: true },
      }),
    });

    // Must pick first non-null — not sum all fields
    expect(snapshot.valuationSummaries.whiskey).toBe(100);
    expect(snapshot.valuationSummaries.cigar).toBe(40);
    expect(snapshot.valuationSummaries.wine).toBe(60);
  });

  it('handles zero estimated_value as a valid value (not skipped)', async () => {
    const { buildCuratorDataSnapshot } = await import('../curatorOperationsEngine.js');
    const snapshot = await buildCuratorDataSnapshot({
      user: { email: 'user@example.com' },
      stableModuleEnabled: { whiskeykeeper: true },
      buildContextFn: vi.fn().mockResolvedValue({
        pipes: [],
        blends: [],
        bottles: [{ id: 'b1', estimated_value: 0, collector_value: 200 }],
        cigars: [],
        wines: [],
        smokingLogs: [],
        tastingLogs: [],
        wineTastingLogs: [],
        cigarSessions: [],
        inventoryUnits: [],
        pairingMatrixPairings: [],
        acquisitionItems: [],
        preferences: {},
        activeModules: { whiskeykeeper: true },
      }),
    });

    // estimated_value=0 is a valid number — collector_value should NOT be used
    expect(snapshot.valuationSummaries.whiskey).toBe(0);
  });

  it('falls back through fields when earlier ones are null', async () => {
    const { buildCuratorDataSnapshot } = await import('../curatorOperationsEngine.js');
    const snapshot = await buildCuratorDataSnapshot({
      user: { email: 'user@example.com' },
      stableModuleEnabled: { whiskeykeeper: true },
      buildContextFn: vi.fn().mockResolvedValue({
        pipes: [],
        blends: [],
        bottles: [
          { id: 'b1', estimated_value: null, collector_value: null, average_market_value: null, current_market_value: null, retail_price: 75, purchase_price: 999 },
        ],
        cigars: [],
        wines: [],
        smokingLogs: [],
        tastingLogs: [],
        wineTastingLogs: [],
        cigarSessions: [],
        inventoryUnits: [],
        pairingMatrixPairings: [],
        acquisitionItems: [],
        preferences: {},
        activeModules: { whiskeykeeper: true },
      }),
    });

    expect(snapshot.valuationSummaries.whiskey).toBe(75);
  });

  it('string-number values are coerced to numbers', async () => {
    const { buildCuratorDataSnapshot } = await import('../curatorOperationsEngine.js');
    const snapshot = await buildCuratorDataSnapshot({
      user: { email: 'user@example.com' },
      stableModuleEnabled: { whiskeykeeper: true },
      buildContextFn: vi.fn().mockResolvedValue({
        pipes: [],
        blends: [],
        bottles: [{ id: 'b1', estimated_value: '90', collector_value: 200 }],
        cigars: [],
        wines: [],
        smokingLogs: [],
        tastingLogs: [],
        wineTastingLogs: [],
        cigarSessions: [],
        inventoryUnits: [],
        pairingMatrixPairings: [],
        acquisitionItems: [],
        preferences: {},
        activeModules: { whiskeykeeper: true },
      }),
    });

    expect(snapshot.valuationSummaries.whiskey).toBe(90);
  });

  it('records with no value fields contribute 0 to totals (not null/NaN)', async () => {
    const { buildCuratorDataSnapshot } = await import('../curatorOperationsEngine.js');
    const snapshot = await buildCuratorDataSnapshot({
      user: { email: 'user@example.com' },
      stableModuleEnabled: { whiskeykeeper: true },
      buildContextFn: vi.fn().mockResolvedValue({
        pipes: [],
        blends: [],
        bottles: [
          { id: 'b1', estimated_value: 50 },
          { id: 'b2' }, // no value fields
        ],
        cigars: [],
        wines: [],
        smokingLogs: [],
        tastingLogs: [],
        wineTastingLogs: [],
        cigarSessions: [],
        inventoryUnits: [],
        pairingMatrixPairings: [],
        acquisitionItems: [],
        preferences: {},
        activeModules: { whiskeykeeper: true },
      }),
    });

    expect(snapshot.valuationSummaries.whiskey).toBe(50);
    expect(Number.isFinite(snapshot.valuationSummaries.whiskey)).toBe(true);
  });
});
