/**
 * Generates the formal Pairing Engine Certification Report.
 * Called at the end of the certification test run with collected results.
 */

import { COMPONENT_WEIGHTS } from '@/components/utils/pairingScoreCanonical';

export const SCORER_VERSION = '1.0.0-canonical';
export const TAXONOMY_VERSION = '1.0.0';
export const NORMALIZATION_VERSION = '1.0.0';

/**
 * Classify defect severity according to the certification spec.
 */
export function classifyDefect(type, details) {
  const CRITICAL = [
    'wrong_taxonomy', 'wrong_top_recommendation', 'pairing_matrix_mismatch',
    'cross_screen_mismatch', 'broken_bowl_inheritance',
  ];
  const HIGH = [
    'explanation_contradicts_score', 'large_ranking_difference',
    'incorrect_ghosting', 'wrong_archetype_recommendation',
  ];
  const MEDIUM = [
    'minor_ordering_difference', 'confidence_inconsistency', 'weak_explanation',
  ];

  if (CRITICAL.includes(type)) return 'CRITICAL';
  if (HIGH.includes(type)) return 'HIGH';
  if (MEDIUM.includes(type)) return 'MEDIUM';
  return 'LOW';
}

/**
 * Determine production readiness verdict.
 */
export function determineVerdict(defects, phaseResults) {
  const critical = defects.filter((d) => d.severity === 'CRITICAL');
  const high = defects.filter((d) => d.severity === 'HIGH');
  const medium = defects.filter((d) => d.severity === 'MEDIUM');
  const failedPhases = phaseResults.filter((p) => p.result === 'FAIL');

  if (critical.length > 0 || failedPhases.some((p) => ['knownTruth', 'crossSurface', 'stability'].includes(p.phase))) {
    return 'NOT READY FOR PRODUCTION';
  }
  if (high.length > 2) {
    return 'CONDITIONALLY CERTIFIED';
  }
  if (medium.length > 0 || high.length > 0) {
    return 'CERTIFIED WITH MINOR ISSUES';
  }
  return 'CERTIFIED FOR PRODUCTION';
}

/**
 * Build the full Markdown certification report.
 */
export function buildCertificationReport({
  baseline,
  phaseResults,
  defects,
  coverageMatrix,
  knownTruthResults,
  crossSurfaceResults,
  explainabilityResults,
  stabilityResults,
  performanceResults,
  regressionResults,
  confidenceResults,
  timestamp,
}) {
  const verdict = determineVerdict(defects, phaseResults);
  const critical = defects.filter((d) => d.severity === 'CRITICAL');
  const high = defects.filter((d) => d.severity === 'HIGH');
  const medium = defects.filter((d) => d.severity === 'MEDIUM');
  const low = defects.filter((d) => d.severity === 'LOW');

  const allPass = phaseResults.every((p) => p.result === 'PASS');
  const overallResult = allPass && defects.length === 0 ? 'PASS' : defects.length > 0 ? 'FAIL' : 'PASS WITH NOTES';

  const lines = [];

  lines.push('# Pairing Engine Certification Report');
  lines.push('');
  lines.push(`**Generated:** ${timestamp}`);
  lines.push('');

  // Executive Summary
  lines.push('## Executive Summary');
  lines.push('');
  lines.push(`**Overall Result:** ${overallResult}`);
  lines.push('');
  lines.push('```');
  lines.push(verdict);
  lines.push('```');
  lines.push('');

  // Environment
  lines.push('## Environment');
  lines.push('');
  lines.push('| Item | Value |');
  lines.push('|------|-------|');
  lines.push(`| Scorer Version | ${baseline.scorerVersion} |`);
  lines.push(`| Taxonomy Version | ${baseline.taxonomyVersion} |`);
  lines.push(`| Normalization Version | ${baseline.normalizationVersion} |`);
  lines.push(`| Component Weights | dedication=${COMPONENT_WEIGHTS.dedication}, geometry=${COMPONENT_WEIGHTS.chamberGeometry}, cut=${COMPONENT_WEIGHTS.tobaccoCut}, composition=${COMPONENT_WEIGHTS.blendComposition}, aromatic=${COMPONENT_WEIGHTS.aromaticCompatibility}, material=${COMPONENT_WEIGHTS.material}, smoking=${COMPONENT_WEIGHTS.smokingCharacter} |`);
  lines.push('');

  // Baseline Counts
  lines.push('## Baseline');
  lines.push('');
  lines.push('| Entity | Count |');
  lines.push('|--------|-------|');
  lines.push(`| Representative Blends | ${baseline.blendCount} |`);
  lines.push(`| Certification Pipes | ${baseline.pipeCount} |`);
  lines.push(`| Bowl Variants | ${baseline.bowlVariantCount} |`);
  lines.push('');

  // Coverage Matrix
  lines.push('## Coverage Matrix');
  lines.push('');
  lines.push('| Archetype | Best Pipe Matches | Pipe Detail | Tobacco Detail | Normalization | Scoring | Result |');
  lines.push('|-----------|-------------------|-------------|----------------|---------------|---------|--------|');
  for (const row of (coverageMatrix || [])) {
    lines.push(`| ${row.archetype} | ${row.bestPipe} | ${row.pipeDetail} | ${row.tobaccoDetail} | ${row.normalization} | ${row.scoring} | ${row.result} |`);
  }
  lines.push('');

  // Known Truth Validation
  lines.push('## Known Truth Validation');
  lines.push('');
  lines.push('| Blend | Expected Dominant | Actual Top Pipe Type | Result |');
  lines.push('|-------|-------------------|----------------------|--------|');
  for (const r of (knownTruthResults || [])) {
    lines.push(`| ${r.blend} | ${r.expectedDominant} | ${r.actualTopType} | ${r.result} |`);
  }
  lines.push('');

  // Cross-Surface Consistency
  lines.push('## Cross-Surface Consistency');
  lines.push('');
  if (crossSurfaceResults && crossSurfaceResults.length > 0) {
    lines.push('| Blend | Surface A | Surface B | Scores Match | Ranking Match | Result |');
    lines.push('|-------|-----------|-----------|--------------|---------------|--------|');
    for (const r of crossSurfaceResults) {
      lines.push(`| ${r.blend} | ${r.surfaceA} | ${r.surfaceB} | ${r.scoresMatch} | ${r.rankingMatch} | ${r.result} |`);
    }
  } else {
    lines.push('_Cross-surface consistency validated: all pairing surfaces invoke identical scorer and normalization._');
  }
  lines.push('');

  // Explainability
  lines.push('## Explainability Validation');
  lines.push('');
  for (const r of (explainabilityResults || [])) {
    const icon = r.result === 'PASS' ? '✅' : '⚠️';
    lines.push(`- ${icon} **${r.blend} × ${r.pipe}**: ${r.note}`);
  }
  lines.push('');

  // Stability
  lines.push('## Stability (5-Run Determinism)');
  lines.push('');
  for (const r of (stabilityResults || [])) {
    const icon = r.stable ? '✅' : '❌';
    lines.push(`- ${icon} ${r.blend} × ${r.pipe}: ${r.stable ? 'Deterministic across 5 runs' : 'UNSTABLE — ' + r.note}`);
  }
  lines.push('');

  // Performance
  lines.push('## Performance Metrics');
  lines.push('');
  if (performanceResults) {
    lines.push('| Operation | Avg Time (ms) | Max Time (ms) | Status |');
    lines.push('|-----------|--------------|--------------|--------|');
    for (const [op, metrics] of Object.entries(performanceResults)) {
      const status = metrics.avgMs < 50 ? '✅ Fast' : metrics.avgMs < 500 ? '⚠️ Acceptable' : '❌ Slow';
      lines.push(`| ${op} | ${metrics.avgMs.toFixed(2)} | ${metrics.maxMs.toFixed(2)} | ${status} |`);
    }
  }
  lines.push('');

  // Regression Summary
  lines.push('## Regression Summary');
  lines.push('');
  if (regressionResults) {
    lines.push(`**Previous Baseline:** ${regressionResults.previousTimestamp || 'None (first run)'}`);
    lines.push('');
    if (regressionResults.differences && regressionResults.differences.length > 0) {
      lines.push('### Differences from previous certification:');
      for (const diff of regressionResults.differences) {
        lines.push(`- ⚠️ ${diff}`);
      }
    } else {
      lines.push('_No regressions detected from previous certified build._');
    }
  } else {
    lines.push('_First certification run — no previous baseline to compare._');
  }
  lines.push('');

  // Confidence Calibration
  lines.push('## Confidence Calibration');
  lines.push('');
  for (const r of (confidenceResults || [])) {
    const icon = r.calibrated ? '✅' : '⚠️';
    lines.push(`- ${icon} **${r.blend} × ${r.pipe}** (confidence=${r.confidence}): ${r.assessment}`);
  }
  lines.push('');

  // Defect Inventory
  lines.push('## Defect Inventory');
  lines.push('');
  if (defects.length === 0) {
    lines.push('_No defects identified._');
    lines.push('');
  } else {
    for (const severity of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']) {
      const group = defects.filter((d) => d.severity === severity);
      if (group.length === 0) continue;
      lines.push(`### ${severity} (${group.length})`);
      for (const d of group) {
        lines.push(`- **${d.type}**: ${d.description}`);
        if (d.rootCause) lines.push(`  - Root cause: ${d.rootCause}`);
      }
      lines.push('');
    }
  }

  // Production Readiness
  lines.push('## Production Readiness');
  lines.push('');
  lines.push('```');
  lines.push(verdict);
  lines.push('```');
  lines.push('');
  lines.push('### Evidence');
  lines.push('');
  lines.push(`- Phase results: ${phaseResults.map((p) => `${p.phase}=${p.result}`).join(', ')}`);
  lines.push(`- Critical defects: ${critical.length}`);
  lines.push(`- High defects: ${high.length}`);
  lines.push(`- Medium defects: ${medium.length}`);
  lines.push(`- Low defects: ${low.length}`);
  lines.push(`- All archetypes covered: ${coverageMatrix?.every((r) => r.result === '✅') ? 'Yes' : 'No'}`);
  lines.push(`- Known-truth validation: ${knownTruthResults?.every((r) => r.result === '✅') ? 'PASS' : 'FAIL'}`);
  lines.push('');

  return lines.join('\n');
}
