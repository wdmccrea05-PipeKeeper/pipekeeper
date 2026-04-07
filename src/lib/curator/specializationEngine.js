/**
 * Specialization Engine
 *
 * Generates MULTI_PATH recommendations for pipe specialization.
 * Uses actual smoking log data — no LLM calls.
 *
 * Output: one structured recommendation per candidate pipe,
 * grouped into a single multi_path recommendation cohort.
 */

import { createRecommendation, CATEGORY, ACTION_TYPE, MODULE_KEY, OWNERSHIP_CONTEXT, PRIORITY } from './recommendationSchema.js';

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
 * @returns {import('./recommendationSchema.js').Recommendation[]}
 */
export function generateSpecializationRecommendations(pipes = [], blends = [], smokingLogs = []) {
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
    const logData = specCandidates[pipe.id];
    const hasLogData = !!logData && logData.sessionCount >= 2;

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
      confidence:           hasLogData && logData.dominanceRatio >= 0.6 ? 'high'
                              : hasLogData ? 'medium'
                              : 'low',
      rationale:            hasLogData
                              ? `${logData.sessionCount} sessions with ${logData.topBlends.join(', ')} suggest ${logData.suggestedSpec}`
                              : 'No smoking log data available — specialization must be set manually',
      ownershipStatus:      'owned',
    };
  });

  // Split into evidence-backed vs no-data
  const withEvidence = candidateItems.filter((i) => i.hasLogData);
  const noData       = candidateItems.filter((i) => !i.hasLogData);

  const recommendations = [];

  // Recommendation for pipes with evidence
  if (withEvidence.length > 0) {
    recommendations.push(createRecommendation({
      category:           CATEGORY.SPECIALIZATION,
      goal:               'pipes_need_specialization_evidence',
      actionType:         ACTION_TYPE.MULTI_PATH,
      title:              'Assign Specializations Based on Usage',
      summary:            `${withEvidence.length} pipe${withEvidence.length > 1 ? 's' : ''} have clear usage patterns that suggest a specialization`,
      whyItMatters:       'Specializations help you choose the right pipe for each blend type and track collection focus over time',
      recommendationText: 'Review and accept the suggested specialization for each pipe, or set a different one',
      moduleKey:          MODULE_KEY.PIPE,
      ownershipContext:   OWNERSHIP_CONTEXT.IN_COLLECTION,
      priority:           PRIORITY.MEDIUM,
      confidence:         'medium',
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
      category:           CATEGORY.SPECIALIZATION,
      goal:               'pipes_need_specialization_no_data',
      actionType:         ACTION_TYPE.ADVISORY,
      title:              'Pipes Without Specialization or Log Data',
      summary:            `${noData.length} pipe${noData.length > 1 ? 's have' : ' has'} no specialization and no smoking log data`,
      whyItMatters:       'Log a few sessions to build usage history — the Curator can then suggest specializations automatically',
      recommendationText: 'Start logging sessions for these pipes, or set specializations manually',
      moduleKey:          MODULE_KEY.PIPE,
      ownershipContext:   OWNERSHIP_CONTEXT.IN_COLLECTION,
      priority:           PRIORITY.LOW,
      confidence:         'low',
      items:              noData,
    }));
  }

  return recommendations;
}
