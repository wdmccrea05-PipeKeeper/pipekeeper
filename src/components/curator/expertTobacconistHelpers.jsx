/**
 * EXPERT TOBACCONIST HELPER LAYER
 * 
 * Domain-specific tobacco expert functions for Curator actions.
 * Prepares structured inputs for Expert Tobacconist workflows:
 *   - reclassification candidate detection
 *   - normalization issue identification
 *   - specialization profiling
 *   - optimization signal generation
 *   - cellar analysis
 * 
 * These helpers work from real collection data and feed structured
 * context into Expert Tobacconist prompts.
 */

import {
  normalizeBlendType,
  needsNormalization,
  suggestBlendTypeNormalization,
  getBlendFamilyGroup,
  getCellarCharacteristics,
  isAgingWorthy,
  CANONICAL_BLEND_FAMILIES,
  CANONICAL_BLEND_FAMILIES_LIST,
  BLEND_FAMILY_GROUPS,
} from '@/components/tobacco/tobaccoClassificationConstants';

// ─── RECLASSIFICATION CANDIDATES ────────────────────────────────────────────

/**
 * Identify tobacco blends that need classification review.
 * Returns candidates prioritized by recency and certainty of fix.
 * 
 * @param {object[]} blends - TobaccoBlend records
 * @returns {object[]} - Candidate blends needing reclassification
 */
export function getTobaccoReclassificationCandidates(blends = []) {
  const candidates = [];

  blends.forEach(blend => {
    const reasons = [];

    // Missing classification
    if (!blend.blend_type) {
      reasons.push("missing_classification");
    }

    // Non-canonical classification
    else if (needsNormalization(blend.blend_type)) {
      const suggested = suggestBlendTypeNormalization(blend.blend_type);
      reasons.push("non_canonical");
      candidates.push({
        ...blend,
        issue_type: "non_canonical",
        suggested_canonical: suggested,
        confidence: suggested ? 0.95 : 0.3,
        priority: suggested ? "high" : "low",
      });
      return;
    }

    // Weak metadata (no components, strength, room_note)
    if (blend.blend_type && !blend.tobacco_components && !blend.strength && !blend.room_note) {
      reasons.push("weak_metadata");
    }

    // Handle "Other" classification (catch-all)
    if (blend.blend_type === CANONICAL_BLEND_FAMILIES.OTHER) {
      reasons.push("generic_classification");
    }

    if (reasons.length > 0) {
      candidates.push({
        ...blend,
        issue_type: reasons.length === 1 ? reasons[0] : "multiple_issues",
        issue_reasons: reasons,
        priority: blend.blend_type ? "medium" : "high",
      });
    }
  });

  // Sort by priority (high first), then by recency
  candidates.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const aPri = priorityOrder[a.priority] ?? 2;
    const bPri = priorityOrder[b.priority] ?? 2;
    if (aPri !== bPri) return aPri - bPri;

    const aDate = new Date(a.created_date || 0).getTime();
    const bDate = new Date(b.created_date || 0).getTime();
    return bDate - aDate;
  });

  return candidates;
}

/**
 * Get a summary of normalization issues in the blend collection.
 * 
 * @param {object[]} blends - TobaccoBlend records
 * @returns {object} - Summary of issues
 */
export function getTobaccoNormalizationIssues(blends = []) {
  const candidates = getTobaccoReclassificationCandidates(blends);
  
  const summary = {
    total_blends: blends.length,
    candidates_needing_review: candidates.length,
    missing_classification: 0,
    non_canonical: 0,
    weak_metadata: 0,
    generic_classification: 0,
    candidates_with_suggestion: 0,
  };

  candidates.forEach(c => {
    if (c.issue_type === "missing_classification") summary.missing_classification++;
    if (c.issue_type === "non_canonical") {
      summary.non_canonical++;
      if (c.suggested_canonical) summary.candidates_with_suggestion++;
    }
    if (c.issue_type === "weak_metadata") summary.weak_metadata++;
    if (c.issue_type === "generic_classification") summary.generic_classification++;
  });

  return summary;
}

// ─── SPECIALIZATION PROFILING ───────────────────────────────────────────────

/**
 * Analyze tobacco specialization patterns in the collection.
 * Identifies collection focus areas and gaps.
 * 
 * @param {object[]} blends - TobaccoBlend records
 * @param {object[]} smokingLogs - SmokingLog records (optional, for usage weighting)
 * @returns {object} - Specialization profile
 */
export function getTobaccoSpecializationProfile(blends = [], smokingLogs = []) {
  if (!blends.length) {
    return {
      specializations: [],
      gaps: [],
      concentration: 0,
      diversity: 0,
      focus_pattern: "no_data",
    };
  }

  // Count blends by family
  const familyCounts = {};
  const familyUsage = {};

  blends.forEach(b => {
    const fam = b.blend_type || CANONICAL_BLEND_FAMILIES.OTHER;
    familyCounts[fam] = (familyCounts[fam] || 0) + 1;
  });

  // Weight by smoking logs
  smokingLogs.forEach(log => {
    const blend = blends.find(b => b.id === log.blend_id);
    if (!blend) return;
    const fam = blend.blend_type || CANONICAL_BLEND_FAMILIES.OTHER;
    familyUsage[fam] = (familyUsage[fam] || 0) + 1;
  });

  // Identify specializations (>15% of collection)
  const totalBlends = blends.length;
  const specializations = [];
  const gaps = [];

  Object.entries(familyCounts).forEach(([fam, count]) => {
    const pct = count / totalBlends;
    const usage = familyUsage[fam] || 0;
    const group = getBlendFamilyGroup(fam);

    if (pct > 0.15) {
      specializations.push({
        family: fam,
        count,
        pct: Math.round(pct * 100),
        usage_count: usage,
        group,
        focus_strength: pct > 0.3 ? "strong" : "moderate",
      });
    }
  });

  // Identify gaps (missing major families)
  const representedFamilies = new Set(Object.keys(familyCounts));
  const majorFamilies = Object.values(BLEND_FAMILY_GROUPS)
    .flat()
    .filter((fam, idx, arr) => arr.indexOf(fam) === idx);

  majorFamilies.forEach(fam => {
    if (!representedFamilies.has(fam) && fam !== CANONICAL_BLEND_FAMILIES.OTHER) {
      const group = getBlendFamilyGroup(fam);
      gaps.push({ family: fam, group });
    }
  });

  // Calculate concentration (how focused collection is)
  const concentrationPct = specializations.length > 0
    ? Math.max(...specializations.map(s => s.pct)) / 100
    : 0;

  // Calculate diversity (unique families)
  const diversity = Object.keys(familyCounts).length;

  // Determine focus pattern
  let focusPattern = "balanced";
  if (specializations.length === 0) focusPattern = "generalist";
  else if (specializations.length === 1 && concentrationPct > 0.4) focusPattern = "specialist";
  else if (specializations.length <= 2) focusPattern = "focused";

  // Sort specializations by strength
  specializations.sort((a, b) => b.pct - a.pct);

  return {
    specializations,
    gaps,
    concentration: concentrationPct,
    diversity,
    focus_pattern: focusPattern,
    primary_specialization: specializations[0] || null,
    usage_weighted_top: Object.entries(familyUsage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([fam, usage]) => ({ family: fam, usage_count: usage })),
  };
}

// ─── OPTIMIZATION SIGNALS ──────────────────────────────────────────────────

/**
 * Identify tobacco-specific optimization opportunities.
 * Detects collection imbalances and aging potential.
 * 
 * @param {object[]} blends - TobaccoBlend records
 * @param {object[]} smokingLogs - SmokingLog records
 * @returns {object} - Optimization signals
 */
export function getTobaccoOptimizationSignals(blends = [], smokingLogs = []) {
  const signals = [];

  if (!blends.length) {
    return {
      signals,
      optimization_opportunities: 0,
    };
  }

  // 1. Cellar depth analysis
  const cellaredBlends = blends.filter(b => {
    const tinsCellared = b.tin_tins_cellared || 0;
    const pouchsCellared = b.pouch_pouches_cellared || 0;
    const bulkCellared = b.bulk_cellared || 0;
    return tinsCellared + pouchsCellared + bulkCellared > 0;
  });

  const agingWorthyBlends = cellaredBlends.filter(b => isAgingWorthy(b.blend_type));

  if (cellaredBlends.length === 0) {
    signals.push({
      category: "cellar_depth",
      severity: "info",
      message: "No cellared tobacco detected. Consider aging high-priority blends.",
    });
  } else if (agingWorthyBlends.length < cellaredBlends.length * 0.5) {
    signals.push({
      category: "cellar_composition",
      severity: "low",
      message: `${cellaredBlends.length - agingWorthyBlends.length} cellared blends have limited aging potential. Focus cellaring on Virginia, Latakia, or English blends.`,
    });
  } else {
    signals.push({
      category: "cellar_composition",
      severity: "positive",
      message: `${agingWorthyBlends.length} aging-worthy blends cellared. Good cellar strategy.`,
    });
  }

  // 2. Rotation vs. cellar balance
  const openBlends = blends.filter(b => {
    const tinsOpen = b.tin_tins_open || 0;
    const pouchsOpen = b.pouch_pouches_open || 0;
    const bulkOpen = b.bulk_open || 0;
    return tinsOpen + pouchsOpen + bulkOpen > 0;
  });

  const openRatio = openBlends.length / blends.length;
  if (openRatio < 0.3) {
    signals.push({
      category: "rotation_balance",
      severity: "medium",
      message: `Only ${Math.round(openRatio * 100)}% of collection is open for regular rotation. Open more blends to diversify smoking sessions.`,
    });
  } else if (openRatio > 0.8) {
    signals.push({
      category: "rotation_balance",
      severity: "info",
      message: `${Math.round(openRatio * 100)}% of collection is open. Consider cellaring more high-potential blends.`,
    });
  }

  // 3. Smoking frequency vs. inventory
  const usedBlends = blends.filter(b => {
    const blendLogs = smokingLogs.filter(log => log.blend_id === b.id);
    return blendLogs.length > 0;
  });

  const unusedBlends = blends.filter(b => {
    const blendLogs = smokingLogs.filter(log => log.blend_id === b.id);
    return blendLogs.length === 0;
  });

  if (unusedBlends.length > blends.length * 0.3) {
    signals.push({
      category: "usage_gap",
      severity: "low",
      message: `${unusedBlends.length} blends have never been smoked. Consider them for next session or evaluation.`,
    });
  }

  // 4. Inventory depletion
  const depletingBlends = blends.filter(b => {
    const totalTins = b.tin_total_tins || 0;
    const tinsOpen = b.tin_tins_open || 0;
    const totalPouchs = b.pouch_total_pouches || 0;
    const pounchsOpen = b.pouch_pouches_open || 0;

    return (tinsOpen > 0 && tinsOpen === totalTins && totalTins > 0) ||
           (pounchsOpen > 0 && pounchsOpen === totalPouchs && totalPouchs > 0);
  });

  if (depletingBlends.length > 0) {
    signals.push({
      category: "inventory_depletion",
      severity: "info",
      message: `${depletingBlends.length} blend(s) are fully open with no cellared stock. Consider restocking or adjusting opening strategy.`,
    });
  }

  // 5. Metadata richness
  const weakMetadataBlends = blends.filter(b => !b.tobac_components && !b.strength && !b.room_note);
  if (weakMetadataBlends.length > blends.length * 0.3) {
    signals.push({
      category: "metadata_quality",
      severity: "low",
      message: `${weakMetadataBlends.length} blends lack detailed metadata (components, strength, room note). Enhancing metadata improves AI recommendations.`,
    });
  }

  // 6. Family concentration risk
  const spec = getTobaccoSpecializationProfile(blends, smokingLogs);
  if (spec.specializations.length === 1 && spec.concentration > 0.5) {
    signals.push({
      category: "family_concentration",
      severity: "medium",
      message: `Collection is heavily concentrated in ${spec.primary_specialization.family} (${spec.primary_specialization.pct}%). Consider diversifying into underrepresented families.`,
    });
  }

  return {
    signals,
    optimization_opportunities: signals.filter(s => s.severity === "medium" || s.severity === "low").length,
  };
}

// ─── CONTEXT BUILDERS ───────────────────────────────────────────────────────

/**
 * Build the Expert Tobacconist context block for Curator prompts.
 * Injects structured tobacco-domain information.
 * 
 * @param {object[]} blends - TobaccoBlend records
 * @param {object[]} smokingLogs - SmokingLog records
 * @returns {string} - Natural-language context for Expert Tobacconist prompt
 */
export function buildExpertTobacconistContext(blends = [], smokingLogs = []) {
  const lines = [];

  lines.push("EXPERT TOBACCONIST CONTEXT:");
  lines.push("────────────────────────────────────────────────────────────");

  // Collection overview
  lines.push(`Total tobacco blends owned: ${blends.length}`);

  if (blends.length === 0) {
    lines.push("(No tobacco collection data available.)");
    return lines.join("\n");
  }

  // Reclassification candidates
  const reclassifyIssues = getTobaccoNormalizationIssues(blends);
  if (reclassifyIssues.candidates_needing_review > 0) {
    lines.push(`\nClassification status:\n  - ${reclassifyIssues.candidates_needing_review} blends need classification review`);
    if (reclassifyIssues.missing_classification > 0) {
      lines.push(`  - ${reclassifyIssues.missing_classification} missing classification`);
    }
    if (reclassifyIssues.non_canonical > 0) {
      lines.push(`  - ${reclassifyIssues.non_canonical} non-canonical variants`);
      if (reclassifyIssues.candidates_with_suggestion > 0) {
        lines.push(`  - ${reclassifyIssues.candidates_with_suggestion} can be auto-normalized`);
      }
    }
  } else {
    lines.push("\nClassification status: All blends properly classified ✓");
  }

  // Specialization
  const spec = getTobaccoSpecializationProfile(blends, smokingLogs);
  if (spec.specializations.length > 0) {
    lines.push("\nSpecialization profile:");
    spec.specializations.forEach(s => {
      const usage = s.usage_count > 0 ? ` (${s.usage_count} sessions)` : "";
      lines.push(`  - ${s.family}: ${s.count} blends (${s.pct}% of collection)${usage}`);
    });
  }

  if (spec.gaps.length > 0) {
    lines.push("\nUnderrepresented families (diversification opportunity):");
    spec.gaps.slice(0, 5).forEach(g => {
      lines.push(`  - ${g.family}`);
    });
  }

  // Optimization signals
  const optSignals = getTobaccoOptimizationSignals(blends, smokingLogs);
  if (optSignals.signals.length > 0) {
    lines.push("\nOptimization signals:");
    optSignals.signals.forEach(s => {
      const icon = s.severity === "positive" ? "✓" : s.severity === "info" ? "ℹ" : "⚠";
      lines.push(`  ${icon} ${s.category}: ${s.message}`);
    });
  }

  lines.push("────────────────────────────────────────────────────────────");

  return lines.join("\n");
}

/**
 * Build reclassification candidates context.
 * For "Reclassify Tobacco Blends" action.
 * 
 * @param {object[]} blends - TobaccoBlend records
 * @returns {string} - Candidates list for Expert prompt
 */
export function buildReclassificationCandidatesContext(blends = []) {
  const candidates = getTobaccoReclassificationCandidates(blends);

  if (candidates.length === 0) {
    return "No reclassification candidates found. All blends are properly classified.";
  }

  const lines = [];
  lines.push(`${candidates.length} tobacco blends need classification review:\n`);

  candidates.slice(0, 20).forEach((c, idx) => {
    const blendName = c.name || "(unnamed)";
    const manufacturer = c.manufacturer ? ` by ${c.manufacturer}` : "";
    const currentType = c.blend_type ? `[currently: ${c.blend_type}]` : "[no classification]";
    const suggested = c.suggested_canonical ? ` → suggest: ${c.suggested_canonical}` : "";

    lines.push(`${idx + 1}. ${blendName}${manufacturer} ${currentType}${suggested}`);
  });

  if (candidates.length > 20) {
    lines.push(`\n... and ${candidates.length - 20} more`);
  }

  return lines.join("\n");
}

/**
 * Build specialization context for recommendations.
 * For "Recommend Specializations" action.
 * 
 * @param {object[]} blends - TobaccoBlend records
 * @param {object[]} smokingLogs - SmokingLog records
 * @returns {string} - Specialization analysis for Expert prompt
 */
export function buildSpecializationContext(blends = [], smokingLogs = []) {
  const spec = getTobaccoSpecializationProfile(blends, smokingLogs);

  if (blends.length === 0) {
    return "No tobacco collection data available for specialization analysis.";
  }

  const lines = [];
  lines.push(`TOBACCO COLLECTION SPECIALIZATION ANALYSIS:\n`);
  lines.push(`Pattern: ${spec.focus_pattern} (${spec.diversity} unique families)`);

  if (spec.specializations.length > 0) {
    lines.push("\nCurrent strengths:");
    spec.specializations.forEach(s => {
      lines.push(`  • ${s.family}: ${s.count} blends (${s.pct}%, ${s.usage_count} sessions)`);
    });
  }

  if (spec.gaps.length > 0) {
    lines.push("\nDiversification opportunities:");
    spec.gaps.slice(0, 5).forEach(g => {
      lines.push(`  • ${g.family} (group: ${g.group})`);
    });
  }

  if (spec.usage_weighted_top.length > 0) {
    lines.push("\nMost frequently smoked:");
    spec.usage_weighted_top.forEach(item => {
      lines.push(`  • ${item.family}: ${item.usage_count} sessions`);
    });
  }

  return lines.join("\n");
}

/**
 * Build optimization context for collection optimization.
 * For "Optimize Collection" action (tobacco component).
 * 
 * @param {object[]} blends - TobaccoBlend records
 * @param {object[]} smokingLogs - SmokingLog records
 * @returns {string} - Optimization analysis for Expert prompt
 */
export function buildOptimizationContext(blends = [], smokingLogs = []) {
  const optSignals = getTobaccoOptimizationSignals(blends, smokingLogs);

  if (blends.length === 0) {
    return "No tobacco collection data for optimization.";
  }

  const lines = [];
  lines.push(`TOBACCO OPTIMIZATION ANALYSIS:\n`);

  optSignals.signals.forEach(s => {
    const icon = s.severity === "positive" ? "✓" : s.severity === "info" ? "ℹ" : "⚠";
    lines.push(`${icon} [${s.category}] ${s.message}`);
  });

  const spec = getTobaccoSpecializationProfile(blends, smokingLogs);
  if (spec.specializations.length > 0) {
    lines.push(`\nCollection focus: ${spec.focus_pattern.toUpperCase()}`);
    if (spec.primary_specialization) {
      lines.push(`  Primary: ${spec.primary_specialization.family} (${spec.primary_specialization.pct}%)`);
    }
  }

  return lines.join("\n");
}