/**
 * Pairing Engine
 *
 * Generates pipe-tobacco-whiskey pairings from your collection context.
 * Outputs 4 distinct tabs:
 *   - expert: highest-rated, most-used elements from your collection
 *   - old_favorites: proven rotation anchors with fresh partners
 *   - rediscover: underused pipes and blends brought back into play
 *   - something_new: one fresh candidate per category, still within your taste profile
 *
 * The engine does NOT generate cross-module recommendations (pipe-only, whiskey-only).
 * Pairings are context-aware, confidence-weighted, and human-curated for natural language.
 */

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

function buildNarrative(pipe, blend, bottle) {
  const bt = getBlendType(blend);
  const wt = getWhiskeyType(bottle);
  const pipeDesc = pipe?.specialization ? `${pipe.specialization}-focused` : 'versatile';
  const blendChar = bt || 'complex';
  
  // Reinforcing pairing (smoke + peated, burley + bourbon, etc.)
  if ((bt === 'English' || bt === 'English/Balkan' || bt === 'Balkan') && (wt.toLowerCase().includes('islay') || wt.toLowerCase().includes('peated'))) {
    return `This session stacks complementary smoke — the tobacco's dark layers and the whisky's phenolic character push in the same direction. ${pipe.name} as your ${pipeDesc} vessel keeps both intensities clear throughout.`;
  }
  
  // Aromatic + Irish (contrast)
  if (bt === 'Aromatic' && wt.toLowerCase().includes('irish')) {
    return `A lighter counterpoint: the topping's sweetness meets Irish whiskey's cleaner grain character. ${pipe.name} frames this without overwhelming it — a session that finds its balance through subtraction, not addition.`;
  }
  
  // Burley/Virginia-Burley + Bourbon (comfort pairing)
  if ((bt === 'Burley' || bt === 'Virginia/Burley') && wt.toLowerCase().includes('bourbon')) {
    return `Sweet tobacco earth and bourbon's caramel depth are old friends. They don't compete — they settle into each other. ${pipe.name} becomes the thinking pipe here, letting both elements breathe.`;
  }
  
  // Virginia/Perique + Rye
  if (bt === 'Virginia/Perique' && wt.toLowerCase().includes('rye')) {
    return `The peppery snap of Perique finds its match in rye spice. ${pipe.name} carries this interplay without dulling it — a session with real conversation between the bowl and the glass.`;
  }
  
  // Default: thoughtful complement
  return `${blend.name} and ${bottle.name} speak the same language: the tobacco's ${blendChar} structure holds its own against the whisky's finish. ${pipe.name}, proven in your hands, becomes the anchor that lets you taste both clearly.`;
}

function buildWhyItWorks(blend, bottle) {
  const bt = getBlendType(blend);
  const wt = getWhiskeyType(bottle).toLowerCase();
  
  if ((bt === 'Burley' || bt === 'Virginia/Burley') && wt.includes('bourbon')) {
    return 'The tobacco\'s earthy backbone lets bourbon\'s vanilla sweetness land without drowning the bowl. Both finish warm without competing for attention.';
  }
  
  if ((bt === 'English' || bt === 'English/Balkan' || bt === 'Balkan') && (wt.includes('peated') || wt.includes('islay') || wt.includes('scotch'))) {
    return 'Smoke recognizes smoke. The malt depth in a peated dram amplifies rather than masks the tobacco\'s complexity — each sip and pull reinforce the same sensory direction.';
  }
  
  if (bt === 'Aromatic' && wt.includes('irish')) {
    return 'Irish whiskey\'s grain-forward clean cut slices through topping sweetness just before it becomes cloying. The pairing resets itself with every pour.';
  }
  
  if (bt === 'Virginia/Perique' && wt.includes('rye')) {
    return 'Perique\'s pepper finds a partner in rye spice, and together they open new texture in each other. Neither one flattens — instead they sharpen.';
  }
  
  if (bt === 'Virginia' || bt === 'Virginia/Oriental') {
    return 'The bright fruit notes of Virginia leaf meet the whisky\'s middle palate without either fading. A session built on balance rather than boldness.';
  }
  
  if (bt === 'Aromatic') {
    return 'The topping\'s character has room to unfold without the whisky\'s tannins or finish overpowering it. This is a pairing for the nuanced sip, not the heavy pour.';
  }
  
  return 'Both tobacco and spirit maintain their identity throughout — neither dominates, neither retreats. This is the architecture of a considered pairing.';
}

function buildWhatToExpect(blend, bottle) {
  const bt = getBlendType(blend);
  const wt = getWhiskeyType(bottle).toLowerCase();
  
  if ((bt === 'English' || bt === 'English/Balkan' || bt === 'Balkan') && (wt.includes('peated') || wt.includes('islay'))) {
    return 'Prepare for a deep, meditative session. The smoke will linger across both the bowl and the dram — don\'t rush. This is the kind of pairing that opens up over an hour.';
  }
  
  if (bt === 'Aromatic') {
    return 'A gentler session. The sweetness invites you to slow down and notice subtlety rather than power. The whisky becomes a palate bridge, not a statement.';
  }
  
  if ((bt === 'Burley' || bt === 'Virginia/Burley') && wt.includes('bourbon')) {
    return 'Expect comfort. Warm, earthy, slightly sweet — the kind of session where both the tobacco and the pour settle into their best selves without requiring your full concentration.';
  }
  
  if (bt === 'Virginia' || bt === 'Virginia/Oriental') {
    return 'A brighter session. The leaf\'s natural sweetness and fruit character stay front-and-center, with the whisky providing subtle texture rather than dominance.';
  }
  
  if (bt === 'Virginia/Perique' && wt.includes('rye')) {
    return 'A session with edges. There\'s real interplay here — the tobacco\'s spice and the whisky\'s bite keep each other sharp. Not soft, but rewarding.';
  }
  
  return 'A balanced session where both elements maintain their voice. Neither overwhelms; together they\'re stronger than either alone.';
}

function buildBestMomentForIt(tab) {
  if (tab === 'rediscover') return 'Best when you want to bring an underused part of the collection back into the rotation.';
  if (tab === 'old_favorites') return 'Best when you want a dependable session built from proven favorites.';
  if (tab === 'something_new') return 'Best when you want something slightly different without leaving the guardrails of your collection.';
  return 'Best when you want a deliberate pairing that still feels safe enough to trust.';
}

function wrapPipe(pipe) { return { id: pipe.id, type: 'pipe', recordType: 'pipe', name: pipe.name }; }
function wrapBlend(blend) { return { id: blend.id, type: 'blend', recordType: 'blend', name: blend.name }; }
function wrapBottle(bottle) { return { id: bottle.id, type: 'bottle', recordType: 'bottle', name: bottle.name }; }

function makePair(tab, pipe, blend, bottle, confidenceLabel = 'Medium Confidence') {
  if (!pipe || !blend || !bottle) return null;
  return {
    id: `${tab}_${pipe.id}_${blend.id}_${bottle.id}`,
    subTab: tab,
    confidenceLabel,
    pairingType: pairingType(blend, bottle),
    leftItem: wrapPipe(pipe),
    blendBridge: wrapBlend(blend),
    rightItem: wrapBottle(bottle),
    narrative: buildNarrative(pipe, blend, bottle),
    whyItWorks: buildWhyItWorks(blend, bottle),
    whatToExpect: buildWhatToExpect(blend, bottle),
    bestMomentForIt: buildBestMomentForIt(tab),
  };
}

function pushUnique(rows, next, seen) {
  if (!next) return;
  const key = `${next.leftItem.id}:${next.blendBridge.id}:${next.rightItem.id}`;
  if (seen.has(key)) return;
  seen.add(key);
  rows.push(next);
}

function firstUnused(list, usedIds = new Set()) {
  return list.find((item) => !usedIds.has(item?.id)) || list[0] || null;
}

export function generatePairingRecommendations(context = {}) {
  const smokingLogs = context.smokingLogs || [];
  const tastingLogs = context.tastingLogs || [];
  const pipes = sortPipes(context.pipes || [], smokingLogs);
  const blends = sortBlends(context.blends || [], smokingLogs);
  const bottles = sortBottles(context.bottles || [], tastingLogs);

  if (!pipes.length || !blends.length || !bottles.length) return [];

  const underusedPipes = [...pipes].sort((a, b) => (b.lastUsedDays || 0) - (a.lastUsedDays || 0));
  const underusedBlends = [...blends].sort((a, b) => (b.lastUsedDays || 0) - (a.lastUsedDays || 0));

  const rows = [];
  const seenTriplets = new Set();
  const usedPipeIds = new Set();
  const usedBlendIds = new Set();
  const usedBottleIds = new Set();

  const expertPipe = firstUnused(pipes, usedPipeIds);
  const expertBlend = firstUnused(blends, usedBlendIds);
  const expertBottle = firstUnused(bottles, usedBottleIds);
  pushUnique(rows, makePair('expert', expertPipe, expertBlend, expertBottle, 'High Confidence'), seenTriplets);
  usedPipeIds.add(expertPipe?.id); usedBlendIds.add(expertBlend?.id); usedBottleIds.add(expertBottle?.id);

  const favoritesPipe = pipes[0] || expertPipe;
  const favoritesBlend = firstUnused(blends, usedBlendIds);
  const favoritesBottle = firstUnused(bottles, usedBottleIds);
  pushUnique(rows, makePair('old_favorites', favoritesPipe, favoritesBlend, favoritesBottle, 'High Confidence'), seenTriplets);
  usedBlendIds.add(favoritesBlend?.id); usedBottleIds.add(favoritesBottle?.id);

  const rediscoverPipe = firstUnused(underusedPipes, usedPipeIds);
  const rediscoverBlend = firstUnused(underusedBlends, usedBlendIds);
  const rediscoverBottle = bottles[0] || firstUnused(bottles, usedBottleIds);
  pushUnique(rows, makePair('rediscover', rediscoverPipe, rediscoverBlend, rediscoverBottle, 'Medium Confidence'), seenTriplets);
  usedPipeIds.add(rediscoverPipe?.id); usedBlendIds.add(rediscoverBlend?.id);

  const newPipe = firstUnused(pipes, usedPipeIds);
  const newBlend = firstUnused(blends, usedBlendIds);
  const newBottle = firstUnused(bottles, usedBottleIds);
  pushUnique(rows, makePair('something_new', newPipe, newBlend, newBottle, 'Experimental'), seenTriplets);

  if (!rows.length) {
    pushUnique(rows, makePair('expert', pipes[0], blends[0], bottles[0], 'Medium Confidence'), seenTriplets);
  }

  return rows;
}