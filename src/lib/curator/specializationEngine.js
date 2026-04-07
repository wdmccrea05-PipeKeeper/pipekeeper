/**
 * Specialization Engine
 *
 * Generates MULTI_PATH recommendations for pipe specialization.
 * Uses actual smoking log data — no LLM calls.
 *
 * Enforces the ghosting hard rule: once a pipe develops a flavor profile
 * (aromatic vs. non-aromatic), crossing categories degrades both experiences.
 *
 * Output: one structured recommendation per candidate pipe,
 * grouped into a single multi_path recommendation cohort.
 */

import { createRecommendation, computeConfidence, CATEGORY, ACTION_TYPE, MODULE_KEY, OWNERSHIP_CONTEXT, PRIORITY } from './recommendationSchema.js';

// ─── Type Groupings ───────────────────────────────────────────────────────────

const BLEND_TYPE_TO_SPECIALIZATION = {
  'Virginia':           'Virginia',
  'Virginia/Perique':   'Virginia/Perique',
  'Virginia/Burley':    'Virginia/Burley',
  'Virginia/Oriental':  'Virginia/Oriental',
  'English':            'English',
  'Scottish':           'English',
  'Balkan':             'English/Balkan',
  'Burley':             'Burley',
  'Aromatic':           'Aromatic',
  'Oriental/Turkish':   'Oriental',
  'Danish':             'Aromatic',
  'Other':              null,
};

// Types that leave oils/flavors that cross-contaminate with non-aromatic blends
const AROMATIC_TYPES = new Set(['Aromatic', 'Danish']);

// ─── Chamber size helpers ─────────────────────────────────────────────────────

const CHAMBER_SIZE_LABELS = {
  'small':      'small chamber',
  'medium':     'medium chamber',
  'large':      'large chamber',
  'extra-large': 'generous chamber',
  'xl':         'generous chamber',
};

function getChamberLabel(pipe) {
  const raw = (pipe.chamber_volume || pipe.chamber_size || '').toLowerCase();
  return CHAMBER_SIZE_LABELS[raw] || null;
}

// ─── Explanation builders ─────────────────────────────────────────────────────

/**
 * Build a specific, expert-quality rationale for a pipe specialization.
 */
function buildSpecializationRationale(pipe, logData) {
  if (!logData || !logData.hasLogData) {
    const chamberLabel = getChamberLabel(pipe);
    const chamberNote = chamberLabel
      ? ` Its ${chamberLabel} hasn't been narrowed down yet.`
      : '';
    return (
      `No session history exists for this pipe.${chamberNote} ` +
      `Log a few sessions and the Curator can make a data-backed suggestion.`
    );
  }

  const { suggestedSpec, sessionCount, dominanceRatio, topBlends, totalSessions } = logData;
  const pct = Math.round(dominanceRatio * 100);
  const chamberLabel = getChamberLabel(pipe);
  const isAromatic = AROMATIC_TYPES.has(suggestedSpec);

  // Build the core evidence sentence
  const blendList = topBlends.length > 0
    ? topBlends.slice(0, 2).join(' and ')
    : suggestedSpec + ' blends';

  const evidenceSentence = sessionCount === 1
    ? `One session with ${blendList} is the only data point here.`
    : `${sessionCount} of ${totalSessions} sessions${totalSessions > sessionCount ? ` (${pct}%)` : ''} have been with ${suggestedSpec} blends — primarily ${blendList}.`;

  // Build the specialization benefit sentence
  let benefitSentence;
  if (isAromatic) {
    benefitSentence =
      `Locking this pipe to aromatics preserves the cake and prevents the sweet toppings ` +
      `from bleeding into your non-aromatic rotation.`;
  } else if (suggestedSpec === 'English' || suggestedSpec === 'English/Balkan') {
    benefitSentence =
      `English blends leave Latakia oils that build over time — ` +
      `a dedicated pipe develops a residual character that makes each session richer.`;
  } else if (suggestedSpec === 'Virginia' || suggestedSpec === 'Virginia/Perique') {
    benefitSentence =
      `Virginia builds a clean, sweet cake that becomes more expressive with consistent use. ` +
      `Mixing it with heavier types would muddy that development.`;
  } else if (suggestedSpec === 'Burley') {
    benefitSentence =
      `Burley blends burn dry and leave a neutral ghost — dedicating this pipe keeps the characteristic ` +
      `nutty-earth notes clean without interference from heavier or sweeter blends.`;
  } else {
    benefitSentence =
      `Consistent use with one blend family builds a complementary ghost that improves over time.`;
  }

  // Add chamber note if available
  const chamberSentence = chamberLabel
    ? ` The ${chamberLabel} also suits this family well.`
    : '';

  return `${evidenceSentence} ${benefitSentence}${chamberSentence}`;
}

/**
 * Build context-awareness text for a pipe specialization recommendation.
 */
function buildSpecializationContext(pipe, logData, preferences = {}) {
  const preferredTypes = preferences.preferred_blend_types || preferences.preferredBlendTypes || [];
  const parts = [];

  if (logData?.hasLogData && logData.dominanceRatio >= 0.8) {
    parts.push(`Strong usage pattern — ${Math.round(logData.dominanceRatio * 100)}% of sessions align with this specialization.`);
  } else if (logData?.hasLogData) {
    parts.push(`Usage pattern is clear but not exclusive — mixed sessions exist.`);
  }

  if (preferredTypes.length > 0 && logData?.suggestedSpec) {
    const aligned = preferredTypes.some((t) =>
      logData.suggestedSpec.toLowerCase().includes(t.toLowerCase()) ||
      t.toLowerCase().includes(logData.suggestedSpec.toLowerCase())
    );
    if (aligned) {
      parts.push(`Aligns with your stated preference for ${preferredTypes.slice(0, 2).join(' and ')} blends.`);
    }
  }

  return parts.join(' ') || `Based on this pipe's session history across your collection.`;
}

// ─── Core Engine ──────────────────────────────────────────────────────────────

/**
 * Compute per-pipe blend-type usage from smoking logs.
 *
 * @param {object[]} smokingLogs
 * @param {object[]} blends
 * @returns {object} pipeId → { suggestedSpec, sessionCount, dominantType, topBlends, totalSessions }
 */
export function computePipeSpecializationCandidates(smokingLogs = [], blends = []) {
  if (!smokingLogs.length || !blends.length) return {};

  const blendById = Object.fromEntries(blends.map((b) => [b.id, b]));
  const typeCounts = {};    // pipeId → { type → count }
  const blendNames  = {};   // pipeId → { type → Set<name> }
  const totalSess   = {};   // pipeId → total session count

  for (const log of smokingLogs) {
    if (!log.pipe_id || !log.blend_id) continue;
    const blend = blendById[log.blend_id];
    if (!blend) continue;

    const rawType = blend.blend_type || blend.blend_family;
    if (!rawType || rawType === 'Unknown') continue;

    const spec = BLEND_TYPE_TO_SPECIALIZATION[rawType] ?? rawType;

    if (!typeCounts[log.pipe_id]) {
      typeCounts[log.pipe_id] = {};
      blendNames[log.pipe_id] = {};
      totalSess[log.pipe_id] = 0;
    }

    typeCounts[log.pipe_id][spec] = (typeCounts[log.pipe_id][spec] || 0) + 1;
    totalSess[log.pipe_id] += 1;

    if (!blendNames[log.pipe_id][spec]) blendNames[log.pipe_id][spec] = new Set();
    blendNames[log.pipe_id][spec].add(blend.name);
  }

  const result = {};
  for (const [pipeId, counts] of Object.entries(typeCounts)) {
    const total = totalSess[pipeId] || 1;
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (!sorted.length) continue;

    const [topType, topCount] = sorted[0];
    const dominanceRatio = topCount / total;

    result[pipeId] = {
      suggestedSpec:  topType,
      sessionCount:   topCount,
      totalSessions:  total,
      dominanceRatio,
      dominantType:   topType,
      topBlends:      [...(blendNames[pipeId][topType] || [])].slice(0, 3),
      allTypes:       sorted.map(([t, c]) => ({ type: t, count: c })),
      isAromatic:     AROMATIC_TYPES.has(topType),
      hasLogData:     true,
    };
  }

  return result;
}

/**
 * Generate specialization recommendations for pipes that lack one.
 *
 * @param {object[]} pipes
 * @param {object[]} blends
 * @param {object[]} smokingLogs
 * @param {object}   [preferences]  — user preferences ({ preferred_blend_types, etc. })
 * @returns {import('./recommendationSchema.js').Recommendation[]}
 */
export function generateSpecializationRecommendations(pipes = [], blends = [], smokingLogs = [], preferences = {}) {
  if (!pipes.length) return [];

  const specCandidates = computePipeSpecializationCandidates(smokingLogs, blends);

  // Pipes that have no specialization set
  const pipesWithoutSpec = pipes.filter(
    (p) => !p.specialization || (Array.isArray(p.specialization) && p.specialization.length === 0)
      || p.specialization === '' || p.specialization === null
  );

  if (!pipesWithoutSpec.length) return [];

  // Build candidate items for the recommendation
  const candidateItems = pipesWithoutSpec.slice(0, 20).map((pipe) => {
    const logData = specCandidates[pipe.id] ? { ...specCandidates[pipe.id] } : null;
    const hasLogData = !!logData && logData.sessionCount >= 2;
    const enrichedLogData = logData ? { ...logData, hasLogData } : null;

    const confidence = computeConfidence({
      usageHistoryRelevance: hasLogData ? (logData.dominanceRatio >= 0.6 ? 0.9 : 0.6) : 0,
      dataCompleteness:      hasLogData ? 0.8 : 0.1,
      preferenceAlignment:   null,
      diversityContribution: 0.7,
    });

    return {
      id:                   pipe.id,
      recordId:             pipe.id,
      recordType:           'pipe',
      recordName:           pipe.name,
      itemName:             pipe.name,
      maker:                pipe.maker || null,
      currentSpec:          pipe.specialization || null,
      suggestedSpec:        hasLogData ? logData.suggestedSpec : null,
      sessionCount:         logData?.sessionCount ?? 0,
      totalSessions:        logData?.totalSessions ?? 0,
      dominanceRatio:       logData?.dominanceRatio ?? 0,
      topBlends:            logData?.topBlends ?? [],
      allTypes:             logData?.allTypes ?? [],
      hasLogData,
      confidence,
      rationale:            buildSpecializationRationale(pipe, enrichedLogData),
      contextNote:          buildSpecializationContext(pipe, enrichedLogData, preferences),
      ownershipStatus:      'owned',
    };
  });

  // Split into evidence-backed vs no-data
  const withEvidence = candidateItems.filter((i) => i.hasLogData);
  const noData       = candidateItems.filter((i) => !i.hasLogData);

  const recommendations = [];

  // Recommendation for pipes with evidence
  if (withEvidence.length > 0) {
    const highConfCount = withEvidence.filter((i) => i.confidence === 'high').length;
    const overallConfidence = highConfCount >= withEvidence.length / 2 ? 'high' : 'medium';

    const topPipe = withEvidence[0];
    const summary = withEvidence.length === 1
      ? `${topPipe.recordName} has a clear ${topPipe.suggestedSpec} usage pattern — specialization will lock in that character.`
      : `${withEvidence.length} pipes show consistent usage patterns. Assigning specializations now preserves flavor integrity and prevents cross-contamination.`;

    recommendations.push(createRecommendation({
      category:           CATEGORY.COLLECTION_OPTIMIZATION,
      goal:               'pipes_need_specialization_evidence',
      actionType:         ACTION_TYPE.MULTI_PATH,
      title:              'Assign Specializations Based on Usage',
      summary,
      whyItMatters:       'A specialized pipe builds a residual cake tuned to one blend family. ' +
                          'Crossing aromatic and non-aromatic categories undoes that development and introduces off-notes in both directions.',
      recommendationText: 'Review the suggested specialization for each pipe. Accept, override, or set manually — but assign them before mixing gets any further.',
      moduleKey:          MODULE_KEY.PIPE,
      ownershipContext:   OWNERSHIP_CONTEXT.IN_COLLECTION,
      priority:           highConfCount > 0 ? PRIORITY.MEDIUM : PRIORITY.LOW,
      confidence:         overallConfidence,
      items:              withEvidence,
      actionPayload: {
        type:    'specialization_batch',
        pipes:   withEvidence.map((i) => ({ id: i.id, name: i.recordName, suggested: i.suggestedSpec })),
      },
      detailPayload: {
        mode: 'treat_individually',
      },
    }));
  }

  // Advisory for pipes with no log data
  if (noData.length > 0) {
    recommendations.push(createRecommendation({
      category:           CATEGORY.COLLECTION_OPTIMIZATION,
      goal:               'pipes_need_specialization_no_data',
      actionType:         ACTION_TYPE.ADVISORY,
      title:              'Pipes Without Usage History',
      summary:            `${noData.length} pipe${noData.length > 1 ? 's have' : ' has'} no logged sessions — specialization cannot be recommended without data.`,
      whyItMatters:       'The Curator needs session history to make evidence-backed specialization suggestions. ' +
                          'Log a few sessions for each of these pipes and come back — the pattern usually emerges within three to five sessions.',
      recommendationText: 'Start logging sessions for these pipes, or assign specializations manually if you already know their intended role.',
      moduleKey:          MODULE_KEY.PIPE,
      ownershipContext:   OWNERSHIP_CONTEXT.IN_COLLECTION,
      priority:           PRIORITY.LOW,
      confidence:         'low',
      items:              noData,
    }));
  }

  return recommendations;
}

