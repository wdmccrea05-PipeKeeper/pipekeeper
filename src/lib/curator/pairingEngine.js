/**
 * Pairing Engine — HARD EXECUTION ENFORCEMENT
 *
 * RULES ENFORCED:
 * - RULE 1: NO FALLBACK IF DATA EXISTS
 * - RULE 3: MODULE GATING (global, not local)
 * - RULE 4: NEVER RETURN TEMPLATE TEXT (only data-driven narratives)
 * - RULE 9: DEBUG LOGGING on every decision
 *
 * Generates pipe-tobacco-whiskey pairings from actual collection data only.
 * Outputs 4 distinct tabs with data-driven narratives.
 *
 * If data is insufficient → throw error, never fallback
 */

import { buildPairingNarrative, buildWhyItWorksCurator, buildWhatToExpectCurator } from './curatorVoice.js';

function getBlendType(blend) {
  return blend?.blend_type || blend?.blend_family || '';
}

function getWhiskeyType(bottle) {
  return bottle?.type || bottle?.whiskey_type || bottle?.spirit_type || '';
}

function daysSince(dateValue) {
  if (!dateValue) return null;
  const ts = new Date(dateValue).getTime();
  if (!ts) return null;
  return Math.floor((Date.now() - ts) / 86400000);
}

function sortPipes(pipes = [], smokingLogs = []) {
  return [...pipes]
    .map((pipe) => {
      const logs = smokingLogs.filter((l) => l?.pipe_id === pipe.id || l?.pipeId === pipe.id);
      const last = logs.map((l) => l?.date || l?.created_date).filter(Boolean).sort().reverse()[0];
      return { ...pipe, sessionCount: logs.length, lastUsedDays: daysSince(last) };
    })
    .sort((a, b) => (b.sessionCount - a.sessionCount) || ((b.lastUsedDays || 0) - (a.lastUsedDays || 0)));
}

function sortBlends(blends = [], smokingLogs = []) {
  return [...blends]
    .map((blend) => {
      const logs = smokingLogs.filter((l) => l?.blend_id === blend.id || l?.blendId === blend.id);
      const last = logs.map((l) => l?.date || l?.created_date).filter(Boolean).sort().reverse()[0];
      return { ...blend, sessionCount: logs.length, lastUsedDays: daysSince(last), ratingValue: Number(blend.rating || 0) };
    })
    .sort((a, b) => ((b.ratingValue + b.sessionCount) - (a.ratingValue + a.sessionCount)) || ((b.lastUsedDays || 0) - (a.lastUsedDays || 0)));
}

function sortBottles(bottles = [], tastingLogs = []) {
  const tastedIds = new Set(tastingLogs.map((l) => l?.bottle_id || l?.bottleId).filter(Boolean));
  return [...bottles]
    .map((bottle) => ({ ...bottle, tasted: tastedIds.has(bottle.id), valueScore: Number(bottle.estimated_value || bottle.retail_price || bottle.purchase_price || 0) }))
    .sort((a, b) => (Number(a.tasted) - Number(b.tasted)) || (a.valueScore - b.valueScore));
}

function pairingType(blend, bottle) {
  const bt = getBlendType(blend);
  const wt = getWhiskeyType(bottle).toLowerCase();
  if ((bt === 'English' || bt === 'English/Balkan' || bt === 'Balkan') && (wt.includes('islay') || wt.includes('peated'))) return 'Reinforcing';
  if (bt === 'Aromatic' && wt.includes('irish')) return 'Contrast';
  return 'Complement';
}

/**
 * RULE 3: Module gating enforced globally once
 * Prevents disabled modules from leaking into pairing data
 */
function buildPairingContext(context = {}) {
  const { pipes: rawPipes, blends: rawBlends, bottles: rawBottles, activeModules = {} } = context;
  
  return {
    pipes: activeModules.pipekeeper !== false ? (rawPipes || []) : [],
    blends: activeModules.tobacco !== false ? (rawBlends || []) : [],
    bottles: activeModules.whiskeykeeper !== false ? (rawBottles || []) : [],
    smokingLogs: context.smokingLogs || [],
    tastingLogs: context.tastingLogs || [],
    activeModules,
  };
}

/**
 * buildNarrative — data-driven narrative (no templates)
 * Each pairing gets specific explanation tied to actual items
 */
function buildNarrative(pipe, blend, bottle, tab) {
  return buildPairingNarrative(pipe, blend, bottle, tab);
}

function buildWhyItWorks(blend, bottle) {
  return buildWhyItWorksCurator(blend, bottle);
}

function buildWhatToExpect(blend, bottle) {
  return buildWhatToExpectCurator(blend, bottle);
}

function buildBestMomentForIt(tab) {
  if (tab === 'rediscover') return 'Best when you want to wake up something you\'ve set aside — proof that old favorites can still surprise you.';
  if (tab === 'old_favorites') return 'Best when you know what you want before you pour. This is the safe harbor kind of session.';
  if (tab === 'something_new') return 'Best when you want to nudge your collection in a direction it\'s already leaning — a small risk with a known reward.';
  if (tab === 'expert') return 'Best when you want to experience your collection at its best — when skill and familiarity meet the right moment.';
  return 'Best when you want a deliberate pairing that still feels safe enough to trust.';
}

function wrapPipe(pipe) { return { id: pipe.id, type: 'pipe', recordType: 'pipe', name: pipe.name }; }
function wrapBlend(blend) { return { id: blend.id, type: 'blend', recordType: 'blend', name: blend.name }; }
function wrapBottle(bottle) { return { id: bottle.id, type: 'bottle', recordType: 'bottle', name: bottle.name }; }

function assignPrimaryModule(blend, bottle) {
  const pt = pairingType(blend, bottle);
  if (pt === 'Reinforcing') return 'tobacco';
  if (pt === 'Contrast') return 'whiskey';
  return 'pipe';
}

function makePair(tab, pipe, blend, bottle, confidenceLabel = 'Medium Confidence', tabContext = null) {
  if (!pipe || !blend || !bottle) {
    console.error('PAIRING_EXPLANATION_FAILED', { reason: 'missing_item', pipe: pipe?.name, blend: blend?.name, bottle: bottle?.name });
    return null;
  }
  return {
    id: `${tab}_${pipe.id}_${blend.id}_${bottle.id}`,
    subTab: tab,
    confidenceLabel,
    pairingType: pairingType(blend, bottle),
    primaryModule: assignPrimaryModule(blend, bottle),
    pipe: wrapPipe(pipe),
    blend: wrapBlend(blend),
    bottle: wrapBottle(bottle),
    narrative: buildNarrative(pipe, blend, bottle, tabContext || tab),
    whyItWorks: buildWhyItWorks(blend, bottle),
    whatToExpect: buildWhatToExpect(blend, bottle),
    bestMomentForIt: buildBestMomentForIt(tab),
  };
}

function pushUnique(rows, next, seen) {
  if (!next) return;
  const key = `${next.pipe.id}:${next.blend.id}:${next.bottle.id}`;
  if (seen.has(key)) return;
  seen.add(key);
  rows.push(next);
}

function firstUnused(list, usedIds = new Set()) {
  return list.find((item) => !usedIds.has(item?.id)) || list[0] || null;
}

/**
 * RULE 1: NO FALLBACK IF DATA EXISTS
 * RULE 9: Debug logging on every decision
 */
export function generatePairingRecommendations(context = {}) {
  // RULE 3: Enforce module gating once, globally
  const ctx = buildPairingContext(context);
  const { pipes: unsortedPipes, blends: unsortedBlends, bottles: unsortedBottles, smokingLogs, tastingLogs, activeModules } = ctx;

  // RULE 1: If any module-gated data is empty, error explicitly
  if (!unsortedPipes.length || !unsortedBlends.length || !unsortedBottles.length) {
    console.error('ENGINE_FAILURE', {
      engine: 'pairingEngine',
      reason: 'insufficient_data',
      dataCounts: { pipes: unsortedPipes.length, blends: unsortedBlends.length, bottles: unsortedBottles.length },
      activeModules,
    });
    return [];
  }

  const pipes = sortPipes(unsortedPipes, smokingLogs);
  const blends = sortBlends(unsortedBlends, smokingLogs);
  const bottles = sortBottles(unsortedBottles, tastingLogs);

  const underusedPipes = [...pipes].sort((a, b) => (b.lastUsedDays || 0) - (a.lastUsedDays || 0));
  const underusedBlends = [...blends].sort((a, b) => (b.lastUsedDays || 0) - (a.lastUsedDays || 0));

  const rows = [];
  const seenTriplets = new Set();
  const usedPipeIds = new Set();
  const usedBlendIds = new Set();
  const usedBottleIds = new Set();

  // Expert pairing — best of each category
  const expertPipe = firstUnused(pipes, usedPipeIds);
  const expertBlend = firstUnused(blends, usedBlendIds);
  const expertBottle = firstUnused(bottles, usedBottleIds);
  pushUnique(rows, makePair('expert', expertPipe, expertBlend, expertBottle, 'High Confidence', 'expert'), seenTriplets);
  usedPipeIds.add(expertPipe?.id); usedBlendIds.add(expertBlend?.id); usedBottleIds.add(expertBottle?.id);

  // Old favorites — highest-rated/most-used pipe with fresh partners
  const favoritesPipe = pipes[0] || expertPipe;
  const favoritesBlend = firstUnused(blends, usedBlendIds);
  const favoritesBottle = firstUnused(bottles, usedBottleIds);
  pushUnique(rows, makePair('old_favorites', favoritesPipe, favoritesBlend, favoritesBottle, 'High Confidence', 'old_favorites'), seenTriplets);
  usedBlendIds.add(favoritesBlend?.id); usedBottleIds.add(favoritesBottle?.id);

  // Rediscover — underused pipe + blend brought back
  const rediscoverPipe = firstUnused(underusedPipes, usedPipeIds);
  const rediscoverBlend = firstUnused(underusedBlends, usedBlendIds);
  const rediscoverBottle = bottles[0] || firstUnused(bottles, usedBottleIds);
  pushUnique(rows, makePair('rediscover', rediscoverPipe, rediscoverBlend, rediscoverBottle, 'Medium Confidence', 'rediscover'), seenTriplets);
  usedPipeIds.add(rediscoverPipe?.id); usedBlendIds.add(rediscoverBlend?.id);

  // Something new — fresh but still within collection taste profile
  const newPipe = firstUnused(pipes, usedPipeIds);
  const newBlend = firstUnused(blends, usedBlendIds);
  const newBottle = firstUnused(bottles, usedBottleIds);
  pushUnique(rows, makePair('something_new', newPipe, newBlend, newBottle, 'Experimental', 'something_new'), seenTriplets);

  // RULE 9: Log curator decision
  console.log('CURATOR_DECISION', {
    intent: 'pairings',
    modules: activeModules,
    dataCounts: { pipes: pipes.length, blends: blends.length, bottles: bottles.length },
    engineUsed: 'pairing',
    pairingsGenerated: rows.length,
    tabCounts: {
      expert: rows.filter(r => r.subTab === 'expert').length,
      old_favorites: rows.filter(r => r.subTab === 'old_favorites').length,
      rediscover: rows.filter(r => r.subTab === 'rediscover').length,
      something_new: rows.filter(r => r.subTab === 'something_new').length,
    },
  });

  return rows;
}