/**
 * CURATOR ACTION RESULT NORMALIZER
 *
 * Canonical output:
 * {
 *   actionId,
 *   title,
 *   summary,
 *   status,
 *   executionId,
 *   groups: [{ groupKey, groupTitle, description, priority, itemCount, items: [...] }],
 *   items: [] // flat compatibility mirror of all grouped items
 * }
 */

export function normalizeCuratorActionResult(raw, fallbackMeta = {}) {
  const meta = normalizeFallbackMeta(fallbackMeta);

  if (!raw) {
    return createEmptyResult(meta);
  }

  if (Array.isArray(raw?.groups)) {
    return finalizeResult(
      {
        actionId: raw.actionId || meta.actionId,
        title: raw.title || meta.title,
        summary: raw.summary || 'Analysis complete.',
        status: raw.status || 'completed',
        executionId: raw.executionId || meta.executionId,
        groups: (raw.groups || []).map((group, idx) => normalizeGroup(group, idx)).filter(Boolean),
      },
      meta
    );
  }

  if (raw.currentSpecializationAssessment || raw.recommendations) {
    return finalizeResult(normalizeLegacySpecializationShape(raw, meta), meta);
  }

  if (
    Array.isArray(raw?.recommendations) ||
    Array.isArray(raw?.insights) ||
    Array.isArray(raw?.actions) ||
    Array.isArray(raw?.items)
  ) {
    return finalizeResult(normalizeFlatShape(raw, meta), meta);
  }

  return createEmptyResult(meta);
}

function normalizeFallbackMeta(fallbackMeta) {
  if (typeof fallbackMeta === 'string') {
    return {
      actionId: fallbackMeta,
      title: 'Curator Insights',
      executionId: generateExecutionId(),
    };
  }

  return {
    actionId: fallbackMeta.actionId || 'curator_action',
    title: fallbackMeta.title || 'Curator Insights',
    executionId: fallbackMeta.executionId || generateExecutionId(),
  };
}

function finalizeResult(result, meta) {
  const safeGroups = Array.isArray(result?.groups) ? result.groups.filter(Boolean) : [];
  const items = safeGroups.flatMap((group) => (Array.isArray(group.items) ? group.items : []));

  if (items.length === 0) {
    return createEmptyResult(meta);
  }

  return {
    actionId: result.actionId || meta.actionId,
    title: result.title || meta.title,
    summary: result.summary || 'Analysis complete.',
    status: result.status || 'completed',
    executionId: result.executionId || meta.executionId,
    groups: safeGroups.map((group) => ({
      ...group,
      itemCount: Array.isArray(group.items) ? group.items.length : 0,
    })),
    items,
  };
}

function normalizeLegacySpecializationShape(raw, fallbackMeta) {
  const groups = [];

  if (Array.isArray(raw.recommendations) && raw.recommendations.length > 0) {
    const items = raw.recommendations
      .map((rec, idx) => ({
        id: makeId('rec', idx),
        type: 'pipe',
        recordType: 'pipe',
        itemId: null,
        itemName: `${rec.specialization || 'Specialization'} Focus`,
        title: `${rec.specialization || 'Specialization'} Focus`,
        issue: 'Pipe specialization opportunity detected.',
        recommendation: `Consider specializing pipes for ${rec.specialization || 'this category'}. ${
          rec.tobaccoTypes ? `Suggested blends: ${rec.tobaccoTypes.join(', ')}` : ''
        }`,
        explanation: `Consider specializing pipes for ${rec.specialization || 'this category'}. ${
          rec.tobaccoTypes ? `Suggested blends: ${rec.tobaccoTypes.join(', ')}` : ''
        }`,
        proposedChange: {
          type: 'pipe_specialization',
          payload: {
            specialization: rec.specialization,
            suggestedBlends: rec.tobaccoTypes || [],
          },
        },
        proposedChanges: {
          specialization: rec.specialization,
          suggestedBlends: rec.tobaccoTypes || [],
        },
        confidence: normalizeConfidence(rec.confidence || 'medium'),
        characteristics: Array.isArray(rec.tobaccoTypes) ? rec.tobaccoTypes : [],
      }))
      .filter(Boolean);

    if (items.length > 0) {
      groups.push({
        groupKey: 'specialization_recommendations',
        groupTitle: 'Specialization Recommendations',
        description: 'Recommended pipe specializations based on your collection.',
        priority: 'medium',
        itemCount: items.length,
        items,
      });
    }
  }

  if (Array.isArray(raw.underexploredOpportunities) && raw.underexploredOpportunities.length > 0) {
    const items = raw.underexploredOpportunities
      .map((opp, idx) => {
        const category = opp.category || opp;
        return {
          id: makeId('opp', idx),
          type: 'collection',
          recordType: 'collection',
          itemId: null,
          itemName: category,
          title: category,
          issue: 'This specialization is underrepresented in your collection.',
          recommendation: `Explore ${category} to improve collection breadth and diversity.`,
          explanation: `Explore ${category} to improve collection breadth and diversity.`,
          proposedChange: {
            type: 'collection_expansion',
            payload: {
              category,
              reason: 'Diversification opportunity',
            },
          },
          proposedChanges: {
            category,
            reason: 'Diversification opportunity',
          },
          confidence: 'low',
        };
      })
      .filter(Boolean);

    if (items.length > 0) {
      groups.push({
        groupKey: 'underexplored_opportunities',
        groupTitle: 'Underexplored Opportunities',
        description: 'Areas where your collection could expand.',
        priority: 'low',
        itemCount: items.length,
        items,
      });
    }
  }

  return {
    actionId: raw.actionId || fallbackMeta.actionId,
    title: raw.title || fallbackMeta.title || 'Collection Specialization Analysis',
    summary:
      raw.summary ||
      `Found ${groups.reduce((sum, group) => sum + (group.items?.length || 0), 0)} specialization opportunities.`,
    status: raw.status || 'completed',
    executionId: raw.executionId || fallbackMeta.executionId,
    groups,
  };
}

function normalizeFlatShape(raw, fallbackMeta) {
  const sources = [
    { source: 'recommendations', items: raw.recommendations },
    { source: 'actions', items: raw.actions },
    { source: 'insights', items: raw.insights },
    { source: 'items', items: raw.items },
  ].filter((entry) => Array.isArray(entry.items) && entry.items.length > 0);

  const groups = sources
    .map((entry) => {
      const items = entry.items
        .map((item, idx) => normalizeItem(item, entry.source, idx))
        .filter(Boolean);

      if (items.length === 0) return null;

      return {
        groupKey: `${entry.source}_group`,
        groupTitle: formatGroupTitle(entry.source),
        description: raw.summary || undefined,
        priority: 'medium',
        itemCount: items.length,
        items,
      };
    })
    .filter(Boolean);

  return {
    actionId: raw.actionId || fallbackMeta.actionId,
    title: raw.title || fallbackMeta.title,
    summary: raw.summary || 'Analysis complete.',
    status: raw.status || 'completed',
    executionId: raw.executionId || fallbackMeta.executionId,
    groups,
  };
}

function normalizeGroup(group, idx) {
  if (!group || typeof group !== 'object') return null;
  const items = (group.items || [])
    .map((item, itemIdx) => normalizeItem(item, group.groupKey || `group_${idx}`, itemIdx))
    .filter(Boolean);

  if (items.length === 0) return null;

  return {
    groupKey: group.groupKey || `group_${idx}`,
    groupTitle: group.groupTitle || group.title || `Group ${idx + 1}`,
    description: group.description || '',
    priority: group.priority || 'medium',
    itemCount: items.length,
    items,
  };
}

function normalizeItem(item, sourceKey = 'items', idx = 0) {
  if (!item || typeof item !== 'object') return null;

  const title =
    item.title ||
    item.itemName ||
    item.item_name ||
    item.recordName ||
    item.record_name ||
    item.anchorName ||
    item.anchor_name ||
    '';

  const issue = item.issue || item.problem || item.insight || '';
  const recommendation = item.recommendation || item.action || item.suggestion || '';
  const explanation = item.explanation || item.reasoning || recommendation || issue || '';
  const proposedChange = item.proposedChange || item.change || null;
  const proposedChanges = item.proposedChanges || (proposedChange?.payload ?? null);

  const hasMinimumShape =
    Boolean(title) &&
    (Boolean(item.itemId || item.item_id || item.recordId || item.record_id || item.anchorId || item.anchor_id) ||
      Boolean(issue) ||
      Boolean(recommendation) ||
      Boolean(explanation) ||
      Boolean(proposedChange) ||
      Boolean(proposedChanges));

  if (!hasMinimumShape) return null;

  return {
    id: item.id || makeId(sourceKey, idx),
    type: item.type || item.recordType || item.record_type || 'collection',
    recordType: item.recordType || item.record_type || item.type || 'collection',
    itemId: item.itemId || item.item_id || item.recordId || item.record_id || null,
    itemName:
      item.itemName ||
      item.item_name ||
      item.recordName ||
      item.record_name ||
      title ||
      null,
    title,
    recordId: item.recordId || item.record_id || item.itemId || item.item_id || null,
    recordName:
      item.recordName ||
      item.record_name ||
      item.itemName ||
      item.item_name ||
      title ||
      null,
    anchorId: item.anchorId || item.anchor_id || null,
    anchorName: item.anchorName || item.anchor_name || null,
    category: item.category || '',
    issue,
    recommendation,
    explanation,
    rationale: item.rationale || explanation,
    whyFitsYou: item.whyFitsYou || '',
    characteristics: Array.isArray(item.characteristics) ? item.characteristics : [],
    proposedChange,
    proposedChanges,
    confidence: normalizeConfidence(item.confidence || 'medium'),
    followUpPrompt: item.followUpPrompt || item.follow_up_prompt || '',
  };
}

function normalizeConfidence(value) {
  const val = String(value || '').toLowerCase().trim();
  if (val.includes('high')) return 'high';
  if (val.includes('low')) return 'low';
  if (['1', '0.9', '0.95'].includes(val)) return 'high';
  if (['0.2', '0.3', '0.4'].includes(val)) return 'low';
  return 'medium';
}

function formatGroupTitle(source) {
  const titles = {
    recommendations: 'Recommendations',
    actions: 'Actions',
    insights: 'Insights',
    items: 'Items',
  };
  return titles[source] || source;
}

function createEmptyResult(fallbackMeta) {
  return {
    actionId: fallbackMeta.actionId || 'curator_action',
    title: fallbackMeta.title || 'Analysis Complete',
    summary: 'No action items at this time.',
    status: 'completed',
    executionId: fallbackMeta.executionId || generateExecutionId(),
    groups: [],
    items: [],
  };
}

function makeId(prefix, index) {
  return `${prefix}_${index}_${Date.now()}`;
}

function generateExecutionId() {
  return `exec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export default normalizeCuratorActionResult;
