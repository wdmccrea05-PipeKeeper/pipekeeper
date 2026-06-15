import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  generateRecommendations: vi.fn(),
  generatePairingRecommendations: vi.fn(),
  generateGrowExpandRecommendations: vi.fn(),
  buildSessionPlan: vi.fn(),
}));

vi.mock('../recommendationEngine.js', () => ({
  generateRecommendations: mocks.generateRecommendations,
}));
vi.mock('../pairingEngine.js', () => ({
  generatePairingRecommendations: mocks.generatePairingRecommendations,
}));
vi.mock('../growExpandEngine.js', () => ({
  generateGrowExpandRecommendations: mocks.generateGrowExpandRecommendations,
}));
vi.mock('../sessionPlanner.js', () => ({
  buildSessionPlan: mocks.buildSessionPlan,
}));

import { runCuratorEngines } from '../engineRouter.js';

describe('engineRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.generateRecommendations.mockReturnValue([
      { id: 'r1', category: 'record_optimization' },
      { id: 'r2', category: 'collection_optimization' },
      { id: 'r3', category: 'purchase' },
    ]);
    mocks.generatePairingRecommendations.mockReturnValue([]);
    mocks.generateGrowExpandRecommendations.mockReturnValue([]);
    mocks.buildSessionPlan.mockReturnValue([]);
  });

  it('calls generateRecommendations once and reuses result buckets', () => {
    const result = runCuratorEngines({ activeModules: { pipekeeper: true } });
    expect(mocks.generateRecommendations).toHaveBeenCalledTimes(1);
    expect(result.recordOptimization).toHaveLength(1);
    expect(result.collectionOptimization).toHaveLength(1);
    expect(result.purchaseRestock).toHaveLength(1);
  });
});
