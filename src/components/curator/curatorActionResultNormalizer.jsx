/**
 * CURATOR ACTION RESULT NORMALIZER
 *
 * Transforms disparate AI output formats into canonical actionable structure.
 * Handles:
 * - Already-correct modern shape (groups array)
 * - Legacy specialization assessment format
 * - Flat recommendations/insights/actions
 * - Failsafe: throws on unmapped actionable data
 */

export function normalizeCuratorActionResult(raw, fallbackMeta = {}) {
  if (!raw) {
    return createEmptyResult(fallbackMeta);
  }

  if (Array.isArray(raw?.groups)) {
    return normalizeModernShape(raw, fallbackMeta);
  }

  if (raw.currentSpecializationAssessment || raw.recommendations) {
    return normalizeLegacySpecializationShape(raw, fallbackMeta);
  }

  if (
    Array.isArray(raw?.recommendations) ||
    Array.isArray(raw?.insights) ||
    Array.isArray(raw?.actions) ||
    Array.isArray(raw?.items)
  ) {
    return normalizeFlatShape(raw, fallbackMeta);
  }

  return createEmptyResult(fallbackMeta);
}

function normalizeModernShape(raw, fallbackMeta) {
  const groups = (raw.groups || [])
    .map((group, idx) => normalizeGroup(group, idx))
    .filter(Boolean);

  const itemCount = groups.reduce((sum, g) => sum + (g.items?.length || 0), 0);

  if (itemCount === 0) {
    return createEmptyResult(fallbackMeta);
  }

  return {
    actionId: raw.actionId || fallbackMeta.actionId || "curator_action",
    title: raw.title || fallbackMeta.title || "Curator Insights",
    summary: raw.summary || "Analysis complete.",
    status: raw.status || "completed",
    executionId: raw.executionId || fallbackMeta.executionId || generateExecutionId(),
    groups,
  };
}

function normalizeLegacySpecializationShape(raw, fallbackMeta) {
  const groups = [];

  if (Array.isArray(raw.recommendations) && raw.recommendations.length > 0) {
    const recGroup = {
      groupKey: "specialization_recommendations",
      groupTitle: "Specialization Recommendations",
      description: "Recommended pipe specializations based on your collection.",
      priority: "medium",
      itemCount: 0,
      items: [],
    };

    raw.recommendations.forEach((rec, idx) => {
      const item = {
        id: makeId("rec", idx),
        type: "pipe",
        recordType: "pipe",
        itemId: null,
        itemName: `${rec.specialization || "Specialization"} Focus`,
        title: `${rec.specialization || "Specialization"} Focus`,
        issue: "Pipe specialization opportunity detected.",
        recommendation: `Consider specializing pipes for ${rec.specialization || "this category"}. ${
          rec.tobaccoTypes ? `Suggested blends: ${rec.tobaccoTypes.join(", ")}` : ""
        }`,
        explanation: `Consider specializing pipes for ${rec.specialization || "this category"}. ${
          rec.tobaccoTypes ? `Suggested blends: ${rec.tobaccoTypes.join(", ")}` : ""
        }`,
        proposedChange: {
          type: "pipe_specialization",
          payload: {
            specialization: rec.specialization,
            suggestedBlends: rec.tobaccoTypes || [],
          },
        },
        proposedChanges: {
          specialization: rec.specialization,
          suggestedBlends: rec.tobaccoTypes || [],
        },
        confidence: rec.confidence || "medium",
        characteristics: Array.isArray(rec.tobaccoTypes) ? rec.tobaccoTypes : [],
      };

      recGroup.items.push(item);
    });

    if (recGroup.items.length > 0) {
      recGroup.itemCount = recGroup.items.length;
      groups.push(recGroup);
    }
  }

  if (
    Array.isArray(raw.underexploredOpportunities) &&
    raw.underexploredOpportunities.length > 0
  ) {
    const oppGroup = {
      groupKey: "underexplored_opportunities",
      groupTitle: "Underexplored Opportunities",
      description: "Areas where your collection could expand.",
      priority: "low",
      itemCount: 0,
      items: [],
    };

    raw.underexploredOpportunities.forEach((opp, idx) => {
      const category = opp.category || opp;
      const item = {
        id: makeId("opp", idx),
        type: "collection",
        recordType: "collection",
        itemId: null,
        itemName: category,
        title: category,
        issue: "This specialization is underrepresented in your collection.",
        recommendation: `Explore ${category} to improve collection breadth and diversity.`,
        explanation: `Explore ${category} to improve collection breadth and diversity.`,
        proposedChange: {
          type: "collection_expansion",
          payload: {
            category,
            reason: "Diversification opportunity",
          },
        },
        proposedChanges: {
          category,
          reason: "Diversification opportunity",
        },
        confidence: "low",
      };

      oppGroup.items.push(item);
    });

    if (oppGroup.items.length > 0) {
      oppGroup.itemCount = oppGroup.items.length;
      groups.push(oppGroup);
    }
  }

  if (groups.length === 0 && raw.recommendations?.length > 0) {
    throw new Error(
      "Normalization failure: specialization recommendations present but no items were produced."
    );
  }

  if (groups.length === 0) {
    return createEmptyResult(fallbackMeta);
  }

  return {
    actionId: raw.actionId || fallbackMeta.actionId || "curator_action",
    title:
      raw.title || fallbackMeta.title || "Collection Specialization Analysis",
    summary:
      raw.summary ||
      `Found ${groups.reduce((s, g) => s + (g.items?.length || 0), 0)} specialization opportunities.`,
    status: "completed",
    executionId: raw.executionId || fallbackMeta.executionId || generateExecutionId(),
    groups,
  };
}

function normalizeFlatShape(raw, fallbackMeta) {
  const groups = [];
  const allItems = [];

  if (Array.isArray(raw.recommendations)) {
    allItems.push({ source: "recommendations", items: raw.recommendations });
  }

  if (Array.isArray(raw.actions)) {
    allItems.push({ source: "actions", items: raw.actions });
  }

  if (Array.isArray(raw.insights)) {
    allItems.push({ source: "insights", items: raw.insights });
  }

  if (Array.isArray(raw.items)) {
    allItems.push({ source: "items", items: raw.items });
  }

  if (allItems.length === 0) {
    return createEmptyResult(fallbackMeta);
  }

  for (const source of allItems) {
    const groupKey = `${source.source}_group`;
    const groupTitle = formatGroupTitle(source.source);

    const group = {
      groupKey,
      groupTitle,
      description: raw.summary || undefined,
      priority: "medium",
      itemCount: 0,
      items: [],
    };

    (source.items || []).forEach((item, idx) => {
      const normalized = normalizeItem(item, groupKey, idx);
      if (normalized) {
        group.items.push(normalized);
      }
    });

    if (group.items.length > 0) {
      group.itemCount = group.items.length;
      groups.push(group);
    }
  }

  if (
    groups.length === 0 &&
    (raw.recommendations?.length > 0 ||
      raw.actions?.length > 0 ||
      raw.items?.length > 0)
  ) {
    throw new Error(
      "Normalization failure: actionable items present but no groups were produced."
    );
  }

  if (groups.length === 0) {
    return createEmptyResult(fallbackMeta);
  }

  return {
    actionId: raw.actionId || fallbackMeta.actionId || "curator_action",
    title: raw.title || fallbackMeta.title || "Analysis Results",
    summary: raw.summary || "Analysis complete.",
    status: "completed",
    executionId: raw.executionId || fallbackMeta.executionId || generateExecutionId(),
    groups,
  };
}

function normalizeGroup(group, idx) {
  if (!group) return null;

  const items = (group.items || [])
    .map((item, itemIdx) => normalizeItem(item, group.groupKey || `group_${idx}`, itemIdx))
    .filter(Boolean);

  if (items.length === 0) {
    return null;
  }

  return {
    groupKey: group.groupKey || `group_${idx}`,
    groupTitle: group.groupTitle || group.title || `Group ${idx + 1}`,
    description: group.description,
    priority: normalizeConfidence(group.priority || "medium"),
    itemCount: items.length,
    items,
  };
}

function normalizeItem(item, groupKey, idx) {
  if (!item) return null;

  const id =
    item.id ||
    item.recommendation_id ||
    makeId(`${groupKey}_item`, idx);

  let type = item.type || "collection";
  if (item.pipeName || item.pipe_name) type = "pipe";
  if (item.blendName || item.blend_name || item.tobaccoName) type = "tobacco";
  if (item.bottleName || item.bottle_name) type = "bottle";

  const recordType =
    item.recordType ||
    item.record_type ||
    (type === "tobacco" ? "blend" : type);

  const title =
    item.title ||
    item.itemName ||
    item.item_name ||
    item.pipeName ||
    item.pipe_name ||
    item.blendName ||
    item.blend_name ||
    item.bottleName ||
    item.bottle_name ||
    item.name ||
    `${type} recommendation`;

  const itemName =
    item.itemName ||
    item.item_name ||
    item.name ||
    title;

  const issue =
    item.issue ||
    item.problem ||
    item.observation ||
    (item.explanation ? item.explanation : "Opportunity detected.");

  const recommendation =
    item.recommendation ||
    item.suggested_action ||
    item.action ||
    item.explanation ||
    item.whyFitsYou ||
    "Review this item.";

  const explanation =
    item.explanation ||
    item.recommendation ||
    item.issue ||
    item.whyFitsYou ||
    recommendation;

  const rationale =
    item.rationale ||
    item.whyFitsYou ||
    "";

  let proposedChange = null;
  if (item.proposedChange) {
    proposedChange = {
      type: item.proposedChange.type || "generic_recommendation",
      payload: item.proposedChange.payload || {},
    };
  } else if (item.change_type) {
    proposedChange = {
      type: item.change_type,
      payload: item.change_payload || {},
    };
  }

  const proposedChanges =
    item.proposedChanges ||
    proposedChange?.payload ||
    {};

  return {
    id,
    type,
    recordType,
    itemId: item.itemId || item.item_id || null,
    recordId: item.recordId || item.record_id || null,
    itemName,
    title,
    recordName:
      item.recordName ||
      item.record_name ||
      item.anchorName ||
      item.anchor_name ||
      null,
    anchorId: item.anchorId || item.anchor_id || null,
    anchorName: item.anchorName || item.anchor_name || null,
    category: item.category || "",
    issue,
    recommendation,
    explanation,
    rationale,
    whyFitsYou: item.whyFitsYou || "",
    characteristics: Array.isArray(item.characteristics)
      ? item.characteristics
      : [],
    proposedChange,
    proposedChanges,
    confidence: normalizeConfidence(item.confidence || "medium"),
    followUpPrompt: item.followUpPrompt || item.follow_up_prompt || "",
  };
}

function normalizeConfidence(value) {
  const val = String(value || "").toLowerCase().trim();
  if (val.includes("high")) return "high";
  if (val.includes("low")) return "low";
  if (val === "1" || val === "0.9" || val === "0.95") return "high";
  if (val === "0.2" || val === "0.3" || val === "0.4") return "low";
  return "medium";
}

function formatGroupTitle(source) {
  const titles = {
    recommendations: "Recommendations",
    actions: "Actions",
    insights: "Insights",
    items: "Items",
  };
  return titles[source] || source;
}

function createEmptyResult(fallbackMeta) {
  return {
    actionId: fallbackMeta.actionId || "curator_action",
    title: fallbackMeta.title || "Analysis Complete",
    summary: "No action items at this time.",
    status: "completed",
    executionId: fallbackMeta.executionId || generateExecutionId(),
    groups: [],
  };
}

function makeId(prefix, index) {
  return `${prefix}_${index}_${Date.now()}`;
}

function generateExecutionId() {
  return `exec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}