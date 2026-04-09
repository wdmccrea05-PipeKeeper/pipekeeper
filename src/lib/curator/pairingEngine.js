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

/**
 * buildNarrative — unique voice per tab + pairing type
 * Each recommendation has its own personality instead of template repetition
 */
function buildNarrative(pipe, blend, bottle, tab) {
  const bt = getBlendType(blend);
  const wt = getWhiskeyType(bottle);
  
  // Reinforcing pairing (smoke + peated, burley + bourbon, etc.)
  if ((bt === 'English' || bt === 'English/Balkan' || bt === 'Balkan') && (wt.toLowerCase().includes('islay') || wt.toLowerCase().includes('peated'))) {
    if (tab === 'expert') return `This is where smoke meets smoke. ${bottle.name}'s phenolic depth doubles down on ${blend.name}'s dark layers — not competing, but speaking in unison. ${pipe.name} carries both without flinching.`;
    if (tab === 'old_favorites') return `Two anchors you know well: ${blend.name} and ${bottle.name} are built to reinforce each other. The smoke in the bowl catches the smoke in the dram, and ${pipe.name} becomes the vessel that lets you sit with it.`;
    if (tab === 'rediscover') return `${pipe.name} has been waiting for a session like this. Pair it with ${blend.name} and ${bottle.name}, and you'll remember why this combination works — dense, complex, unflinching.`;
    return `Smoke and phenol lock into place. ${blend.name} and ${bottle.name} don't compete — they build on each other in ${pipe.name}'s bowl, a session that rewards patience.`;
  }
  
  // Aromatic + Irish (contrast)
  if (bt === 'Aromatic' && wt.toLowerCase().includes('irish')) {
    if (tab === 'expert') return `${bottle.name}'s clean grain cuts through ${blend.name}'s sweetness like a knife — not to overpower, but to reset. ${pipe.name} lets both voices land without muddy middle ground.`;
    if (tab === 'old_favorites') return `Contrast, not competition. You know ${blend.name} well, and ${bottle.name} is there to frame it differently. In ${pipe.name}, this becomes a study in clarity.`;
    if (tab === 'rediscover') return `Time to dust off ${pipe.name} for something lighter. ${blend.name}'s topping sweetness finds a partner in ${bottle.name}'s sharp, clean character — a reminder that you don't need heaviness to have impact.`;
    return `The bright cut of Irish whiskey meets aromatic tobacco topping. ${pipe.name} becomes the pause between the two, letting you feel their contrast.`;
  }
  
  // Burley/Virginia-Burley + Bourbon (comfort pairing)
  if ((bt === 'Burley' || bt === 'Virginia/Burley') && wt.toLowerCase().includes('bourbon')) {
    if (tab === 'expert') return `${blend.name}'s earthy backbone and ${bottle.name}'s caramel don't fight — they settle into each other like old wood in an old room. ${pipe.name} is the thinking piece for this one.`;
    if (tab === 'old_favorites') return `This is comfort built on trust. ${blend.name}, ${bottle.name}, and ${pipe.name} together are the session you reach for when you want to relax without thinking.`;
    if (tab === 'rediscover') return `Bring back ${pipe.name} and let it remember what it does best — hold sweet earth and bourbon warmth without getting between them.`;
    return `Sweet tobacco earth meets bourbon warmth. Neither one demands your attention; together they become the evening itself.`;
  }
  
  // Virginia/Perique + Rye
  if (bt === 'Virginia/Perique' && wt.toLowerCase().includes('rye')) {
    if (tab === 'expert') return `Perique's peppery snap finds a partner in rye's bite. ${pipe.name} keeps them both honest, a session where neither element softens.`;
    if (tab === 'old_favorites') return `This one has teeth. ${blend.name} and ${bottle.name} sharpen each other in ${pipe.name}, a pairing for when you want the bowl to talk back.`;
    if (tab === 'rediscover') return `${pipe.name} deserves an occasion where subtlety isn't the goal. ${blend.name}'s spice and ${bottle.name}'s edge were made for each other — bring this pipe along to feel it.`;
    return `Spice meets spice. The conversation between ${blend.name} and ${bottle.name} stays sharp throughout, kept clear by ${pipe.name}.`;
  }
  
  // Virginia blends + lighter whiskeys
  if ((bt === 'Virginia' || bt === 'Virginia/Oriental') && (wt.toLowerCase().includes('highland') || wt.toLowerCase().includes('bourbon') || wt.toLowerCase().includes('speyside'))) {
    if (tab === 'expert') return `${blend.name}'s bright fruit doesn't fade against ${bottle.name} — it gets texture. This is what it means when tobacco and spirit actually listen to each other. ${pipe.name} carries both like it was built for this.`;
    if (tab === 'old_favorites') return `You know what works. ${blend.name} in ${pipe.name} with ${bottle.name} beside it — this is the session where everything just flows without thinking.`;
    if (tab === 'rediscover') return `${pipe.name} has been patient. Bring it back with ${blend.name} and ${bottle.name}, and let it remind you why you acquired it in the first place.`;
    return `The bright notes of the leaf meet the whisky's middle palate without either one giving ground. A session built on balance, not surrender.`;
  }
  
  // Default fallback — varies by tab to create unique voices
  if (tab === 'expert') return `Two elements from your collection's best. ${blend.name} in ${pipe.name}, ${bottle.name} beside — this combination exists because it works, not by accident.`;
  if (tab === 'old_favorites') return `Proven, trusted, and ready to go. ${blend.name} and ${bottle.name} have earned their place in your rotation, and ${pipe.name} knows exactly how to carry them both.`;
  if (tab === 'rediscover') return `${pipe.name} is waiting for its moment. Bring it back into a session with ${blend.name} and ${bottle.name}, and feel how it settles back into its purpose.`;
  if (tab === 'something_new') return `A slight shift from the expected. ${blend.name} and ${bottle.name} together bring a freshness without breaking the pattern ${pipe.name} has already learned.`;
  
  return `${blend.name} and ${bottle.name} maintain their identity together. ${pipe.name}, proven in your hands, becomes the anchor that holds both clear.`;
}

/**
 * buildWhyItWorks — conversational explanation specific to blend + whiskey combo
 */
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

/**
 * buildWhatToExpect — mood + pacing guidance for the session
 */
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
  if (tab === 'rediscover') return 'Best when you want to wake up something you\'ve set aside — proof that old favorites can still surprise you.';
  if (tab === 'old_favorites') return 'Best when you know what you want before you pour. This is the safe harbor kind of session.';
  if (tab === 'something_new') return 'Best when you want to nudge your collection in a direction it\'s already leaning — a small risk with a known reward.';
  if (tab === 'expert') return 'Best when you want to experience your collection at its best — when skill and familiarity meet the right moment.';
  return 'Best when you want a deliberate pairing that still feels safe enough to trust.';
}

function wrapPipe(pipe) { return { id: pipe.id, type: 'pipe', recordType: 'pipe', name: pipe.name }; }
function wrapBlend(blend) { return { id: blend.id, type: 'blend', recordType: 'blend', name: blend.name }; }
function wrapBottle(bottle) { return { id: bottle.id, type: 'bottle', recordType: 'bottle', name: bottle.name }; }

function makePair(tab, pipe, blend, bottle, confidenceLabel = 'Medium Confidence', tabContext = null) {
  if (!pipe || !blend || !bottle) return null;
  return {
    id: `${tab}_${pipe.id}_${blend.id}_${bottle.id}`,
    subTab: tab,
    confidenceLabel,
    pairingType: pairingType(blend, bottle),
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

  if (!rows.length) {
    pushUnique(rows, makePair('expert', pipes[0], blends[0], bottles[0], 'Medium Confidence', 'expert'), seenTriplets);
  }

  return rows;
}