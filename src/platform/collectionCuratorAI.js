// platform/collectionCuratorAI.js
// Collection Curator AI — module-aware reasoning service for the CollectionKeeper platform.
//
// This service sits between the AI UI components and the underlying LLM calls.
// It normalizes collection items through the module adapter layer, enforces AI
// eligibility rules, and attaches structured reasoning to all AI outputs.
//
// Current active modules: pipe, tobacco.
// Future modules (whiskey, cigar, coffee) register adapters in moduleAdapters/index.js
// and will automatically gain AI reasoning support without changes here.
//
// Structured AI output shape:
//   recommendation  — the primary suggestion or result
//   reason          — clear explanation of why this recommendation was made
//   confidence      — optional 0–1 score indicating certainty
//   suggestedAction — what the user should do next

import { ACTIVE_MODULES, MODULE_TYPES } from "./moduleTypes.js";
import { filterAiEligibleItems } from "./aiEligibility.js";
import { getAdapter } from "./moduleAdapters/index.js";

// ─── Structured AI Result ────────────────────────────────────────────────────

/**
 * Wrap a raw AI result in the standard structured reasoning envelope.
 *
 * @param {object} params
 * @param {string} params.recommendation - Primary AI suggestion.
 * @param {string} params.reason         - Explanation for the recommendation.
 * @param {number} [params.confidence]   - Optional 0–1 confidence score.
 * @param {string} [params.suggestedAction] - What the user should do next.
 * @param {object} [params.data]         - Additional module-specific data.
 * @returns {object}
 */
export function buildStructuredResult({ recommendation, reason, confidence, suggestedAction, data }) {
  return {
    recommendation: recommendation ?? "",
    reason: reason ?? "",
    confidence: confidence != null ? Math.max(0, Math.min(1, confidence)) : null,
    suggestedAction: suggestedAction ?? null,
    data: data ?? null,
  };
}

// ─── Module Context Building ──────────────────────────────────────────────────

/**
 * Build a normalized context object for AI prompts.
 * Each item is passed through its module adapter to expose normalized attributes.
 * Items with ai_excluded = true are stripped before the context is built.
 *
 * @param {object} params
 * @param {object[]} [params.pipes]   - Raw Pipe records.
 * @param {object[]} [params.blends]  - Raw TobaccoBlend records.
 * @returns {{
 *   activeModules: string[],
 *   itemsByModule: Record<string, object[]>,
 *   usageProfilesByModule: Record<string, object[]>,
 *   eligibleItemCount: number,
 *   totalItemCount: number,
 * }}
 */
export function buildAIContext({ pipes = [], blends = [] } = {}) {
  const pipeAdapter = getAdapter(MODULE_TYPES.PIPE);
  const tobaccoAdapter = getAdapter(MODULE_TYPES.TOBACCO);

  // Enforce AI exclusion at the platform level
  const eligiblePipes = filterAiEligibleItems(pipes);
  const eligibleBlends = filterAiEligibleItems(blends);

  const normalizedPipes = pipeAdapter
    ? eligiblePipes.map((p) => pipeAdapter.normalizeItem(p))
    : eligiblePipes;

  const normalizedBlends = tobaccoAdapter
    ? eligibleBlends.map((b) => tobaccoAdapter.normalizeItem(b))
    : eligibleBlends;

  const pipeUsageProfiles = pipeAdapter
    ? eligiblePipes.map((p) => ({ id: p.id, ...pipeAdapter.getUsageProfile(p) }))
    : [];

  const tobaccoUsageProfiles = tobaccoAdapter
    ? eligibleBlends.map((b) => ({ id: b.id, ...tobaccoAdapter.getUsageProfile(b) }))
    : [];

  const totalItemCount = pipes.length + blends.length;
  const eligibleItemCount = eligiblePipes.length + eligibleBlends.length;

  return {
    activeModules: ACTIVE_MODULES,
    itemsByModule: {
      [MODULE_TYPES.PIPE]: normalizedPipes,
      [MODULE_TYPES.TOBACCO]: normalizedBlends,
    },
    usageProfilesByModule: {
      [MODULE_TYPES.PIPE]: pipeUsageProfiles,
      [MODULE_TYPES.TOBACCO]: tobaccoUsageProfiles,
    },
    eligibleItemCount,
    totalItemCount,
    excludedItemCount: totalItemCount - eligibleItemCount,
  };
}

// ─── Module-Aware Prompt Builder ─────────────────────────────────────────────

/**
 * Build the module-context preamble that all Collection Curator AI prompts should include.
 * Makes the AI aware of which modules are active and what types of items it is reasoning about.
 *
 * @param {object} aiContext - Output of buildAIContext().
 * @returns {string}
 */
export function buildModuleAwarePromptPreamble(aiContext) {
  const moduleList = (aiContext.activeModules || [])
    .map((m) => m.charAt(0).toUpperCase() + m.slice(1))
    .join(" and ");

  const pipeCount = aiContext.itemsByModule?.[MODULE_TYPES.PIPE]?.length ?? 0;
  const tobaccoCount = aiContext.itemsByModule?.[MODULE_TYPES.TOBACCO]?.length ?? 0;
  const excludedCount = aiContext.excludedItemCount ?? 0;

  const exclusionNote =
    excludedCount > 0
      ? `\n[AI Exclusion: ${excludedCount} collector-only item(s) have been excluded from this analysis.]`
      : "";

  return (
    `You are the Collection Curator AI, an expert advisor for the CollectionKeeper platform.\n` +
    `Active modules: ${moduleList}.\n` +
    `Collection context: ${pipeCount} pipe(s), ${tobaccoCount} tobacco blend(s) available for AI analysis.` +
    exclusionNote +
    `\n\nFor every recommendation you must provide:\n` +
    `- Recommendation: clear, specific suggestion\n` +
    `- Reason: why this recommendation fits this collection\n` +
    `- Suggested Action: what the user should do next\n`
  );
}

// ─── Optimize Scope Descriptors ──────────────────────────────────────────────

/**
 * Canonical list of optimization scope options available in the current build.
 * Future modules add entries here when their adapters are registered.
 */
export const OPTIMIZE_SCOPES = [
  {
    id: "pipe_rotation",
    label: "Optimize Pipe Rotation",
    description: "Analyze pipe usage patterns and recommend rotation improvements.",
    modules: [MODULE_TYPES.PIPE],
  },
  {
    id: "tobacco_usage",
    label: "Optimize Tobacco Usage",
    description: "Review aging, inventory levels, and consumption patterns.",
    modules: [MODULE_TYPES.TOBACCO],
  },
  {
    id: "pipe_tobacco_pairings",
    label: "Optimize Pipe + Tobacco Pairings",
    description: "Maximize pairing compatibility across your full collection.",
    modules: [MODULE_TYPES.PIPE, MODULE_TYPES.TOBACCO],
  },
  // Future scopes (inactive until modules launch):
  // { id: "whiskey_collection", label: "Optimize Whiskey Collection", modules: [MODULE_TYPES.WHISKEY] },
  // { id: "cross_collection", label: "Optimize Cross-Collection Pairings", modules: [MODULE_TYPES.PIPE, MODULE_TYPES.WHISKEY] },
];

/**
 * Return the active optimization scopes for the current build.
 * Only scopes whose modules are all in ACTIVE_MODULES are included.
 *
 * @returns {typeof OPTIMIZE_SCOPES}
 */
export function getActiveOptimizeScopes() {
  return OPTIMIZE_SCOPES.filter((scope) =>
    scope.modules.every((m) => ACTIVE_MODULES.includes(m))
  );
}

// ─── Identify Item Types ─────────────────────────────────────────────────────

/**
 * Item type options for the AI Identify tab.
 * Currently only pipe and tobacco are active.
 * Future types (whiskey_bottle, cigar_band, coffee_label) will be enabled when their modules launch.
 */
export const IDENTIFY_ITEM_TYPES = [
  { id: "pipe", label: "Pipe", active: true, module: MODULE_TYPES.PIPE },
  { id: "tobacco_tin", label: "Tobacco Tin", active: true, module: MODULE_TYPES.TOBACCO },
  // Future (inactive):
  // { id: "whiskey_bottle", label: "Whiskey Bottle", active: false, module: MODULE_TYPES.WHISKEY },
  // { id: "cigar_band", label: "Cigar Band", active: false, module: MODULE_TYPES.CIGAR },
  // { id: "coffee_label", label: "Coffee Label", active: false, module: MODULE_TYPES.COFFEE },
];

/**
 * Return the currently active identify item types.
 * @returns {typeof IDENTIFY_ITEM_TYPES}
 */
export function getActiveIdentifyTypes() {
  return IDENTIFY_ITEM_TYPES.filter((t) => t.active);
}

// ─── AI Update Insight Types ──────────────────────────────────────────────────

/**
 * Structured insight categories shown in the AI Updates panel.
 * Maps to the kinds of background recalculation the AI performs.
 */
export const AI_INSIGHT_TYPES = {
  PAIRING_REFRESH: "pairing_matrix_refreshed",
  OPTIMIZATION_RECALC: "collection_optimization_recalculated",
  FLAVOR_CLASSIFICATION: "new_flavor_classification_detected",
  ROTATION_UPDATE: "rotation_analysis_updated",
};

/**
 * Build a structured insight summary for an AI update event.
 *
 * @param {string} insightType - One of AI_INSIGHT_TYPES values.
 * @param {object} [details]   - Optional details to include.
 * @returns {{ type: string, label: string, details: object|null }}
 */
export function buildInsightSummary(insightType, details = null) {
  const labels = {
    [AI_INSIGHT_TYPES.PAIRING_REFRESH]: "Pairing matrix refreshed",
    [AI_INSIGHT_TYPES.OPTIMIZATION_RECALC]: "Collection optimization recalculated",
    [AI_INSIGHT_TYPES.FLAVOR_CLASSIFICATION]: "New flavor classification detected",
    [AI_INSIGHT_TYPES.ROTATION_UPDATE]: "Rotation analysis updated",
  };

  return {
    type: insightType,
    label: labels[insightType] ?? insightType,
    details,
  };
}
