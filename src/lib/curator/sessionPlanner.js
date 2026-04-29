/**
 * Session Planner
 *
 * Generates "what should I enjoy right now?" recommendations for a single
 * module context. Voice and reason output delegated to curatorVoice.js.
 */

import {
  buildBottleSessionReason,
  buildPipeSessionReason,
  buildBlendSessionReason,
  buildCigarSessionReason,
  buildWineSessionReason,
} from './curatorVoice.js';

// ─── Scoring helpers ──────────────────────────────────────────────────────────

function daysSince(dateValue) {
  if (!dateValue) return null;
  const ts = new Date(dateValue).getTime();
  if (!ts) return null;
  return Math.floor((Date.now() - ts) / 86400000);
}

function scoreBottle(bottle, tastingLogs = []) {
  const logs = tastingLogs.filter(
    (l) => l?.bottle_id === bottle.id || l?.bottleId === bottle.id
  );
  const lastDate = logs
    .map((l) => l?.tasting_date || l?.date || l?.created_date)
    .filter(Boolean).sort().reverse()[0];
  const daysSinceLast = daysSince(lastDate);
  const rating = Number(bottle.rating || bottle.user_rating || 0);
  const recencyScore = daysSinceLast === null ? 55 : Math.min(60, daysSinceLast * 0.8);
  const freqScore = Math.max(0, 20 - logs.length * 3);
  const ratingScore = rating >= 4 ? 20 : rating >= 3 ? 10 : rating >= 2 ? 5 : 0;
  const valueScore = Number(bottle.retail_price || bottle.aftermarket_price || 0) > 100 ? 5 : 0;
  return { total: recencyScore + freqScore + ratingScore + valueScore, sessionCount: logs.length, lastTastedDays: daysSinceLast, rating };
}

function scorePipe(pipe, smokingLogs = []) {
  const logs = smokingLogs.filter(
    (l) => l?.pipe_id === pipe.id || l?.pipeId === pipe.id
  );
  const lastDate = logs.map((l) => l?.date || l?.created_date).filter(Boolean).sort().reverse()[0];
  const daysSinceLast = daysSince(lastDate);
  const restScore = daysSinceLast === null ? 45 : daysSinceLast >= 30 ? 50 : daysSinceLast >= 14 ? 35 : daysSinceLast >= 7 ? 20 : 0;
  const usageScore = Math.max(0, 30 - logs.length * 2);
  const cond = String(pipe.condition || '').toLowerCase();
  const condScore = cond === 'excellent' || cond === 'good' || cond === '' ? 20 : cond === 'fair' ? 10 : 0;
  return { total: restScore + usageScore + condScore, sessionCount: logs.length, lastSmokedDays: daysSinceLast };
}

function scoreBlend(blend, smokingLogs = []) {
  const logs = smokingLogs.filter(
    (l) => l?.blend_id === blend.id || l?.blendId === blend.id
  );
  const lastDate = logs.map((l) => l?.date || l?.created_date).filter(Boolean).sort().reverse()[0];
  const daysSinceLast = daysSince(lastDate);
  const oz = Number(
    blend.quantity_oz || blend.total_oz || blend.tin_total_quantity_oz ||
    blend.bulk_total_quantity_oz || blend.pouch_total_quantity_oz || 0
  );
  const rating = Number(blend.rating || 0);
  const recencyScore = daysSinceLast === null ? 45 : Math.min(50, daysSinceLast * 0.7);
  const hasExplicitZeroStock = oz === 0 &&
    (blend.quantity_oz !== undefined || blend.total_oz !== undefined ||
     blend.tin_total_quantity_oz !== undefined || blend.bulk_total_quantity_oz !== undefined);
  if (hasExplicitZeroStock) {
    return { total: 0, sessionCount: logs.length, lastSmokedDays: daysSinceLast, oz, rating, noStock: true };
  }
  const ratingScore = rating >= 4 ? 25 : rating >= 3 ? 15 : rating >= 2 ? 8 : 0;
  const freqScore = Math.max(0, 25 - logs.length * 3);
  return { total: recencyScore + ratingScore + freqScore, sessionCount: logs.length, lastSmokedDays: daysSinceLast, oz, rating };
}

function scoreCigar(cigar, cigarSessions = []) {
  const logs = cigarSessions.filter(
    (l) => l?.cigar_id === cigar.id || l?.cigarId === cigar.id
  );
  const lastDate = logs.map((l) => l?.date || l?.created_date).filter(Boolean).sort().reverse()[0];
  const lastSessionDays = daysSince(lastDate);
  const availableSticks = Math.max(0, Number(cigar.singles_equivalent ?? cigar.quantity ?? 0));
  const rating = Number(cigar.rating || 0);
  const hasReadyDate = !!cigar.ready_to_smoke_date;
  const readySignal = hasReadyDate && daysSince(cigar.ready_to_smoke_date) >= 0;

  if (availableSticks <= 0) {
    return { total: 0, sessionCount: logs.length, lastSessionDays, availableSticks, rating, noStock: true, readySignal };
  }

  const recencyScore = lastSessionDays === null ? 48 : Math.min(55, lastSessionDays * 0.85);
  const qualityScore = rating >= 4 ? 24 : rating >= 3 ? 14 : rating >= 2 ? 7 : 0;
  const readinessScore = readySignal ? 12 : 0;
  const usageScore = Math.max(0, 22 - logs.length * 3);
  const inventoryScore = availableSticks <= 2 ? 8 : availableSticks <= 5 ? 4 : 0;
  const favoriteScore = cigar.is_favorite ? 10 : 0;

  return {
    total: recencyScore + qualityScore + readinessScore + usageScore + inventoryScore + favoriteScore,
    sessionCount: logs.length,
    lastSessionDays,
    availableSticks,
    rating,
    readySignal,
  };
}

// ─── Reason builders — delegated to curatorVoice.js ──────────────────────────

const buildBottleReason = buildBottleSessionReason;
const buildPipeReason   = buildPipeSessionReason;
const buildBlendReason  = buildBlendSessionReason;
const buildCigarReason  = buildCigarSessionReason;
const buildWineReason   = buildWineSessionReason;

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

  const scoredPipes = pipes.length
    ? pipes
        .map((pipe) => ({ pipe, scoreData: scorePipe(pipe, smokingLogs) }))
        .filter(({ scoreData }) => scoreData.total > 0)
        .sort((a, b) => b.scoreData.total - a.scoreData.total)
    : [];

  const scoredBlends = blends
    .map((blend) => {
      const scoreData = scoreBlend(blend, smokingLogs);
      return { blend, scoreData };
    })
    .filter(({ scoreData }) => !scoreData.noStock && scoreData.total > 0)
    .sort((a, b) => b.scoreData.total - a.scoreData.total);

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

function planCigarSession(context = {}) {
  const { cigars = [], cigarSessions = [] } = context;
  if (!cigars.length) return [];

  const eligible = cigars.filter((cigar) => !cigar?.not_for_me && !cigar?.ai_excluded);

  const scored = eligible
    .map((cigar) => ({ cigar, scoreData: scoreCigar(cigar, cigarSessions) }))
    .filter(({ scoreData }) => !scoreData.noStock && scoreData.total > 0)
    .sort((a, b) => b.scoreData.total - a.scoreData.total);

  return scored.slice(0, 5).map(({ cigar, scoreData }) => ({
    id: `session_cigar_${cigar.id}`,
    moduleKey: 'cigar',
    itemType: 'cigar',
    item: cigar,
    title: cigar.name,
    subtitle: [cigar.brand, cigar.vitola || cigar.wrapper].filter(Boolean).join(' · '),
    reason: buildCigarReason(cigar, scoreData),
    whyNow: scoreData.lastSessionDays === null
      ? 'No cigar session logged yet'
      : scoreData.readySignal
        ? 'Humidor-ready now'
        : `${scoreData.lastSessionDays} days since last cigar session`,
    whatToExpect: cigar.strength || cigar.body || cigar.wrapper || 'Cigar session',
    scoreData,
  }));
}

// ─── Wine session scoring constants ──────────────────────────────────────────
// Baseline score when no prior tasting exists — high enough to make untasted
// wines attractive candidates without dominating wines that are urgently ripe.
const WINE_NEVER_TASTED_BASELINE   = 50;
// Cap on recency-derived score to prevent very old untasted wines from
// drowning out drinking-window urgency signals.
const WINE_MAX_RECENCY_SCORE       = 55;
// Multiplier converts days-since-last-tasting to a recency score.
const WINE_RECENCY_DAYS_MULTIPLIER = 0.75;

function scoreWine(wine, wineTastings = []) {
  const logs = wineTastings.filter(
    (l) => l?.wine_id === wine.id || l?.wineId === wine.id
  );
  const lastDate = logs
    .map((l) => l?.tasting_date || l?.date || l?.created_date)
    .filter(Boolean).sort().reverse()[0];
  const daysSinceLast = daysSince(lastDate);
  const quantity = Math.max(0, Number(wine.quantity ?? 0));

  if (quantity <= 0) {
    return { total: 0, sessionCount: logs.length, lastTastedDays: daysSinceLast, drinkWindowStatus: null, noStock: true };
  }

  const drinkWindowStatus = wine.drink_window_status || wine.drinking_window_status || null;
  const pastPeak = drinkWindowStatus === 'past_peak';
  const atPeak   = drinkWindowStatus === 'peak' || drinkWindowStatus === 'at_peak';
  const inWindow = drinkWindowStatus === 'in_window' || drinkWindowStatus === 'drink_now';

  // Recency score: how long since last tasting
  const recencyScore = daysSinceLast === null
    ? WINE_NEVER_TASTED_BASELINE
    : Math.min(WINE_MAX_RECENCY_SCORE, daysSinceLast * WINE_RECENCY_DAYS_MULTIPLIER);

  // Drinking-window urgency
  const windowScore = pastPeak ? 30 : atPeak ? 25 : inWindow ? 18 : 0;

  // Frequency penalty (too many recent tastings = less urgent)
  const freqScore = Math.max(0, 20 - logs.length * 3);

  const rating = Number(wine.rating || 0);
  const ratingScore = rating >= 4 ? 15 : rating >= 3 ? 8 : 0;

  return {
    total: recencyScore + windowScore + freqScore + ratingScore,
    sessionCount: logs.length,
    lastTastedDays: daysSinceLast,
    drinkWindowStatus,
    pastPeak,
    atPeak,
    inWindow,
  };
}

function planWineSession(context = {}) {
  const { wines = [], wineTastings = [] } = context;
  if (!wines.length) return [];

  const eligible = wines.filter((w) => !w?.not_for_me && !w?.ai_excluded);

  const scored = eligible
    .map((wine) => {
      const scoreData = scoreWine(wine, wineTastings);
      return { wine, scoreData };
    })
    .filter(({ scoreData }) => !scoreData.noStock && scoreData.total > 0)
    .sort((a, b) => b.scoreData.total - a.scoreData.total);

  return scored.slice(0, 5).map(({ wine, scoreData }) => {
    const { drinkWindowStatus, lastTastedDays, pastPeak, atPeak, inWindow } = scoreData;
    let whyNow;
    if (lastTastedDays === null) {
      whyNow = 'No tasting logged yet';
    } else if (pastPeak) {
      whyNow = 'Past drinking window';
    } else if (atPeak) {
      whyNow = 'At peak now';
    } else if (inWindow) {
      whyNow = 'In drinking window';
    } else if (lastTastedDays >= 30) {
      whyNow = `${lastTastedDays} days since last tasting`;
    } else {
      whyNow = `${scoreData.sessionCount} tasting${scoreData.sessionCount !== 1 ? 's' : ''} logged`;
    }

    const producer = wine.producer;
    const vintage  = wine.vintage;
    const style    = wine.style || wine.varietal || wine.wine_type;
    const subtitle = [producer, vintage, style].filter(Boolean).join(' · ');

    return {
      id: `session_wine_${wine.id}`,
      moduleKey: 'wine',
      itemType: 'wine',
      item: wine,
      title: wine.name || wine.wine_name || 'Wine',
      subtitle,
      reason: buildWineReason(wine, scoreData),
      whyNow,
      whatToExpect: style || drinkWindowStatus || 'Wine tasting',
      scoreData,
    };
  });
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function buildSessionPlan(context = {}, activeModules = {}, targetModule = 'any') {
  const pipeActive    = activeModules.pipekeeper    !== false;
  const whiskeyActive = activeModules.whiskeykeeper !== false;
  const cigarActive   = activeModules.cigarkeeper   !== false;
  const wineActive    = !!activeModules.winekeeper;
  const target = String(targetModule || 'any').toLowerCase();
  const results = [];

  if (whiskeyActive && (target === 'any' || target === 'whiskey')) {
    results.push(...planWhiskeySession(context));
  }
  if (pipeActive && (target === 'any' || target === 'pipe' || target === 'tobacco' || target === 'blend')) {
    results.push(...planPipeSession(context));
  }
  if (cigarActive && (target === 'any' || target === 'cigar')) {
    results.push(...planCigarSession(context));
  }
  if (wineActive && (target === 'any' || target === 'wine')) {
    results.push(...planWineSession(context));
  }

  const filtered = target === 'any'
    ? results
    : target === 'blend'
      ? results.filter((r) => r.itemType === 'blend')
      : results.filter((r) => r.moduleKey === target);

  const seen = new Set();
  return filtered.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}
