/**
 * Curator Coverage Audit
 *
 * Provides completeness accounting for every Curator workflow.
 * Tracks per-module item counts, eligibility, exclusions, and analyzed/recommended sets.
 * Logs proof that no items are silently omitted.
 */

import { filterAiEligibleItems } from '@/platform/aiEligibility';

/**
 * Build a full coverage audit manifest for a curator execution.
 * Call this BEFORE sending context to AI and after receiving results.
 *
 * @param {object} rawContext  - { pipes, blends, bottles, smokingLogs, tastingLogs }
 * @param {object} [aiResult]  - optional AI result with groups/items for reconciliation
 * @returns {CoverageAudit}
 */
export function buildCoverageAudit(rawContext = {}, aiResult = null) {
  const pipes = rawContext.pipes || [];
  const blends = rawContext.blends || [];
  const bottles = rawContext.bottles || [];
  const smokingLogs = rawContext.smokingLogs || rawContext.logs || [];
  const tastingLogs = rawContext.tastingLogs || [];

  // Eligible (not AI-excluded)
  const eligiblePipes = filterAiEligibleItems(pipes);
  const eligibleBlends = filterAiEligibleItems(blends);
  const eligibleBottles = filterAiEligibleItems(bottles);

  // Exclusion reasons
  const exclusionReasons = {};
  const countExcluded = (items, eligible, type) => {
    const eligibleIds = new Set(eligible.map(i => i.id));
    const excluded = items.filter(i => !eligibleIds.has(i.id));
    if (excluded.length > 0) {
      exclusionReasons[type] = excluded.map(i => ({
        id: i.id,
        name: i.name,
        reason: i.ai_excluded ? 'ai_excluded_flag' : 'unknown',
      }));
    }
    return excluded.length;
  };

  const excludedPipes = countExcluded(pipes, eligiblePipes, 'pipe');
  const excludedBlends = countExcluded(blends, eligibleBlends, 'blend');
  const excludedBottles = countExcluded(bottles, eligibleBottles, 'bottle');

  // Modules present
  const modulesIncluded = [];
  if (pipes.length > 0) modulesIncluded.push('pipe');
  if (blends.length > 0) modulesIncluded.push('tobacco');
  if (bottles.length > 0) modulesIncluded.push('whiskey');

  // Per-module breakdown
  const modules = {
    pipe: {
      total: pipes.length,
      eligible: eligiblePipes.length,
      excluded: excludedPipes,
      logs: smokingLogs.length,
    },
    tobacco: {
      total: blends.length,
      eligible: eligibleBlends.length,
      excluded: excludedBlends,
      logs: smokingLogs.length, // shared with pipe
    },
    whiskey: {
      total: bottles.length,
      eligible: eligibleBottles.length,
      excluded: excludedBottles,
      logs: tastingLogs.length,
    },
  };

  // Candidate pool — all IDs that are eligible for AI recommendations
  const candidatePool = new Set([
    ...eligiblePipes.map(p => p.id),
    ...eligibleBlends.map(b => b.id),
    ...eligibleBottles.map(b => b.id),
  ]);

  // Reconcile AI result if provided
  let reconciliation = null;
  if (aiResult) {
    const allAiItems = (aiResult.groups || []).flatMap(g => g.items || []);
    const aiReferencedIds = allAiItems.map(i => i.itemId).filter(Boolean);
    const validIds = aiReferencedIds.filter(id => candidatePool.has(id));
    const invalidIds = aiReferencedIds.filter(id => !candidatePool.has(id));

    reconciliation = {
      totalRecommendations: allAiItems.length,
      withItemId: aiReferencedIds.length,
      validItemIds: validIds.length,
      invalidItemIds: invalidIds.length,
      invalidIdList: invalidIds,
      coveragePct: candidatePool.size > 0
        ? Math.round((validIds.length / candidatePool.size) * 100)
        : 0,
    };
  }

  const audit = {
    timestamp: new Date().toISOString(),
    modulesIncluded,
    totalRawItems: pipes.length + blends.length + bottles.length,
    totalEligibleItems: eligiblePipes.length + eligibleBlends.length + eligibleBottles.length,
    totalExcluded: excludedPipes + excludedBlends + excludedBottles,
    totalLogs: smokingLogs.length + tastingLogs.length,
    candidatePoolSize: candidatePool.size,
    modules,
    exclusionReasons,
    reconciliation,
  };

  // Log to console in dev for visibility
  logCoverageAudit(audit);

  return audit;
}

/**
 * Verify that retrieved totals reconcile to source totals.
 * Returns { ok, discrepancies }
 */
export function reconcileCoverageTotals(audit, expectedCounts = {}) {
  const discrepancies = [];

  if (expectedCounts.pipes !== undefined && audit.modules.pipe.total !== expectedCounts.pipes) {
    discrepancies.push(`Pipes: expected ${expectedCounts.pipes}, got ${audit.modules.pipe.total}`);
  }
  if (expectedCounts.blends !== undefined && audit.modules.tobacco.total !== expectedCounts.blends) {
    discrepancies.push(`Blends: expected ${expectedCounts.blends}, got ${audit.modules.tobacco.total}`);
  }
  if (expectedCounts.bottles !== undefined && audit.modules.whiskey.total !== expectedCounts.bottles) {
    discrepancies.push(`Bottles: expected ${expectedCounts.bottles}, got ${audit.modules.whiskey.total}`);
  }

  return { ok: discrepancies.length === 0, discrepancies };
}

/**
 * Validate that compressed context preserves full candidate coverage.
 * The compressed summaries are built from the FULL eligible pool, never a truncated subset.
 */
export function validateCompressionCoverage(safeContext, audit) {
  const issues = [];

  const ctxPipes = (safeContext.eligiblePipeIds || []).length;
  const ctxBlends = (safeContext.eligibleBlendIds || []).length;
  const ctxBottles = (safeContext.eligibleBottleIds || []).length;

  if (ctxPipes !== audit.modules.pipe.eligible) {
    issues.push(`Pipe candidate pool mismatch: context has ${ctxPipes}, audit expects ${audit.modules.pipe.eligible}`);
  }
  if (ctxBlends !== audit.modules.tobacco.eligible) {
    issues.push(`Blend candidate pool mismatch: context has ${ctxBlends}, audit expects ${audit.modules.tobacco.eligible}`);
  }
  if (ctxBottles !== audit.modules.whiskey.eligible) {
    issues.push(`Bottle candidate pool mismatch: context has ${ctxBottles}, audit expects ${audit.modules.whiskey.eligible}`);
  }

  if (issues.length > 0) {
    console.error('[CoverageAudit] COMPRESSION COVERAGE FAILURE:', issues);
  }

  return { ok: issues.length === 0, issues };
}

/**
 * Build a human-readable coverage summary for logging/display
 */
export function formatCoverageSummary(audit) {
  const lines = [
    `[CuratorCoverage] Modules: ${audit.modulesIncluded.join(', ') || 'none'}`,
    `  Total items: ${audit.totalRawItems} raw / ${audit.totalEligibleItems} eligible / ${audit.totalExcluded} excluded`,
    `  Logs: ${audit.totalLogs} (${audit.modules.pipe.logs} smoking + ${audit.modules.whiskey.logs} tasting)`,
    `  Candidate pool: ${audit.candidatePoolSize} items`,
  ];

  for (const [mod, data] of Object.entries(audit.modules)) {
    if (data.total > 0) {
      lines.push(`  ${mod}: ${data.total} total, ${data.eligible} eligible, ${data.excluded} excluded`);
    }
  }

  if (audit.reconciliation) {
    const r = audit.reconciliation;
    lines.push(`  AI result: ${r.totalRecommendations} recs, ${r.validItemIds} valid IDs, ${r.invalidItemIds} invalid IDs`);
    if (r.invalidIdList?.length > 0) {
      lines.push(`  WARNING: Invalid IDs: ${r.invalidIdList.join(', ')}`);
    }
  }

  return lines.join('\n');
}

function logCoverageAudit(audit) {
  const summary = formatCoverageSummary(audit);
  console.log(summary);

  if (audit.reconciliation?.invalidItemIds > 0) {
    console.warn('[CuratorCoverage] WARNING: AI returned invalid item IDs — possible hallucination', {
      invalidIds: audit.reconciliation.invalidIdList,
    });
  }
}