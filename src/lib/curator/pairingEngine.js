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
  const spec = pipe?.specialization ? `${pipe.specialization} pipe` : 'pipe';
  return `${blend.name} and ${bottle.name} make sense together because ${blend.name} brings ${bt || 'its own'} character while ${bottle.name} adds ${wt || 'a complementary whiskey frame'}. ${pipe.name} matters because it is an established ${spec} in your collection and helps keep the session coherent.`;
}

function buildWhyItWorks(blend, bottle) {
  const bt = getBlendType(blend);
  const wt = getWhiskeyType(bottle).toLowerCase();
  if ((bt === 'Burley' || bt === 'Virginia/Burley') && wt.includes('bourbon')) return 'Burley earth and bourbon sweetness support each other without flattening the bowl.';
  if ((bt === 'English' || bt === 'English/Balkan' || bt === 'Balkan') && (wt.includes('peated') || wt.includes('islay') || wt.includes('scotch'))) return 'Smoke and malt depth move in the same direction, so the pairing feels intentional rather than forced.';
  if (bt === 'Aromatic' && wt.includes('irish')) return 'Irish whiskey keeps the topping lively without letting the session turn syrupy.';
  if (bt === 'Virginia/Perique' && wt.includes('rye')) return 'Rye spice trims the sweetness and gives the peppery side of the bowl more structure.';
  return 'Neither side strips the other of texture, so the bowl and pour stay identifiable through the session.';
}

function buildWhatToExpect(blend, bottle) {
  const bt = getBlendType(blend);
  const wt = getWhiskeyType(bottle).toLowerCase();
  if (bt === 'Aromatic') return 'Expect an easier, sweeter session where the sip resets the palate instead of crowding it.';
  if (bt === 'Burley' || bt === 'Virginia/Burley') return 'Expect a steady, warm session with cocoa, nut, and caramel holding together nicely.';
  if (bt === 'English' || bt === 'English/Balkan' || bt === 'Balkan' || wt.includes('peated')) return 'Expect a darker, slower session where smoke and oak stay present from start to finish.';
  return 'Expect a balanced session where both the tobacco and the pour remain recognizable.';
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
