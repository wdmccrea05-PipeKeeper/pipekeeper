// platform/collectionCuratorAI.js
// Collection Curator AI — module-aware reasoning service for the CollectionKeeper platform.
//
// This service sits between the AI UI components and the underlying LLM calls.
// It normalizes collection items through the module adapter layer, enforces AI
// eligibility rules, and attaches structured reasoning to all AI outputs.
//
// Active modules: pipe, tobacco, whiskey, cigar.
// WineKeeper groundwork: adapter registered when wine module launches.
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
 * @param {object[]} [params.cigars]  - Raw Cigar records.
 * @returns {{
 *   activeModules: string[],
 *   itemsByModule: Record<string, object[]>,
 *   usageProfilesByModule: Record<string, object[]>,
 *   eligibleItemCount: number,
 *   totalItemCount: number,
 * }}
 */
export function buildAIContext({ pipes = [], blends = [], cigars = [] } = {}) {
  const pipeAdapter = getAdapter(MODULE_TYPES.PIPE);
  const tobaccoAdapter = getAdapter(MODULE_TYPES.TOBACCO);
  const cigarAdapter = getAdapter(MODULE_TYPES.CIGAR);

  // Enforce AI exclusion at the platform level
  const eligiblePipes = filterAiEligibleItems(pipes);
  const eligibleBlends = filterAiEligibleItems(blends);
  const eligibleCigars = filterAiEligibleItems(cigars);

  const normalizedPipes = pipeAdapter
    ? eligiblePipes.map((p) => pipeAdapter.normalizeItem(p))
    : eligiblePipes;

  const normalizedBlends = tobaccoAdapter
    ? eligibleBlends.map((b) => tobaccoAdapter.normalizeItem(b))
    : eligibleBlends;

  const normalizedCigars = cigarAdapter
    ? eligibleCigars.map((c) => cigarAdapter.normalizeItem(c))
    : eligibleCigars;

  const pipeUsageProfiles = pipeAdapter
    ? eligiblePipes.map((p) => ({ id: p.id, ...pipeAdapter.getUsageProfile(p) }))
    : [];

  const tobaccoUsageProfiles = tobaccoAdapter
    ? eligibleBlends.map((b) => ({ id: b.id, ...tobaccoAdapter.getUsageProfile(b) }))
    : [];

  const cigarUsageProfiles = cigarAdapter
    ? eligibleCigars.map((c) => ({ id: c.id, ...cigarAdapter.getUsageProfile(c) }))
    : [];

  const totalItemCount = pipes.length + blends.length + cigars.length;
  const eligibleItemCount = eligiblePipes.length + eligibleBlends.length + eligibleCigars.length;

  return {
    activeModules: ACTIVE_MODULES,
    itemsByModule: {
      [MODULE_TYPES.PIPE]: normalizedPipes,
      [MODULE_TYPES.TOBACCO]: normalizedBlends,
      [MODULE_TYPES.CIGAR]: normalizedCigars,
    },
    usageProfilesByModule: {
      [MODULE_TYPES.PIPE]: pipeUsageProfiles,
      [MODULE_TYPES.TOBACCO]: tobaccoUsageProfiles,
      [MODULE_TYPES.CIGAR]: cigarUsageProfiles,
    },
    eligibleItemCount,
    totalItemCount,
    excludedItemCount: totalItemCount - eligibleItemCount,
  };
}

// ─── Module-Aware Prompt Builder ─────────────────────────────────────────────

/**
 * Build the module-context preamble that all Collection Curator AI prompts should include.
 * Includes domain expertise framing and preference context when available.
 */
export function buildModuleAwarePromptPreamble(aiContext) {
  const moduleList = (aiContext.activeModules || [])
    .map((m) => m.charAt(0).toUpperCase() + m.slice(1))
    .join(" and ");

  const pipeCount = aiContext.itemsByModule?.[MODULE_TYPES.PIPE]?.length ?? 0;
  const tobaccoCount = aiContext.itemsByModule?.[MODULE_TYPES.TOBACCO]?.length ?? 0;
  const cigarCount = aiContext.itemsByModule?.[MODULE_TYPES.CIGAR]?.length ?? 0;
  const excludedCount = aiContext.excludedItemCount ?? 0;

  const cigarNote = cigarCount > 0 ? `, ${cigarCount} cigar(s)` : "";

  const exclusionNote =
    excludedCount > 0
      ? `\n[AI Exclusion: ${excludedCount} collector-only item(s) have been excluded from this analysis.]`
      : "";

  // Preference context — helps the AI personalize its recommendations
  const preferences = aiContext.preferences || {};
  const preferenceLines = [];
  if (preferences.preferred_blend_types?.length > 0) {
    preferenceLines.push(`Preferred blend families: ${preferences.preferred_blend_types.join(', ')}`);
  }
  if (preferences.disliked_flavors?.length > 0) {
    preferenceLines.push(`Known dislikes: ${preferences.disliked_flavors.join(', ')} (never recommend these)`);
  }
  if (preferences.preferred_whiskey_types?.length > 0) {
    preferenceLines.push(`Preferred whiskey styles: ${preferences.preferred_whiskey_types.join(', ')}`);
  }
  const preferenceSection = preferenceLines.length > 0
    ? `\n\nUser Preferences:\n${preferenceLines.map((l) => `- ${l}`).join('\n')}`
    : '';

  return (
    `You are the Collection Curator AI — a world-class expert advisor for pipe smoking, tobacco blending, ` +
    `whiskey pairing, and cigar integration. You think like a seasoned collector helping a friend: ` +
    `confident, knowledgeable, conversational, and precise.\n\n` +
    `Active modules: ${moduleList}.\n` +
    `Collection context: ${pipeCount} pipe(s), ${tobaccoCount} tobacco blend(s)${cigarNote} available for analysis.` +
    exclusionNote +
    preferenceSection +
    `\n\nDomain rules you must always enforce:\n` +
    `- Ghosting rule: never pair an aromatic-dedicated pipe with a non-aromatic blend or vice versa\n` +
    `- Whiskey pairings must use complement logic (similar profiles) or contrast logic (balance)\n` +
    `- Never recommend items the user already owns as new suggestions\n` +
    `- If you cannot determine a user's preference, lower your confidence — never fabricate alignment\n\n` +
    `For every recommendation you must provide:\n` +
    `- Recommendation Title: specific, direct\n` +
    `- Confidence: HIGH / MEDIUM / LOW with reasoning\n` +
    `- Core Action: exactly what the user should do\n` +
    `- Explanation (Reason): WHY + HOW + IMPACT — use domain language, specific flavor references, never generic phrases\n` +
    `- Suggested Action: how this relates to the user's specific collection or preferences\n`
  );
}

// ─── Optimize Scope Descriptors ──────────────────────────────────────────────

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
  {
    id: "cigar_collection",
    label: "Optimize Cigar Collection",
    description: "Review humidor balance, aging readiness, and smoking patterns.",
    modules: [MODULE_TYPES.CIGAR],
  },
  // Future scopes (inactive until modules launch):
  // { id: "whiskey_collection", label: "Optimize Whiskey Collection", modules: [MODULE_TYPES.WHISKEY] },
  // { id: "wine_cellar", label: "Optimize Wine Cellar", modules: [MODULE_TYPES.WINE] },
];

/**
 * Return the active optimization scopes for the current build.
 */
export function getActiveOptimizeScopes() {
  return OPTIMIZE_SCOPES.filter((scope) =>
    scope.modules.every((m) => ACTIVE_MODULES.includes(m))
  );
}

// ─── Identify Item Types ─────────────────────────────────────────────────────

export const IDENTIFY_ITEM_TYPES = [
  { id: "pipe", label: "Pipe", active: true, module: MODULE_TYPES.PIPE },
  { id: "tobacco_tin", label: "Tobacco Tin", active: true, module: MODULE_TYPES.TOBACCO },
  { id: "cigar_band", label: "Cigar Band", active: true, module: MODULE_TYPES.CIGAR },
  // Future (inactive):
  // { id: "whiskey_bottle", label: "Whiskey Bottle", active: false, module: MODULE_TYPES.WHISKEY },
  // { id: "wine_bottle", label: "Wine Bottle", active: false, module: MODULE_TYPES.WINE },
];

/**
 * Return the currently active identify item types.
 */
export function getActiveIdentifyTypes() {
  return IDENTIFY_ITEM_TYPES.filter((t) => t.active);
}

// ─── AI Update Insight Types ──────────────────────────────────────────────────

export const AI_INSIGHT_TYPES = {
  PAIRING_REFRESH: "pairing_matrix_refreshed",
  OPTIMIZATION_RECALC: "collection_optimization_recalculated",
  FLAVOR_CLASSIFICATION: "new_flavor_classification_detected",
  ROTATION_UPDATE: "rotation_analysis_updated",
};

/**
 * Build a structured insight summary for an AI update event.
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
