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
    if (tab === 'expert') return `This is the summit of complementary pairings. ${bottle.name}'s phenolic depth — that briny, seaweed-smoke character — finds an exact match in ${blend.name}'s Latakia-forward structure. The smoke in the tobacco and the peat in the whisky don't compete; they reinforce each other across every draw and sip. ${pipe.name} becomes the container for a session that unfolds over hours, where both elements open up rather than fatigue. This is expertise made manifest: knowing which pipes, which blends, and which bottles have spent years earning their place in your rotation, and having the judgment to trust them together.`;
    if (tab === 'old_favorites') return `Two anchors you know well — you've lived with ${blend.name} and ${bottle.name} long enough to have opinions about them. The Latakia smoke in the bowl catches the peaty phenol in the dram, and they speak the same language. In ${pipe.name}, a pipe you've proven over time, this pairing becomes a meditation. It's the kind of session you don't plan — you just reach for these three things because your hands know them.`;
    if (tab === 'rediscover') return `${pipe.name} has earned the right to be put away, but not forever. Bring it back with ${blend.name} and ${bottle.name}, two items that share a dark, complex vocabulary. The density of this combination — the tobacco's smoke, the whisky's peat — demands a pipe that can handle it without overheating or drowning. That's what you're remembering when you smoke this: why this particular pipe was worth acquiring in the first place.`;
    return `Smoke recognizes smoke, and phenol finds its mirror. In ${pipe.name}, ${blend.name} and ${bottle.name} create a session where neither element tries to shout — instead, they layer and deepen throughout, a pairing that improves across an hour as the bowl opens up.`;
  }
  
  // Aromatic + Irish (contrast)
  if (bt === 'Aromatic' && wt.toLowerCase().includes('irish')) {
    if (tab === 'expert') return `This pairing is built on precision: ${bottle.name}'s grain-forward, unpeated character creates a surgical contrast with ${blend.name}'s sweetened character. The Irish whiskey's clean, almost mineral palate cuts through the topping's creaminess before it can become cloying, resetting your palate with each pour so the tobacco's sweetness lands fresh again. ${pipe.name}, a pipe you've chosen for reliability, lets this interplay happen without interference — the geometry and heat management that made you pick it matter here, keeping the bowl comfortable and the flavors distinct.`;
    if (tab === 'old_favorites') return `You've smoked ${blend.name} enough to know its personality, and you've poured ${bottle.name} enough to trust its character. The contrast between them — aromatic sweetness meeting Irish clarity — is the kind of pairing you recognize immediately because you've built the foundation. In ${pipe.name}, with the confidence that comes from repetition, this becomes a study in balance: how much sweetness does the tobacco bring, and how much does the whiskey need to cut through it to feel like equals?`;
    if (tab === 'rediscover') return `${pipe.name} deserves a session that's lighter, more cerebral than the heavy pairings. ${blend.name}'s flavoring and ${bottle.name}'s unpeated Irish character offer that — a reminder that sophistication isn't always about weight. This combination rewards attention: notice how the whiskey's grain sweetness echoes the tobacco's topping, and then how the grain's clean finish resets everything. It's the kind of pairing that keeps your mind engaged rather than letting you zone out.`;
    return `Aromatic sweetness meets Irish clarity. Each element earns space: the topping's character in the bowl, the whiskey's grain-forward profile in the glass. ${pipe.name} becomes the anchor, keeping both from overwhelming the moment.`;
  }
  
  // Burley/Virginia-Burley + Bourbon (comfort pairing)
  if ((bt === 'Burley' || bt === 'Virginia/Burley') && wt.toLowerCase().includes('bourbon')) {
    if (tab === 'expert') return `${blend.name}'s earthy backbone — that nutty, slightly sweet character that comes from Burley's natural structure — pairs with ${bottle.name}'s vanilla and caramel in a way that feels inevitable rather than contrived. Neither fights the other; instead, they create a kind of warmth that deepens as you settle into the session. The bourbon's oak sweetness doesn't mask the tobacco's earthiness, and the tobacco doesn't hide in the bourbon's presence. ${pipe.name}, chosen for this context, carries both without complication — the kind of pipe that gets out of the way and lets the smoke and sip speak.`;
    if (tab === 'old_favorites') return `This is comfort you've earned. ${blend.name}, ${bottle.name}, and ${pipe.name} together form a kind of muscle memory — you reach for them without calculating, without second-guessing. The session unfolds as it always does: earth from the tobacco, warmth from the bourbon, ease from the pipe. No surprises, just the confidence that comes from knowing something works because you've lived it a hundred times.`;
    if (tab === 'rediscover') return `${pipe.name} was made for a session like this. The Burley-forward character of ${blend.name} needs a pipe that won't add harshness, that can sustain a longer smoke without fatigue. Pair it with ${bottle.name}, and you're setting up a two-hour conversation where the tobacco's earth and the bourbon's warmth just keep echoing each other. This is why you acquired this pipe in the first place: to hold something substantial and let it breathe.`;
    return `Burley's earthy sweetness and bourbon's vanilla-oak create an effortless harmony. In ${pipe.name}, this becomes the session you don't overthink — just reach for and trust.`;
  }
  
  // Virginia/Perique + Rye
  if (bt === 'Virginia/Perique' && wt.toLowerCase().includes('rye')) {
    if (tab === 'expert') return `This pairing has edges. Perique's peppery complexity — that signature spice and slight fruitiness — meets rye's grain-spice bite head-on. In most whiskeys, the rye would dominate; here, the Perique holds its ground and creates something that sharpens with every sip and pull. ${pipe.name}, a pipe that can handle density and heat without overwhelming, becomes essential: the geometry and materials need to sustain this conversation without letting either element fatigue into bitterness. This is a pairing for when you're paying attention.`;
    if (tab === 'old_favorites') return `You know ${blend.name}'s peppery character and you know ${bottle.name}'s spicy grain-forward structure. They're not comfortable partners — they're honest partners. In ${pipe.name}, they push each other. The Perique stays peppery, the rye stays sharp, and neither one softens into sweetness. It's the kind of session where your palate stays active the entire time, where you're not relaxing into comfort but rather engaging with the complexity.`;
    if (tab === 'rediscover') return `${pipe.name} isn't a meditation pipe — it's a conversation piece. Bring it back with ${blend.name}, a blend with real spice and structure, and ${bottle.name}, a whiskey that doesn't apologize. This combination demands attention, rewards focus, and reminds you why you chose a pipe that could handle something substantial. The Perique and rye play off each other in ways that softer pairings never would.`;
    return `Perique's pepper and rye's spice don't soften each other — they sharpen. In ${pipe.name}, this becomes a session where both elements maintain their voice and their edge, a pairing that stays active from the first light to the final bowl.`;
  }
  
  // Virginia blends + lighter whiskeys
  if ((bt === 'Virginia' || bt === 'Virginia/Oriental') && (wt.toLowerCase().includes('highland') || wt.toLowerCase().includes('bourbon') || wt.toLowerCase().includes('speyside'))) {
    if (tab === 'expert') return `${blend.name}'s natural Virginia fruit — that honeyed, sometimes slightly floral character — meets ${bottle.name}'s middle palate without either one fading. The fruit doesn't become background noise; the whisky doesn't become a hammer. Instead, the Virginia's brightness gains texture from the whisky's complexity, and the whisky's profile finds a partner in the tobacco's sweetness. ${pipe.name}, a pipe you've chosen for its reliability and character, carries both with ease. The chamber geometry, the stem length, the materials — all of it comes together to let this conversation happen cleanly, without heat overload or moisture problems. This is craft knowing craft.`;
    if (tab === 'old_favorites') return `You've learned what ${blend.name} does and you've learned what ${bottle.name} does. You've chosen {{pipe.name}} for how it smokes. Now you're recognizing the pattern: these three things belong in the same session. The Virginia's fruit stays present, the whisky's character stays clear, and {{pipe.name}} does what you've trusted it to do every time. This is the confidence that comes from repeated success — you're not discovering the pairing, you're executing it.`;
    if (tab === 'rediscover') return `{{pipe.name}} has been waiting for a session built on lightness and brightness. Bring it back with {{blend.name}}, a blend whose Virginia character shines rather than hides, and {{bottle.name}}, a whisky whose profile complements rather than dominates. You'll remember why this pipe earned its place: because it handles this exact range of tobacco and this exact spirit profile without getting in the way. It's the thinking pipe for the thinking session.`;
    return `Virginia's bright, honeyed character and the whisky's textured middle palate create a session where both elements maintain their identity. In {{pipe.name}}, this becomes a study in balance — not compromise, but genuine complementarity.`;
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