/**
 * Session Planner
 *
 * Generates "what should I enjoy right now?" recommendations for a single
 * module context. Voice and reason output delegated to curatorVoice.js.
 */

import { buildBottleSessionReason, buildPipeSessionReason, buildBlendSessionReason } from './curatorVoice.js';

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

// ─── Reason builders — delegated to curatorVoice.js ──────────────────────────

const buildBottleReason = buildBottleSessionReason;
const buildPipeReason   = buildPipeSessionReason;
const buildBlendReason  = buildBlendSessionReason;

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

// ─── Main entry point ─────────────────────────────────────────────────────────

export function buildSessionPlan(context = {}, activeModules = {}, targetModule = 'any') {
  const pipeActive    = activeModules.pipekeeper    !== false;
  const whiskeyActive = activeModules.whiskeykeeper !== false;
  const target = String(targetModule || 'any').toLowerCase();
  const results = [];

  if (whiskeyActive && (target === 'any' || target === 'whiskey')) {
    results.push(...planWhiskeySession(context));
  }
  if (pipeActive && (target === 'any' || target === 'pipe' || target === 'tobacco' || target === 'blend')) {
    results.push(...planPipeSession(context));
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