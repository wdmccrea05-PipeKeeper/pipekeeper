const SUB_TABS = ['expert', 'old_favorites', 'rediscover', 'something_new'];

const AROMATIC_TYPES = new Set(['Aromatic', 'Danish']);
const NON_AROMATIC_TYPES = new Set([
  'Virginia',
  'Virginia/Perique',
  'Virginia/Burley',
  'Virginia/Oriental',
  'English',
  'English/Balkan',
  'Balkan',
  'Burley',
  'Oriental',
  'Oriental/Turkish',
]);

function getBlendType(blend) {
  return blend?.blend_type || blend?.blend_family || '';
}

function getWhiskeyType(bottle) {
  return bottle?.type || bottle?.whiskey_type || bottle?.spirit_type || '';
}

function getPipeSpec(pipe) {
  return (pipe?.specialization || '').toLowerCase().trim();
}

function isAromaticBlend(blend) {
  return AROMATIC_TYPES.has(getBlendType(blend));
}

function isNonAromaticBlend(blend) {
  return NON_AROMATIC_TYPES.has(getBlendType(blend));
}

function aromaticConflict(pipe, blend) {
  const spec = getPipeSpec(pipe);
  if (!spec) return false;
  const aromaticPipe = spec.includes('aromatic');
  const nonAromaticPipe =
    spec.includes('english') ||
    spec.includes('virginia') ||
    spec.includes('burley') ||
    spec.includes('oriental') ||
    spec.includes('balkan') ||
    spec.includes('non-aromatic');

  if (aromaticPipe && isNonAromaticBlend(blend)) return true;
  if (nonAromaticPipe && isAromaticBlend(blend)) return true;
  return false;
}

function chamberNote(pipe) {
  const shape = (pipe?.shape || pipe?.bowl_style || '').toLowerCase();
  const size = (pipe?.sizeClass || '').toLowerCase();

  if (shape.includes('billiard')) return "its straight billiard chamber keeps the smoke even and focused from first light to finish";
  if (shape.includes('pot')) return "its wider pot chamber opens the blend up early and keeps the flavors broad";
  if (shape.includes('stack')) return "its taller stack bowl stretches the blend vertically and keeps the smoke disciplined";
  if (size === 'large') return "its larger bowl gives the blend enough room to settle and unfold gradually";
  if (size === 'small') return "its smaller chamber keeps the session concentrated and tidy";
  return "its chamber keeps the smoke steady and controlled through the bowl";
}

function whiskeyProfile(bottle) {
  const t = getWhiskeyType(bottle).toLowerCase();
  if (t.includes('bourbon')) return 'corn sweetness, vanilla oak, and rounded warmth';
  if (t.includes('rye')) return 'pepper, dry spice, and a firmer finish';
  if (t.includes('irish')) return 'lighter grain sweetness and an easy, clean frame';
  if (t.includes('peated') || t.includes('islay')) return 'smoke, earth, and a darker, more forceful profile';
  if (t.includes('scotch')) return 'malt depth, oak, and layered regional character';
  if (t.includes('flavored')) return 'sweetened flavoring that can either support or overwhelm depending on the blend';
  return 'its sweetness, oak, and overall structure';
}

function blendProfile(blend) {
  const t = getBlendType(blend);
  switch (t) {
    case 'Aromatic': return 'cased sweetness, room note, and a softer, more fragrant delivery';
    case 'Burley': return 'dry cocoa bitterness, nuttiness, and a broad, earthy core';
    case 'Virginia': return 'natural sweetness, hay, citrus, and a brighter top end';
    case 'Virginia/Perique': return 'sweet grass, darker fruit, and a peppery edge';
    case 'Virginia/Burley': return 'natural sweetness over a dry, nutty burley base';
    case 'Virginia/Oriental': return 'sweetness, floral spice, and a fragrant middle';
    case 'English': return 'smoke, leather, and a darker, incense-like structure';
    case 'English/Balkan': return 'latakia smoke layered with oriental spice and depth';
    case 'Balkan': return 'oriental spice, incense, and darker smoky depth';
    case 'Oriental': return 'dry floral spice and a fragrant, savory edge';
    default: return `${t || 'tobacco'} character`;
  }
}

function pairingType(blend, bottle) {
  const bt = getBlendType(blend);
  const wt = getWhiskeyType(bottle).toLowerCase();

  if (bt === 'Aromatic' && wt.includes('irish')) return 'Contrast';
  if ((bt === 'English' || bt === 'English/Balkan' || bt === 'Balkan') && (wt.includes('peated') || wt.includes('islay'))) return 'Complement';
  if ((bt === 'Burley' || bt === 'Virginia/Burley') && wt.includes('bourbon')) return 'Complement';
  if (bt === 'Virginia/Perique' && wt.includes('rye')) return 'Contrast';
  return 'Complement';
}

function confidenceLabel(score) {
  if (score >= 8.5) return 'High Confidence';
  if (score >= 7) return 'Medium Confidence';
  return 'Experimental';
}

function scorePair(pipe, blend, bottle, usageCounters, tabKey) {
  if (aromaticConflict(pipe, blend)) return -999;

  const pipeUsePenalty = usageCounters.pipe[pipe.id] ? usageCounters.pipe[pipe.id] * 1.5 : 0;
  const blendUsePenalty = usageCounters.blend[blend.id] ? usageCounters.blend[blend.id] * 1.5 : 0;
  const bottleUsePenalty = usageCounters.bottle[bottle.id] ? usageCounters.bottle[bottle.id] * 1.25 : 0;

  let score = 6.0;

  const bt = getBlendType(blend);
  const wt = getWhiskeyType(bottle).toLowerCase();
  const spec = getPipeSpec(pipe);

  if ((bt === 'Burley' || bt === 'Virginia/Burley') && wt.includes('bourbon')) score += 2.0;
  if ((bt === 'English' || bt === 'English/Balkan' || bt === 'Balkan') && (wt.includes('peated') || wt.includes('islay') || wt.includes('scotch'))) score += 2.2;
  if (bt === 'Aromatic' && wt.includes('irish')) score += 1.8;
  if (bt === 'Virginia/Perique' && wt.includes('rye')) score += 1.6;
  if (bt === 'Virginia' && wt.includes('bourbon')) score += 1.2;
  if (wt.includes('flavored') && bt !== 'Aromatic') score -= 1.0;

  if (spec && spec.includes('burley') && bt.includes('Burley')) score += 1.0;
  if (spec && spec.includes('aromatic') && bt === 'Aromatic') score += 1.0;
  if (spec && spec.includes('english') && (bt === 'English' || bt === 'English/Balkan' || bt === 'Balkan')) score += 1.0;
  if (spec && spec.includes('virginia') && bt.includes('Virginia')) score += 0.8;

  if (tabKey === 'rediscover' && blend.last_smoked_days >= 45) score += 0.8;
  if (tabKey === 'something_new' && blend.session_count === 0) score += 1.0;
  if (tabKey === 'old_favorites' && blend.favorite) score += 1.2;

  score -= pipeUsePenalty + blendUsePenalty + bottleUsePenalty;
  return score;
}

function buildNarrative(pipe, blend, bottle) {
  const p = chamberNote(pipe);
  const b = blendProfile(blend);
  const w = whiskeyProfile(bottle);
  const mode = pairingType(blend, bottle).toLowerCase();

  if (mode === 'contrast') {
    return `${blend.name} brings ${b}, while ${bottle.name} contributes ${w}. This is a contrast pairing: the pour softens or sharpens the tobacco in just the right places rather than echoing it note for note, and ${pipe.name}'s shape helps keep the bowl composed instead of letting the session get muddy.`;
  }

  return `${blend.name} offers ${b}, and ${bottle.name} supplies ${w}. This is a complement pairing: the shared notes lock together naturally, while ${pipe.name}'s smoking behavior keeps the bowl even enough for the tobacco and pour to stay in step from first light through the final third.`;
}

function buildWhyItWorks(blend, bottle) {
  const bt = getBlendType(blend);
  const wt = getWhiskeyType(bottle).toLowerCase();

  if ((bt === 'Burley' || bt === 'Virginia/Burley') && wt.includes('bourbon')) {
    return 'The whiskey’s vanilla-and-caramel sweetness rounds the burley’s bitterness without flattening it.';
  }
  if ((bt === 'English' || bt === 'English/Balkan' || bt === 'Balkan') && (wt.includes('peated') || wt.includes('islay'))) {
    return 'Smoke and darker spice reinforce each other, so neither the bowl nor the pour feels out of place.';
  }
  if (bt === 'Aromatic' && wt.includes('irish')) {
    return 'The lighter whiskey frame keeps the topping present without letting sweetness turn syrupy.';
  }
  if (bt === 'Virginia/Perique' && wt.includes('rye')) {
    return 'Rye spice trims the blend’s sweetness and gives the peppery side of the bowl more shape.';
  }
  return 'The bowl and pour stay in balance because neither one strips the other of texture or identity.';
}

function buildWhatToExpect(blend, bottle) {
  const bt = getBlendType(blend);
  const wt = getWhiskeyType(bottle).toLowerCase();

  if (bt === 'Aromatic') return 'Expect a smoother, sweeter session where the sip resets the palate instead of overpowering it.';
  if (bt === 'Burley' || bt === 'Virginia/Burley') return 'Expect a steady, cocoa-and-nut-driven bowl with warmth building gradually through the sip.';
  if (bt === 'English' || bt === 'English/Balkan' || bt === 'Balkan') return 'Expect a darker, more contemplative session with smoke and spice staying present all the way through.';
  if (wt.includes('rye')) return 'Expect a firmer finish and a more structured rhythm between draw and sip.';
  return 'Expect a balanced session where both the tobacco and the pour stay identifiable throughout.';
}

function buildBestMomentForIt(blend, bottle) {
  const bt = getBlendType(blend);
  const wt = getWhiskeyType(bottle).toLowerCase();

  if ((bt === 'English' || bt === 'English/Balkan' || bt === 'Balkan') && (wt.includes('peated') || wt.includes('islay'))) {
    return 'Best for a slower evening when you want smoke, depth, and a little more seriousness in the session.';
  }
  if (bt === 'Aromatic' && wt.includes('irish')) {
    return 'Best for an easy evening or first pour when you want sweetness without heaviness.';
  }
  if (bt === 'Burley' || bt === 'Virginia/Burley') {
    return 'Best for a relaxed late-afternoon or evening session when you want comfort and structure.';
  }
  return 'Best when you want a deliberate session that still feels easy to settle into.';
}

function wrapPipe(pipe) {
  return { id: pipe.id, type: 'pipe', recordType: 'pipe', name: pipe.name };
}
function wrapBlend(blend) {
  return { id: blend.id, type: 'blend', recordType: 'blend', name: blend.name };
}
function wrapBottle(bottle) {
  return { id: bottle.id, type: 'bottle', recordType: 'bottle', name: bottle.name };
}

function normalizeBlend(blend, smokingLogs = []) {
  const last = smokingLogs
    .filter((l) => l.blend_id === blend.id || l.blendId === blend.id)
    .map((l) => new Date(l.date || l.created_date || 0).getTime())
    .filter(Boolean)
    .sort((a, b) => b - a)[0];

  const session_count = smokingLogs.filter((l) => l.blend_id === blend.id || l.blendId === blend.id).length;
  const last_smoked_days = last ? Math.floor((Date.now() - last) / 86400000) : Infinity;

  return {
    ...blend,
    session_count,
    last_smoked_days,
    favorite: !!blend.favorite || session_count >= 3 || Number(blend.rating || 0) >= 4,
  };
}

function buildPairsForTab(tabKey, context, usageCounters) {
  const pipes = (context.pipes || []).filter(Boolean);
  const blends = (context.blends || []).map((b) => normalizeBlend(b, context.smokingLogs || []));
  const bottles = (context.bottles || []).filter(Boolean);

  const scored = [];

  for (const pipe of pipes) {
    for (const blend of blends) {
      if (aromaticConflict(pipe, blend)) continue;
      for (const bottle of bottles) {
        const score = scorePair(pipe, blend, bottle, usageCounters, tabKey);
        if (score < 6.5) continue;
        scored.push({ pipe, blend, bottle, score });
      }
    }
  }

  scored.sort((a, b) => b.score - a.score);

  const chosen = [];
  const localUsage = {
    pipe: { ...usageCounters.pipe },
    blend: { ...usageCounters.blend },
    bottle: { ...usageCounters.bottle },
  };

  for (const row of scored) {
    if ((localUsage.pipe[row.pipe.id] || 0) >= 2) continue;
    if ((localUsage.blend[row.blend.id] || 0) >= 2) continue;
    if ((localUsage.bottle[row.bottle.id] || 0) >= 2) continue;

    chosen.push({
      id: `${tabKey}_${row.pipe.id}_${row.blend.id}_${row.bottle.id}`,
      subTab: tabKey,
      confidenceLabel: confidenceLabel(row.score),
      pairingType: pairingType(row.blend, row.bottle),
      leftItem: wrapPipe(row.pipe),
      blendBridge: wrapBlend(row.blend),
      rightItem: wrapBottle(row.bottle),
      narrative: buildNarrative(row.pipe, row.blend, row.bottle),
      whyItWorks: buildWhyItWorks(row.blend, row.bottle),
      whatToExpect: buildWhatToExpect(row.blend, row.bottle),
      bestMomentForIt: buildBestMomentForIt(row.blend, row.bottle),
    });

    localUsage.pipe[row.pipe.id] = (localUsage.pipe[row.pipe.id] || 0) + 1;
    localUsage.blend[row.blend.id] = (localUsage.blend[row.blend.id] || 0) + 1;
    localUsage.bottle[row.bottle.id] = (localUsage.bottle[row.bottle.id] || 0) + 1;

    if (chosen.length === 3) break;
  }

  usageCounters.pipe = localUsage.pipe;
  usageCounters.blend = localUsage.blend;
  usageCounters.bottle = localUsage.bottle;

  return chosen;
}

export function generatePairingRecommendations(context = {}) {
  const usageCounters = { pipe: {}, blend: {}, bottle: {} };
  return SUB_TABS.flatMap((tab) => buildPairsForTab(tab, context, usageCounters));
}
