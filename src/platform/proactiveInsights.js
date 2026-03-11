// platform/proactiveInsights.js
// Proactive insight engine for the Collection Curator AI.
//
// Generates structured, explainable proactive insights from a user's collection
// data without waiting for a user prompt. Each insight follows a canonical model
// that supports future delivery mechanisms (notifications, digests, banners).
//
// AI exclusion rules are enforced here: collectible-only / ai_excluded items are
// included in value/inventory insights but excluded from usage/rotation/pairing
// recommendation insights.
//
// Architecture is module-aware: insight generators are keyed by module type and
// topic so adding a new module (whiskey, cigar, coffee) only requires adding new
// generators — no changes to the core engine.

import { filterAiEligibleItems } from "./aiEligibility.js";
import { MODULE_TYPES } from "./moduleTypes.js";

// ─── Canonical Insight Categories ────────────────────────────────────────────

export const INSIGHT_CATEGORIES = {
  ROTATION: "rotation",
  PAIRING: "pairing",
  DIVERSITY: "diversity",
  AGING: "aging",
  INVENTORY: "inventory",
  VALUE: "value",
  COLLECTION_HEALTH: "collection_health",
  ACQUISITION: "acquisition_opportunity",
  MAINTENANCE: "maintenance",
  USAGE_PATTERN: "usage_pattern",
};

// ─── Severity Levels ─────────────────────────────────────────────────────────

export const INSIGHT_SEVERITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
};

// ─── Scope Types ─────────────────────────────────────────────────────────────

export const INSIGHT_SCOPE = {
  PIPE: MODULE_TYPES.PIPE,
  TOBACCO: MODULE_TYPES.TOBACCO,
  CROSS_MODULE: "cross_module",
  COLLECTION: "collection",
};

// ─── Insight Factory ─────────────────────────────────────────────────────────

/**
 * Build a canonical proactive insight object.
 *
 * @param {object} params
 * @param {string} params.id               - Stable identifier for deduplication.
 * @param {string} params.title            - Short display title.
 * @param {string} params.summary          - One-sentence summary shown in the card.
 * @param {string} params.category         - One of INSIGHT_CATEGORIES values.
 * @param {string} params.scope            - One of INSIGHT_SCOPE values.
 * @param {string} params.severity         - One of INSIGHT_SEVERITY values.
 * @param {string} params.reason           - Collector-friendly explanation.
 * @param {string} params.suggested_action - What the user should do next.
 * @param {string[]} [params.related_items] - IDs of relevant collection items.
 * @param {boolean} [params.is_dismissed]
 * @param {string} [params.created_at]
 * @param {string} [params.updated_at]
 * @returns {object}
 */
export function buildInsight({
  id,
  title,
  summary,
  category,
  scope,
  severity,
  reason,
  suggested_action,
  related_items = [],
  is_dismissed = false,
  created_at = new Date().toISOString(),
  updated_at = new Date().toISOString(),
}) {
  return {
    id,
    title,
    summary,
    category,
    scope,
    severity,
    reason,
    suggested_action,
    related_items,
    is_dismissed,
    created_at,
    updated_at,
  };
}

// ─── Pipe Insight Generators ─────────────────────────────────────────────────

const UNDERUSED_THRESHOLD_DAYS = 45;
const OVERDUE_THRESHOLD_DAYS = 60;

/**
 * Generate rotation-related insights for pipes.
 * Only considers AI-eligible pipes.
 *
 * @param {object[]} pipes
 * @param {Record<string, string|null>} latestLogByPipe - Map of pipe id → ISO date string of last use.
 * @returns {object[]}
 */
export function generatePipeRotationInsights(pipes, latestLogByPipe = {}) {
  const eligible = filterAiEligibleItems(pipes);
  if (eligible.length === 0) return [];

  const now = Date.now();
  const msPerDay = 86_400_000;

  const underused = eligible.filter((p) => {
    const lastUsed = latestLogByPipe[p.id];
    if (!lastUsed) return true;
    try {
      const days = (now - new Date(lastUsed).getTime()) / msPerDay;
      return days > UNDERUSED_THRESHOLD_DAYS;
    } catch {
      return false;
    }
  });

  const insights = [];

  if (underused.length > 0) {
    insights.push(
      buildInsight({
        id: "rotation_underused_pipes",
        title: "Rotation Opportunity",
        summary:
          underused.length === 1
            ? "1 pipe has not been used in over 45 days."
            : `${underused.length} pipes have not been used in over 45 days.`,
        category: INSIGHT_CATEGORIES.ROTATION,
        scope: INSIGHT_SCOPE.PIPE,
        severity:
          underused.length >= eligible.length * 0.5
            ? INSIGHT_SEVERITY.HIGH
            : INSIGHT_SEVERITY.MEDIUM,
        reason:
          "Recent usage is concentrated in only a few pipes. Rotating others into your sessions keeps chamber seasoning even and prevents ghost flavors.",
        suggested_action: "Review these pipes for your next session.",
        related_items: underused.map((p) => p.id),
      })
    );
  }

  // Detect overused pipes (used very recently and very frequently)
  const overdue = eligible.filter((p) => {
    const lastUsed = latestLogByPipe[p.id];
    if (!lastUsed) return false;
    try {
      const days = (now - new Date(lastUsed).getTime()) / msPerDay;
      return days < 2; // smoked within 2 days
    } catch {
      return false;
    }
  });

  if (overdue.length > 0 && eligible.length > 3) {
    insights.push(
      buildInsight({
        id: "rotation_overused_pipes",
        title: "Pipe Rest Recommended",
        summary:
          overdue.length === 1
            ? "1 pipe was used very recently and may benefit from a rest."
            : `${overdue.length} pipes were used very recently and may benefit from a rest.`,
        category: INSIGHT_CATEGORIES.ROTATION,
        scope: INSIGHT_SCOPE.PIPE,
        severity: INSIGHT_SEVERITY.LOW,
        reason:
          "Pipes perform best with adequate drying time between sessions. Allowing a rest prevents moisture buildup and ghost flavors.",
        suggested_action: "Let these pipes rest for at least 24–48 hours before the next session.",
        related_items: overdue.map((p) => p.id),
      })
    );
  }

  return insights;
}

// ─── Tobacco Insight Generators ───────────────────────────────────────────────

/**
 * Generate diversity-related insights for the tobacco cellar.
 * Only considers AI-eligible blends.
 *
 * @param {object[]} blends
 * @returns {object[]}
 */
export function generateTobaccoDiversityInsights(blends) {
  const eligible = filterAiEligibleItems(blends);
  if (eligible.length === 0) return [];

  const familyCounts = {};
  for (const b of eligible) {
    const family = b.blend_type || b.blend_family || "unknown";
    familyCounts[family] = (familyCounts[family] || 0) + 1;
  }

  const families = Object.keys(familyCounts).filter((f) => f !== "unknown");
  const insights = [];

  if (families.length < 2 && eligible.length >= 3) {
    insights.push(
      buildInsight({
        id: "diversity_low_blend_variety",
        title: "Limited Blend Variety",
        summary: `Your cellar covers ${families.length || 1} blend type(s). Broadening your variety can enrich your rotation.`,
        category: INSIGHT_CATEGORIES.DIVERSITY,
        scope: INSIGHT_SCOPE.TOBACCO,
        severity: INSIGHT_SEVERITY.MEDIUM,
        reason:
          "Your cellar is heavily concentrated in one blend family. Diversifying into other types (Virginia, Burley, Latakia, etc.) gives you more pairing options and keeps sessions interesting.",
        suggested_action:
          "Consider adding a blend from a family you don't currently have in your cellar.",
        related_items: [],
      })
    );
  }

  // Check for overconcentration in a single blend
  const dominantFamily = Object.entries(familyCounts).sort((a, b) => b[1] - a[1])[0];
  if (
    dominantFamily &&
    dominantFamily[1] >= eligible.length * 0.7 &&
    eligible.length >= 4
  ) {
    insights.push(
      buildInsight({
        id: "diversity_overconcentration",
        title: "Blend Family Overconcentration",
        summary: `Over 70% of your cellar is ${dominantFamily[0]} blends.`,
        category: INSIGHT_CATEGORIES.DIVERSITY,
        scope: INSIGHT_SCOPE.TOBACCO,
        severity: INSIGHT_SEVERITY.MEDIUM,
        reason: `Your collection skews heavily toward ${dominantFamily[0]}. While depth in one family is valuable, adding complementary types provides better pairing coverage.`,
        suggested_action:
          "Review your cellar for complementary blend types you might enjoy.",
        related_items: [],
      })
    );
  }

  return insights;
}

/**
 * Generate aging-related insights for the tobacco cellar.
 * Only considers AI-eligible blends.
 *
 * @param {object[]} blends
 * @returns {object[]}
 */
export function generateTobaccoAgingInsights(blends) {
  const eligible = filterAiEligibleItems(blends);
  if (eligible.length === 0) return [];

  const now = Date.now();
  const msPerYear = 365 * 86_400_000;

  // Blends with long cellar time but no recent use — aging-ready candidates
  const agingReady = eligible.filter((b) => {
    const addedDate = b.created_at || b.date_added;
    if (!addedDate) return false;
    try {
      const years = (now - new Date(addedDate).getTime()) / msPerYear;
      return years >= 2;
    } catch {
      return false;
    }
  });

  const insights = [];

  if (agingReady.length > 0) {
    insights.push(
      buildInsight({
        id: "aging_ready_blends",
        title: "Blends Approaching Peak",
        summary:
          agingReady.length === 1
            ? "1 blend has been cellared for 2+ years and may be nearing peak."
            : `${agingReady.length} blends have been cellared for 2+ years and may be nearing peak.`,
        category: INSIGHT_CATEGORIES.AGING,
        scope: INSIGHT_SCOPE.TOBACCO,
        severity: INSIGHT_SEVERITY.LOW,
        reason:
          "Several blends in your cellar have had significant aging time. Virginia and Virginia/Perique blends often peak after 2–5 years. It may be worth sampling them.",
        suggested_action: "Review these blends and consider opening one to check aging progress.",
        related_items: agingReady.map((b) => b.id),
      })
    );
  }

  // Open inventory at risk (blends marked as open and added long ago)
  const openAtRisk = eligible.filter((b) => {
    const isOpen = b.status === "open" || b.is_open === true;
    if (!isOpen) return false;
    const openedDate = b.opened_at || b.created_at;
    if (!openedDate) return false;
    try {
      const months = (now - new Date(openedDate).getTime()) / (30 * 86_400_000);
      return months >= 6;
    } catch {
      return false;
    }
  });

  if (openAtRisk.length > 0) {
    insights.push(
      buildInsight({
        id: "inventory_open_at_risk",
        title: "Open Inventory Needs Attention",
        summary:
          openAtRisk.length === 1
            ? "1 open blend has been open for 6+ months."
            : `${openAtRisk.length} open blends have been open for 6+ months.`,
        category: INSIGHT_CATEGORIES.INVENTORY,
        scope: INSIGHT_SCOPE.TOBACCO,
        severity: INSIGHT_SEVERITY.MEDIUM,
        reason:
          "Open tins are more susceptible to moisture loss and flavor degradation over time. These blends benefit from more frequent use or proper storage.",
        suggested_action:
          "Consider scheduling these blends into upcoming sessions or checking their storage conditions.",
        related_items: openAtRisk.map((b) => b.id),
      })
    );
  }

  return insights;
}

// ─── Cross-Module Insight Generators ─────────────────────────────────────────

/**
 * Generate pairing coverage insights across pipes and tobacco.
 * Only considers AI-eligible items.
 *
 * @param {object[]} pipes
 * @param {object[]} blends
 * @param {object[]} [pairings] - Existing pairing records.
 * @returns {object[]}
 */
export function generatePairingInsights(pipes, blends, pairings = []) {
  const eligiblePipes = filterAiEligibleItems(pipes);
  const eligibleBlends = filterAiEligibleItems(blends);

  if (eligiblePipes.length === 0 || eligibleBlends.length === 0) return [];

  const insights = [];

  const pairedPipeIds = new Set(pairings.map((p) => p.pipe_id).filter(Boolean));
  const unpairedPipes = eligiblePipes.filter((p) => !pairedPipeIds.has(p.id));

  if (unpairedPipes.length > 0 && pairings.length > 0) {
    insights.push(
      buildInsight({
        id: "pairing_unpaired_pipes",
        title: "Pairing Coverage Gap",
        summary:
          unpairedPipes.length === 1
            ? "1 pipe has no established pairings."
            : `${unpairedPipes.length} pipes have no established pairings.`,
        category: INSIGHT_CATEGORIES.PAIRING,
        scope: INSIGHT_SCOPE.CROSS_MODULE,
        severity: INSIGHT_SEVERITY.LOW,
        reason:
          "These pipes have not been matched with any tobacco blends. Building pairings improves session planning and helps you get the most from your collection.",
        suggested_action:
          "Use the Optimize tab to generate pairing recommendations for these pipes.",
        related_items: unpairedPipes.map((p) => p.id),
      })
    );
  }

  // Weak pairing concentration — many sessions using same few pairings
  if (pairings.length > 0 && eligiblePipes.length >= 3 && eligibleBlends.length >= 3) {
    const usedPairings = pairings.filter((p) => (p.session_count || 0) > 0);
    const overusedPairings = usedPairings.filter((p) => (p.session_count || 0) > 10);
    if (overusedPairings.length > 0 && overusedPairings.length < usedPairings.length * 0.3) {
      insights.push(
        buildInsight({
          id: "pairing_over_reliance",
          title: "Pairing Over-Reliance",
          summary: `A few pairings account for most of your session history.`,
          category: INSIGHT_CATEGORIES.PAIRING,
          scope: INSIGHT_SCOPE.CROSS_MODULE,
          severity: INSIGHT_SEVERITY.LOW,
          reason:
            "Your session history leans heavily on a small number of pairings. Exploring underutilized pipe and blend combinations can reveal new favorites.",
          suggested_action:
            "Review your pairing matrix for underutilized combinations to try.",
          related_items: [],
        })
      );
    }
  }

  return insights;
}

/**
 * Generate a collection health summary insight.
 * Considers all items (including AI-excluded) for counts,
 * but uses AI-eligible items for health scoring.
 *
 * @param {object[]} pipes
 * @param {object[]} blends
 * @returns {object[]}
 */
export function generateCollectionHealthInsights(pipes, blends) {
  const insights = [];
  const totalPipes = pipes.length;
  const totalBlends = blends.length;

  if (totalPipes === 0 && totalBlends === 0) return insights;

  const aiExcludedCount =
    pipes.filter((p) => p.ai_excluded).length +
    blends.filter((b) => b.ai_excluded).length;

  if (aiExcludedCount > 0) {
    insights.push(
      buildInsight({
        id: "collection_health_excluded_items",
        title: "Collector Items Noted",
        summary:
          aiExcludedCount === 1
            ? "1 item is marked as collector-only and excluded from recommendations."
            : `${aiExcludedCount} items are marked as collector-only and excluded from recommendations.`,
        category: INSIGHT_CATEGORIES.COLLECTION_HEALTH,
        scope: INSIGHT_SCOPE.COLLECTION,
        severity: INSIGHT_SEVERITY.LOW,
        reason:
          "Collector-only items are included in your collection value and inventory counts but are intentionally excluded from usage, rotation, and pairing recommendations.",
        suggested_action:
          "Review these items in your collection to confirm their collector-only status is correct.",
        related_items: [
          ...pipes.filter((p) => p.ai_excluded).map((p) => p.id),
          ...blends.filter((b) => b.ai_excluded).map((b) => b.id),
        ],
      })
    );
  }

  return insights;
}

// ─── Insight Engine ───────────────────────────────────────────────────────────

/**
 * Generate all proactive insights for the current collection state.
 * Insight generators are called in a defined order; results are merged and
 * deduplicated by id.
 *
 * @param {object} params
 * @param {object[]} [params.pipes]
 * @param {object[]} [params.blends]
 * @param {object[]} [params.pairings]
 * @param {Record<string, string|null>} [params.latestLogByPipe]
 * @returns {object[]}
 */
export function generateProactiveInsights({ pipes = [], blends = [], pairings = [], latestLogByPipe = {} } = {}) {
  const generators = [
    () => generatePipeRotationInsights(pipes, latestLogByPipe),
    () => generateTobaccoDiversityInsights(blends),
    () => generateTobaccoAgingInsights(blends),
    () => generatePairingInsights(pipes, blends, pairings),
    () => generateCollectionHealthInsights(pipes, blends),
  ];

  const seen = new Set();
  const results = [];

  for (const gen of generators) {
    try {
      const insights = gen();
      for (const insight of insights) {
        if (!seen.has(insight.id)) {
          seen.add(insight.id);
          results.push(insight);
        }
      }
    } catch {
      // Never let a single generator crash the engine
    }
  }

  // Sort by severity: high → medium → low
  const severityOrder = {
    [INSIGHT_SEVERITY.HIGH]: 0,
    [INSIGHT_SEVERITY.MEDIUM]: 1,
    [INSIGHT_SEVERITY.LOW]: 2,
  };
  results.sort(
    (a, b) =>
      (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3)
  );

  return results;
}

// ─── Caching Layer ────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let _cache = null;

/**
 * Get cached proactive insights or regenerate if stale.
 * Insights are regenerated after CACHE_TTL_MS or when the collection changes.
 *
 * @param {object} params - Same as generateProactiveInsights.
 * @param {number} [params._cacheKey] - Optional numeric key; change to force refresh.
 * @returns {object[]}
 */
export function getCachedProactiveInsights(params = {}) {
  const now = Date.now();
  const cacheKey = params._cacheKey ?? 0;

  if (
    _cache &&
    _cache.key === cacheKey &&
    now - _cache.generatedAt < CACHE_TTL_MS
  ) {
    return _cache.insights;
  }

  const insights = generateProactiveInsights(params);
  _cache = { insights, generatedAt: now, key: cacheKey };
  return insights;
}

/**
 * Invalidate the insight cache to force regeneration on next access.
 */
export function invalidateInsightCache() {
  _cache = null;
}
