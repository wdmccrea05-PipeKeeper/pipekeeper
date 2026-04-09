/**
 * Session Planner
 *
 * Generates "what should I enjoy right now?" recommendations for a single
 * module context. This is intentionally separate from the pairing engine —
 * pairings answer "what should I combine?", session planning answers
 * "what should I use today?".
 *
 * Can run with a specific targetModule (e.g. 'whiskey') even when multiple
 * modules are active, enabling whiskey-only planning while Pairings handles
 * cross-module combinations.
 *
 * Hard rules:
 *   - Only considers records from the requested module
 *   - Never generates cross-module pairing output
 *   - Scores by recency, frequency, rating, and collection context
 *   - Returns 3–5 strong candidates with data-driven reasons
 */

// ─── Scoring helpers ──────────────────────────────────────────────────────────

function daysSince(dateValue) {
  if (!dateValue) return null;
  const ts = new Date(dateValue).getTime();
  if (!ts) return null;
  return Math.floor((Date.now() - ts) / 86400000);
}

/**
 * Score a bottle for session candidacy.
 * Higher = better candidate.
 */
function scoreBottle(bottle, tastingLogs = []) {
  const logs = tastingLogs.filter(
    (l) => l?.bottle_id === bottle.id || l?.bottleId === bottle.id
  );

  const lastDate = logs
    .map((l) => l?.tasting_date || l?.date || l?.created_date)
    .filter(Boolean)
    .sort()
    .reverse()[0];

  const daysSinceLast = daysSince(lastDate);
  const rating = Number(bottle.rating || bottle.user_rating || 0);

  // Recency score: more days since last = higher priority (max 60 pts)
  const recencyScore = daysSinceLast === null
    ? 55  // never tasted → high priority
    : Math.min(60, daysSinceLast * 0.8);

  // Frequency score: fewer logs = underused (max 20 pts)
  const freqScore = Math.max(0, 20 - logs.length * 3);

  // Rating score: higher-rated bottles deserve attention (max 20 pts)
  const ratingScore = rating >= 4 ? 20 : rating >= 3 ? 10 : rating >= 2 ? 5 : 0;

  // Rare / valuable bottles get a slight boost (max 5 pts)
  const valueScore = Number(bottle.retail_price || bottle.aftermarket_price || 0) > 100 ? 5 : 0;

  return {
    total: recencyScore + freqScore + ratingScore + valueScore,
    sessionCount: logs.length,
    lastTastedDays: daysSinceLast,
    rating,
  };
}

/**
 * Score a pipe for session candidacy.
 * Higher = better candidate (underused, neglected, recently rested).
 */
function scorePipe(pipe, smokingLogs = []) {
  const logs = smokingLogs.filter(
    (l) => l?.pipe_id === pipe.id || l?.pipeId === pipe.id
  );

  const lastDate = logs
    .map((l) => l?.date || l?.created_date)
    .filter(Boolean)
    .sort()
    .reverse()[0];

  const daysSinceLast = daysSince(lastDate);

  // Rest score: pipes need rest between sessions (ideal: 7+ days, max 50 pts)
  const restScore = daysSinceLast === null
    ? 45
    : daysSinceLast >= 30 ? 50
    : daysSinceLast >= 14 ? 35
    : daysSinceLast >= 7  ? 20
    : 0;

  // Usage score: underused pipes deserve attention (max 30 pts)
  const usageScore = Math.max(0, 30 - logs.length * 2);

  // Condition: prefer non-broken, non-needs-repair pipes (max 20 pts)
  const cond = String(pipe.condition || '').toLowerCase();
  const condScore = cond === 'excellent' || cond === 'good' || cond === '' ? 20 : cond === 'fair' ? 10 : 0;

  return {
    total: restScore + usageScore + condScore,
    sessionCount: logs.length,
    lastSmokedDays: daysSinceLast,
  };
}

/**
 * Score a blend for session candidacy.
 * Higher = better candidate (in stock, rested, rarely smoked recently).
 */
function scoreBlend(blend, smokingLogs = []) {
  const logs = smokingLogs.filter(
    (l) => l?.blend_id === blend.id || l?.blendId === blend.id
  );

  const lastDate = logs
    .map((l) => l?.date || l?.created_date)
    .filter(Boolean)
    .sort()
    .reverse()[0];

  const daysSinceLast = daysSince(lastDate);
  const oz = Number(blend.quantity_oz || blend.total_oz || 0);
  const rating = Number(blend.rating || 0);

  // Recency: not smoked recently = higher priority (max 50 pts)
  const recencyScore = daysSinceLast === null
    ? 45
    : Math.min(50, daysSinceLast * 0.7);

  // Stock: must have stock to smoke. Return a zero-total score instead of null
  // so the return type is always consistent; the caller filters by noStock.
  if (oz !== null && oz <= 0) {
    return { total: 0, sessionCount: logs.length, lastSmokedDays: daysSinceLast, oz, rating, noStock: true };
  }

  // Rating boost (max 25 pts)
  const ratingScore = rating >= 4 ? 25 : rating >= 3 ? 15 : rating >= 2 ? 8 : 0;

  // Underused (max 25 pts)
  const freqScore = Math.max(0, 25 - logs.length * 3);

  return {
    total: recencyScore + ratingScore + freqScore,
    sessionCount: logs.length,
    lastSmokedDays: daysSinceLast,
    oz,
    rating,
  };
}

// ─── Reason builders ──────────────────────────────────────────────────────────

function buildBottleReason(bottle, scoreData) {
  const { lastTastedDays, sessionCount, rating } = scoreData;

  if (lastTastedDays === null) {
    return `${bottle.name} has never been logged for a tasting session — opening it would add real data to your collection.`;
  }

  if (lastTastedDays >= 60) {
    return `${bottle.name} hasn't been revisited in ${lastTastedDays} days — long enough to taste it fresh again without palate memory carrying over.`;
  }

  if (lastTastedDays >= 30) {
    return `${bottle.name} is sitting at ${lastTastedDays} days since your last pour. This is a good window to log a focused tasting before it gets further away.`;
  }

  if (sessionCount <= 1 && rating === 0) {
    return `${bottle.name} has minimal tasting history — a session now would give your collection more to work with.`;
  }

  if (rating >= 4) {
    return `${bottle.name} is one of your highest-rated bottles and ${lastTastedDays !== null ? `hasn't been touched in ${lastTastedDays} days` : 'rarely makes it to the glass'}.`;
  }

  return `${bottle.name} is a strong candidate based on recency and collection balance.`;
}

function buildPipeReason(pipe, scoreData) {
  const { lastSmokedDays, sessionCount } = scoreData;

  if (lastSmokedDays === null) {
    return `${pipe.name} has no logged sessions yet. Starting here would help Curator understand how it fits into your rotation.`;
  }

  if (lastSmokedDays >= 21) {
    return `${pipe.name} has been resting for ${lastSmokedDays} days — well past the minimum, which means the bowl is clean and ready for a focused session.`;
  }

  if (sessionCount <= 2) {
    return `${pipe.name} is underused (${sessionCount} logged sessions). It would benefit from more time in the rotation to develop a clear role.`;
  }

  return `${pipe.name} is due for a session based on rotation balance.`;
}

function buildBlendReason(blend, scoreData) {
  const { lastSmokedDays, sessionCount, oz, rating } = scoreData;

  if (lastSmokedDays === null) {
    return `${blend.name} hasn't been smoked yet. Opening it now would start building the session history Curator needs to make better suggestions.`;
  }

  if (lastSmokedDays >= 30) {
    return `${blend.name} is ${lastSmokedDays} days since your last session. A revisit now ensures it doesn't fade from your active rotation.`;
  }

  if (rating >= 4) {
    return `${blend.name} is one of your top-rated blends and hasn't been enjoyed in ${lastSmokedDays} days.`;
  }

  if (oz !== null && oz < 2) {
    return `${blend.name} is running low (${oz.toFixed(1)} oz). This is a good window to finish a session before it's gone.`;
  }

  return `${blend.name} is a strong rotation candidate based on usage timing and collection fit.`;
}

// ─── Module-specific planners ─────────────────────────────────────────────────

function planWhiskeySession(context = {}) {
  const { bottles = [], tastingLogs = [] } = context;
  if (!bottles.length) return [];

  const scored = bottles
    .map((bottle) => {
      const scoreData = scoreBottle(bottle, tastingLogs);
      return { bottle, scoreData };
    })
    .sort((a, b) => b.scoreData.total - a.scoreData.total);

  return scored.slice(0, 5).map(({ bottle, scoreData }) => ({
    id: `session_bottle_${bottle.id}`,
    moduleKey: 'whiskey',
    itemType: 'bottle',
    item: bottle,
    title: bottle.name,
    subtitle: [bottle.distillery, bottle.type || bottle.whiskey_type].filter(Boolean).join(' · '),
    reason: buildBottleReason(bottle, scoreData),
    whyNow: scoreData.lastTastedDays === null
      ? 'Never logged — first session would add real data'
      : scoreData.lastTastedDays >= 30
        ? `${scoreData.lastTastedDays} days since last pour`
        : `${scoreData.sessionCount} session${scoreData.sessionCount !== 1 ? 's' : ''} logged`,
    whatToExpect: bottle.type || bottle.whiskey_type || 'Whiskey',
    scoreData,
  }));
}

function planPipeSession(context = {}) {
  const { pipes = [], blends = [], smokingLogs = [] } = context;

  const results = [];

  // Score pipes (if available)
  const scoredPipes = pipes.length
    ? pipes
        .map((pipe) => ({ pipe, scoreData: scorePipe(pipe, smokingLogs) }))
        .filter(({ scoreData }) => scoreData.total > 0)
        .sort((a, b) => b.scoreData.total - a.scoreData.total)
    : [];

  // Score blends (skip those with no stock)
  const scoredBlends = blends
    .map((blend) => {
      const scoreData = scoreBlend(blend, smokingLogs);
      return { blend, scoreData };
    })
    .filter(({ scoreData }) => !scoreData.noStock && scoreData.total > 0)
    .sort((a, b) => b.scoreData.total - a.scoreData.total);

  // Top pipes
  for (const { pipe, scoreData } of scoredPipes.slice(0, 3)) {
    results.push({
      id: `session_pipe_${pipe.id}`,
      moduleKey: 'pipe',
      itemType: 'pipe',
      item: pipe,
      title: pipe.name,
      subtitle: [pipe.shape, pipe.material].filter(Boolean).join(' · '),
      reason: buildPipeReason(pipe, scoreData),
      whyNow: scoreData.lastSmokedDays === null
        ? 'Never smoked — start building its rotation history'
        : `Rested ${scoreData.lastSmokedDays} days`,
      whatToExpect: pipe.specialization || pipe.shape || 'Pipe',
      scoreData,
    });
  }

  // Top blends
  for (const { blend, scoreData } of scoredBlends.slice(0, 3)) {
    results.push({
      id: `session_blend_${blend.id}`,
      moduleKey: 'tobacco',
      itemType: 'blend',
      item: blend,
      title: blend.name,
      subtitle: [blend.brand || blend.manufacturer, blend.blend_type || blend.blend_family].filter(Boolean).join(' · '),
      reason: buildBlendReason(blend, scoreData),
      whyNow: scoreData.lastSmokedDays === null
        ? 'Never smoked'
        : `${scoreData.lastSmokedDays} days since last session`,
      whatToExpect: blend.blend_type || blend.blend_family || 'Blend',
      scoreData,
    });
  }

  return results.slice(0, 5);
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Build a session plan for a given target module.
 *
 * @param {object} context          - Collection context (pipes, blends, bottles, logs…)
 * @param {object} [activeModules]  - Enabled module map { pipekeeper, whiskeykeeper, … }
 * @param {string} [targetModule]   - Optional: force recommendations for one module
 *                                    ('whiskey' | 'pipe' | 'tobacco' | 'cigar' | 'any')
 * @returns {SessionCandidate[]}
 */
export function buildSessionPlan(context = {}, activeModules = {}, targetModule = 'any') {
  const pipeActive    = activeModules.pipekeeper    !== false;
  const whiskeyActive = activeModules.whiskeykeeper !== false;

  const target = String(targetModule || 'any').toLowerCase();

  const results = [];

  if (whiskeyActive && (target === 'any' || target === 'whiskey')) {
    results.push(...planWhiskeySession(context));
  }

  if (pipeActive && (target === 'any' || target === 'pipe' || target === 'tobacco')) {
    results.push(...planPipeSession(context));
  }

  // When a specific module is targeted (not 'any'), filter results to that moduleKey.
  // This ensures the 'pipe' pill returns only pipe candidates and the 'tobacco' pill
  // returns only blend candidates, even though both come from planPipeSession.
  const filtered = target === 'any'
    ? results
    : results.filter((r) => r.moduleKey === target);

  // Deduplicate by id
  const seen = new Set();
  return filtered.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}