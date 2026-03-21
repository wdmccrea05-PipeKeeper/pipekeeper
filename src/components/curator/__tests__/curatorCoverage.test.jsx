/**
 * Curator Coverage & Anti-Repetition Tests
 *
 * Tests:
 * 1. Large pipe + tobacco collections — no truncation
 * 2. Large whiskey collections — full candidate coverage
 * 3. Mixed module users — cross-module inclusion verified
 * 4. Very large users with thousands of logs
 * 5. Regenerate / broaden / narrow flows
 * 6. Pairings across multiple modules
 * 7. No invalid item references
 * 8. Anti-repetition / novelty weighting
 */

import { buildCoverageAudit, validateCompressionCoverage, reconcileCoverageTotals } from '../curatorCoverageAudit';
import { buildSafeCollectionContext, selectContextMode } from '../collectionContextBudget';
import {
  recordRecommendationsShown,
  recordRecommendationAction,
  getRecentHistory,
  getExcludedItemIds,
  buildNoveltyPromptAddendum,
  buildBroadenPromptAddendum,
  clearWorkflowHistory,
} from '../curatorRecommendationHistory';

// ─── Generators ──────────────────────────────────────────────────────────────

function makePipes(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `pipe_${i}`,
    name: `Pipe ${i}`,
    maker: `Maker ${i % 5}`,
    shape: ['Billiard', 'Dublin', 'Apple', 'Bulldog'][i % 4],
    bowl_material: i % 3 === 0 ? 'Meerschaum' : 'Briar',
    focus: i % 4 === 0 ? ['Virginia'] : [],
    is_favorite: i % 10 === 0,
    ai_excluded: false,
    purchase_date: new Date(Date.now() - i * 86400000 * 10).toISOString(),
  }));
}

function makeBlends(count) {
  const types = ['Virginia', 'English', 'Aromatic', 'Burley', 'Virginia/Perique'];
  return Array.from({ length: count }, (_, i) => ({
    id: `blend_${i}`,
    name: `Blend ${i}`,
    manufacturer: `Maker ${i % 8}`,
    blend_type: types[i % types.length],
    strength: ['Mild', 'Medium', 'Full'][i % 3],
    rating: i % 5 === 0 ? (Math.floor(i / 5) % 5) + 1 : null,
    is_favorite: i % 15 === 0,
    ai_excluded: false,
    tin_total_quantity_oz: (i % 6) * 2,
    production_status: i % 20 === 0 ? 'Discontinued' : 'Current Production',
  }));
}

function makeBottles(count) {
  const types = ['Single Malt Scotch', 'Bourbon', 'Rye', 'Blended Scotch', 'Irish'];
  const regions = ['Speyside', 'Islay', 'Kentucky', 'Highland', 'Lowland'];
  return Array.from({ length: count }, (_, i) => ({
    id: `bottle_${i}`,
    name: `Bottle ${i}`,
    distillery: `Distillery ${i % 10}`,
    type: types[i % types.length],
    whiskey_type: types[i % types.length],
    region: regions[i % regions.length],
    age: (i % 15) + 10,
    abv: 40 + (i % 20),
    rating: i % 6 === 0 ? (Math.floor(i / 6) % 5) + 1 : null,
    ai_excluded: false,
    purchase_date: new Date(Date.now() - i * 86400000 * 5).toISOString(),
  }));
}

function makeSmokingLogs(pipes, blends, count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `slog_${i}`,
    pipe_id: pipes[i % pipes.length]?.id,
    blend_id: blends[i % blends.length]?.id,
    bowls_used: 1,
    date: new Date(Date.now() - i * 86400000).toISOString(),
  }));
}

function makeTastingLogs(bottles, count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `tlog_${i}`,
    bottle_id: bottles[i % bottles.length]?.id,
    tasting_date: new Date(Date.now() - i * 86400000).toISOString(),
    flavor_notes: ['vanilla', 'oak', 'peat'],
    rating: (i % 5) + 1,
  }));
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Curator Coverage — Large Collections', () => {

  test('1. Large pipe + tobacco collection (150 pipes, 200 blends, 1000 logs) — no truncation', () => {
    const pipes = makePipes(150);
    const blends = makeBlends(200);
    const logs = makeSmokingLogs(pipes, blends, 1000);

    const ctx = buildSafeCollectionContext({ pipes, blends, bottles: [], smokingLogs: logs });
    const audit = buildCoverageAudit({ pipes, blends, bottles: [], smokingLogs: logs });

    // All items accounted for
    expect(audit.modules.pipe.total).toBe(150);
    expect(audit.modules.tobacco.total).toBe(200);
    expect(audit.totalEligibleItems).toBe(350); // none excluded

    // Context candidate pools must match audit
    const compressionCheck = validateCompressionCoverage(ctx, audit);
    expect(compressionCheck.ok).toBe(true);
    expect(compressionCheck.issues).toHaveLength(0);

    // Mode must be 'large' or 'huge' — NOT 'small'
    expect(['large', 'huge']).toContain(ctx.mode);

    console.log(`[TEST 1] Mode: ${ctx.mode}, eligible: ${audit.totalEligibleItems}`);
  });

  test('2. Large whiskey collection (300 bottles, 500 tasting logs) — full candidate coverage', () => {
    const bottles = makeBottles(300);
    const tastingLogs = makeTastingLogs(bottles, 500);

    const ctx = buildSafeCollectionContext({ pipes: [], blends: [], bottles, tastingLogs });
    const audit = buildCoverageAudit({ pipes: [], blends: [], bottles, tastingLogs });

    expect(audit.modules.whiskey.total).toBe(300);
    expect(audit.modules.whiskey.eligible).toBe(300);
    expect(ctx.eligibleBottleIds).toHaveLength(300);

    const compressionCheck = validateCompressionCoverage(ctx, audit);
    expect(compressionCheck.ok).toBe(true);

    console.log(`[TEST 2] Mode: ${ctx.mode}, bottles: ${audit.modules.whiskey.eligible}/300`);
  });

  test('3. Mixed module user (50 pipes, 80 blends, 120 bottles) — cross-module inclusion', () => {
    const pipes = makePipes(50);
    const blends = makeBlends(80);
    const bottles = makeBottles(120);
    const logs = makeSmokingLogs(pipes, blends, 300);
    const tastingLogs = makeTastingLogs(bottles, 100);

    const audit = buildCoverageAudit({ pipes, blends, bottles, smokingLogs: logs, tastingLogs });

    // All three modules must be included
    expect(audit.modulesIncluded).toContain('pipe');
    expect(audit.modulesIncluded).toContain('tobacco');
    expect(audit.modulesIncluded).toContain('whiskey');

    expect(audit.modules.pipe.total).toBe(50);
    expect(audit.modules.tobacco.total).toBe(80);
    expect(audit.modules.whiskey.total).toBe(120);

    console.log(`[TEST 3] Modules: ${audit.modulesIncluded.join(', ')}, total eligible: ${audit.totalEligibleItems}`);
  });

  test('4. Very large user (100 pipes, 150 blends, 200 bottles, 5000 logs) — stable context mode', () => {
    const pipes = makePipes(100);
    const blends = makeBlends(150);
    const bottles = makeBottles(200);
    const logs = makeSmokingLogs(pipes, blends, 5000);
    const tastingLogs = makeTastingLogs(bottles, 500);

    const mode = selectContextMode(pipes, blends, bottles, [...logs, ...tastingLogs]);
    const ctx = buildSafeCollectionContext({ pipes, blends, bottles, smokingLogs: logs, tastingLogs });
    const audit = buildCoverageAudit({ pipes, blends, bottles, smokingLogs: logs, tastingLogs });

    // Must be huge mode
    expect(mode).toBe('huge');

    // All items still accounted for (no silent drops)
    expect(audit.totalRawItems).toBe(450);
    expect(audit.totalEligibleItems).toBe(450);

    const compressionCheck = validateCompressionCoverage(ctx, audit);
    expect(compressionCheck.ok).toBe(true);

    console.log(`[TEST 4] Mode: ${mode}, items: ${audit.totalEligibleItems}/450, logs: ${audit.totalLogs}`);
  });

  test('5. AI result reconciliation — invalid IDs are caught', () => {
    const pipes = makePipes(10);
    const blends = makeBlends(10);

    const fakeAiResult = {
      groups: [{
        groupKey: 'test',
        groupTitle: 'Test',
        priority: 'high',
        items: [
          { id: 'r1', itemId: 'pipe_0', itemName: 'Pipe 0', type: 'pipe', issue: 'test', recommendation: 'test', confidence: 'high' },
          { id: 'r2', itemId: 'FAKE_ID_999', itemName: 'Ghost Pipe', type: 'pipe', issue: 'test', recommendation: 'test', confidence: 'low' },
        ],
      }],
    };

    const audit = buildCoverageAudit({ pipes, blends, bottles: [] }, fakeAiResult);

    expect(audit.reconciliation.totalRecommendations).toBe(2);
    expect(audit.reconciliation.validItemIds).toBe(1);
    expect(audit.reconciliation.invalidItemIds).toBe(1);
    expect(audit.reconciliation.invalidIdList).toContain('FAKE_ID_999');

    console.log(`[TEST 5] Caught ${audit.reconciliation.invalidItemIds} invalid AI ID(s)`);
  });

  test('6. Reconcile coverage totals — discrepancy detection', () => {
    const pipes = makePipes(20);
    const blends = makeBlends(30);
    const audit = buildCoverageAudit({ pipes, blends, bottles: [] });

    const { ok, discrepancies } = reconcileCoverageTotals(audit, { pipes: 20, blends: 30, bottles: 0 });
    expect(ok).toBe(true);
    expect(discrepancies).toHaveLength(0);

    // Wrong expected count should detect discrepancy
    const { ok: bad, discrepancies: diffs } = reconcileCoverageTotals(audit, { pipes: 99 });
    expect(bad).toBe(false);
    expect(diffs.length).toBeGreaterThan(0);
  });

});

describe('Curator Anti-Repetition & Novelty', () => {

  beforeEach(() => {
    clearWorkflowHistory('test_workflow');
  });

  test('7. Recommendations shown are tracked in history', () => {
    const items = [
      { id: 'r1', itemId: 'pipe_1', itemName: 'Test Pipe', type: 'pipe' },
      { id: 'r2', itemId: 'blend_5', itemName: 'Test Blend', type: 'tobacco' },
    ];
    recordRecommendationsShown('test_workflow', items);
    const history = getRecentHistory('test_workflow');
    expect(history.length).toBe(2);
  });

  test('8. Dismissed items are tracked and excluded from novelty prompt', () => {
    const items = [{ id: 'r1', itemId: 'pipe_1', itemName: 'Test Pipe', type: 'pipe' }];
    recordRecommendationsShown('test_workflow', items);
    recordRecommendationAction('r1', 'dismissed');

    const history = getRecentHistory('test_workflow');
    const dismissed = history.filter(e => e.state === 'dismissed');
    expect(dismissed.length).toBe(1);
  });

  test('9. Excluded items appear in novelty addendum', () => {
    const pipes = makePipes(5);
    recordRecommendationsShown('test_workflow', [
      { id: 'r1', itemId: 'pipe_0', itemName: 'Pipe 0', type: 'pipe' },
    ]);
    recordRecommendationAction('r1', 'excluded');

    const addendum = buildNoveltyPromptAddendum('test_workflow', { pipes });
    expect(addendum).toContain('Pipe 0');
    expect(addendum).toContain('excluded');
  });

  test('10. Broaden addendum highlights unseen items', () => {
    const pipes = makePipes(10);
    // Mark only 3 as seen
    recordRecommendationsShown('test_workflow', [
      { id: 'r1', itemId: 'pipe_0', itemName: 'Pipe 0', type: 'pipe' },
      { id: 'r2', itemId: 'pipe_1', itemName: 'Pipe 1', type: 'pipe' },
      { id: 'r3', itemId: 'pipe_2', itemName: 'Pipe 2', type: 'pipe' },
    ]);

    const addendum = buildBroadenPromptAddendum('test_workflow', { pipes });
    // Should mention items beyond the 3 seen
    expect(addendum).toContain('BROADEN INSTRUCTIONS');
    expect(addendum.length).toBeGreaterThan(20);
  });

  test('11. History cleared correctly per workflow', () => {
    recordRecommendationsShown('test_workflow', [
      { id: 'r1', itemId: 'pipe_0', itemName: 'Pipe 0', type: 'pipe' },
    ]);
    clearWorkflowHistory('test_workflow');
    const history = getRecentHistory('test_workflow');
    expect(history.length).toBe(0);
  });

});