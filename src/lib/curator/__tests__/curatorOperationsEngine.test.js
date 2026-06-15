import { describe, expect, it, vi } from 'vitest';
import {
  buildCuratorDataSnapshot,
  runCuratorOperation,
  runCuratorWorkspaceOperations,
} from '../curatorOperationsEngine.js';
import { ACTION_TYPE, CATEGORY, MODULE_KEY } from '../recommendationSchema.js';

function buildRecommendation(overrides = {}) {
  return {
    id: 'rec_1',
    category: CATEGORY.RECORD_OPTIMIZATION,
    goal: 'blend_missing_type',
    actionType: ACTION_TYPE.AUTO_FIX,
    moduleKey: MODULE_KEY.TOBACCO,
    confidence: 'high',
    items: [
      {
        id: 'blend_1',
        recordId: 'blend_1',
        recordType: 'blend',
        proposedChange: {
          confidence: 0.93,
          payload: { blend_type: 'Virginia' },
        },
      },
    ],
    ...overrides,
  };
}

describe('curatorOperationsEngine', () => {
  it('builds the canonical curator data snapshot', async () => {
    const snapshot = await buildCuratorDataSnapshot({
      user: { email: 'user@example.com' },
      stableModuleEnabled: { pipekeeper: true, whiskeykeeper: true, winekeeper: true, cigarkeeper: true },
      buildContextFn: vi.fn().mockResolvedValue({
        pipes: [{ id: 'pipe_1', name: 'Pipe A', photo: 'pipe.jpg', specialization: 'Virginia' }],
        blends: [{ id: 'blend_1', name: 'Blend A', blend_type: '', strength: '' }],
        bottles: [{ id: 'bottle_1', name: 'Bottle A', retail_price: 50 }],
        wines: [{ id: 'wine_1', name: 'Wine A', vintage: '' }],
        cigars: [{ id: 'cigar_1', name: 'Cigar A' }],
        smokingLogs: [{ id: 'log_1' }],
        tastingLogs: [{ id: 'tasting_1' }],
        wineTastingLogs: [{ id: 'wine_tasting_1' }],
        cigarSessions: [{ id: 'session_1' }],
        inventoryUnits: [{ id: 'inventory_1' }],
        pairingMatrixPairings: [{ pipe_id: 'pipe_1', recommendations: [{ tobacco_name: 'Blend A', score: 4 }] }],
        acquisitionItems: [{ id: 'acq_1' }],
        preferences: { theme: 'dark' },
        activeModules: { pipekeeper: true, whiskeykeeper: true, winekeeper: true, cigarkeeper: true },
      }),
    });

    expect(snapshot.pipekeeper.pipes).toHaveLength(1);
    expect(snapshot.pipekeeper.tobaccoBlends).toHaveLength(1);
    expect(snapshot.whiskeykeeper.bottles).toHaveLength(1);
    expect(snapshot.cigarkeeper.cigars).toHaveLength(1);
    expect(snapshot.winekeeper.wines).toHaveLength(1);
    expect(snapshot.winekeeper.tastingLogs).toHaveLength(1);
    expect(snapshot.entitlements.cigarkeeper).toBe(null);
    expect(snapshot.userUploadedImages[0].imageUrl).toBe('pipe.jpg');
    expect(snapshot.diagnostics.counts.pairings).toBe(1);
  });

  it('auto-applies task-based findings when apply mode is enabled', async () => {
    const applyRecommendation = vi.fn().mockResolvedValue({ ok: true });
    const result = await runCuratorOperation(
      {
        operationType: 'record_optimization',
        autoApplyRuntime: 'apply',
        applyRecommendation,
        routerResults: {
          recordOptimization: [buildRecommendation()],
        },
      },
      { _context: {} }
    );

    expect(result.status).toBe('applied');
    expect(applyRecommendation).toHaveBeenCalledTimes(1);
    expect(result.reviewRequired).toBe(false);
  });

  it('keeps opinion-based changes in review-required state until approved', async () => {
    const result = await runCuratorOperation(
      {
        operationType: 'collection_optimization',
        routerResults: {
          collectionOptimization: [
            buildRecommendation({
              id: 'rec_special',
              category: CATEGORY.COLLECTION_OPTIMIZATION,
              goal: 'specialization_candidates',
              actionType: ACTION_TYPE.REVIEW_REQUIRED,
            }),
          ],
        },
      },
      { _context: {} }
    );

    expect(result.status).toBe('review_required');
    expect(result.reviewItems).toHaveLength(1);
    expect(result.appliedChanges).toHaveLength(0);
  });

  it('returns structured workspace results for operations-first tabs', async () => {
    const workspace = await runCuratorWorkspaceOperations({
      _context: {},
      appImageLibrary: [],
      routerResults: undefined,
    });

    expect(workspace).toHaveProperty('sections');
    expect(workspace).toHaveProperty('pairings');
    expect(workspace).toHaveProperty('operations.recordOptimization');
    expect(workspace.operations.pairings).toHaveProperty('findings');
    expect(workspace.operations.planSession).toHaveProperty('findings');
  });
});
