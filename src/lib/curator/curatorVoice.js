/**
 * Curator Voice Engine
 *
 * Defines HOW Curator speaks — tone, structure, expression, variation.
 *
 * RULES:
 * - Every output references real item names
 * - No repeated sentence structures across cards
 * - No filler language or generic conclusions
 * - Deterministic variation: same item = same structure, different items = different structures
 * - Calm, precise, observational — not promotional
 */

// ─── Deterministic variant picker ────────────────────────────────────────────
// Hashes a seed string to consistently pick one of N variants for a given item.
// Ensures the same item always gets the same expression structure.

export function pickVariant(seed, pool) {
  if (!pool || pool.length === 0) return null;
  let hash = 0;
  for (let i = 0; i < (seed || '').length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return pool[Math.abs(hash) % pool.length];
}

// ─── Bottle session reason builders ──────────────────────────────────────────
// 5 structurally distinct ways to explain why a bottle deserves tonight's session.

const BOTTLE_REASON_NEVER_TASTED = [
  (name) => `${name} hasn't had a single session logged — opening it now adds the first real data point and brings it into Curator's rotation logic.`,
  (name) => `There's no tasting history on ${name}. A session tonight changes that — one entry is enough to make it visible in future planning.`,
  (name) => `${name} is sitting in your collection without a single note attached. That's worth fixing — the data from one pour becomes the foundation for everything Curator can suggest about it.`,
  (name) => `No logged tastings yet for ${name}. Opening it is the right move — you're not just drinking it, you're starting its record.`,
  (name) => `${name} has been in the collection but off the books. A session now closes that gap and gives you something to compare against when you return to it.`,
];

const BOTTLE_REASON_LONG_GAP = [
  (name, days) => `${name} has had ${days} days to develop since your last pour. That's long enough for real change — this is a different tasting than your last one.`,
  (name, days) => `Your last session with ${name} was ${days} days ago. Long enough that your palate is approaching it fresh again. Worth the pour.`,
  (name, days) => `${days} days is a meaningful gap for ${name}. However it was when you last opened it, it isn't the same bottle now. That's the case for opening it tonight.`,
  (name, days) => `${name} has been untouched for ${days} days. An opened bottle changes gradually — revisiting it here closes a real gap in your tasting record.`,
  (name, days) => `You haven't returned to ${name} in ${days} days. If it's been improving in the glass, you're overdue. If not, that's worth knowing too.`,
];

const BOTTLE_REASON_MEDIUM_GAP = [
  (name, days) => `${name} is at ${days} days since your last session. Not urgent, but a focused pour now keeps its record current before the gap gets harder to close.`,
  (name, days) => `${days} days since your last tasting with ${name}. This is a good window — you're not repeating yourself, but you haven't lost the thread of it either.`,
  (name, days) => `At ${days} days, ${name} is the right candidate. Far enough from your last pour to taste it cleanly, close enough to compare.`,
];

const BOTTLE_REASON_HIGH_RATED = [
  (name, days) => `${name} is one of the stronger bottles in your collection and hasn't had a pour in ${days} days. Rotating your best back in isn't indulgent — it's good practice.`,
  (name, days) => `Your top-rated bottles deserve consistent attention. ${name} hasn't seen a glass in ${days} days. Tonight is straightforward.`,
];

export function buildBottleSessionReason(bottle, scoreData) {
  const { lastTastedDays, sessionCount, rating } = scoreData;
  const name = bottle.name;
  const seed = bottle.id || name;

  if (lastTastedDays === null) {
    return pickVariant(seed, BOTTLE_REASON_NEVER_TASTED)(name);
  }
  if (lastTastedDays >= 60) {
    return pickVariant(seed, BOTTLE_REASON_LONG_GAP)(name, lastTastedDays);
  }
  if (lastTastedDays >= 30) {
    return pickVariant(seed, BOTTLE_REASON_MEDIUM_GAP)(name, lastTastedDays);
  }
  if (rating >= 4) {
    return pickVariant(seed, BOTTLE_REASON_HIGH_RATED)(name, lastTastedDays);
  }
  return `${name} is the strongest rotation candidate right now — usage timing and collection balance both point here.`;
}

// ─── Pipe session reason builders ────────────────────────────────────────────

const PIPE_REASON_NEVER_SMOKED = [
  (name) => `${name} hasn't been smoked yet. No rest required — but a first session is overdue if it's been in your rack.`,
  (name) => `There's no session history for ${name}. Logging the first one matters — it tells Curator how this pipe fits and starts building the rest pattern.`,
  (name) => `${name} is rotation-eligible but has no logged sessions. Light it up — one session starts its record and makes it visible for future pairing suggestions.`,
  (name) => `${name} is unlogged. That means Curator is working blind on it. A session tonight fixes that.`,
];

const PIPE_REASON_WELL_RESTED = [
  (name, days) => `${name} has been resting ${days} days — the bowl has had time to air out and settle. This is the right window.`,
  (name, days) => `${days} days of rest for ${name}. The cake is dry, the stem is clear. Session timing doesn't get cleaner than this.`,
  (name, days) => `${name} has had a proper rest at ${days} days. Bring it back into rotation before the gap becomes long enough to forget what it does.`,
  (name, days) => `At ${days} days, ${name} has had more than enough time between sessions. It's ready and it's earning rotation time.`,
];

const PIPE_REASON_UNDERUSED = [
  (name, count) => `${name} has only ${count} logged session${count !== 1 ? 's' : ''}. That's not enough history to know what it does best — more rotation time builds that picture.`,
  (name, count) => `Only ${count} session${count !== 1 ? 's' : ''} on ${name}. At this point it doesn't have a defined role in your collection. Tonight helps establish one.`,
  (name, count) => `${name} is underused with ${count} logged session${count !== 1 ? 's' : ''}. A pipe needs consistent use to reveal its character — it's not there yet.`,
];

export function buildPipeSessionReason(pipe, scoreData) {
  const { lastSmokedDays, sessionCount } = scoreData;
  const name = pipe.name;
  const seed = pipe.id || name;

  if (lastSmokedDays === null) {
    return pickVariant(seed, PIPE_REASON_NEVER_SMOKED)(name);
  }
  if (lastSmokedDays >= 21) {
    return pickVariant(seed, PIPE_REASON_WELL_RESTED)(name, lastSmokedDays);
  }
  if (sessionCount <= 2) {
    return pickVariant(seed, PIPE_REASON_UNDERUSED)(name, sessionCount);
  }
  return `${name} is due for rotation. The balance in your current use pattern puts this one next.`;
}

// ─── Blend session reason builders ───────────────────────────────────────────

const BLEND_REASON_NEVER_SMOKED = [
  (name) => `${name} has stock but no sessions logged — it's aging without a record. A bowl tonight starts that.`,
  (name) => `No session history on ${name}. It's been sitting in your cellar without a note. Open it — the first bowl tells you what you're working with.`,
  (name) => `${name} is in the cellar and off the books. Log a session and bring it into Curator's picture. One smoke is enough to change what it can suggest.`,
  (name) => `${name} hasn't been smoked yet. It's time — you either like what it's doing now, or you learn where it needs more time.`,
];

const BLEND_REASON_LONG_GAP = [
  (name, days) => `${name} is ${days} days away from your last session. Virginia and pressed blends shift over time — revisiting it now is likely a different experience.`,
  (name, days) => `${days} days since your last bowl of ${name}. Long enough for a meaningful revisit, especially if it's been aging in the cellar.`,
  (name, days) => `${name} has had ${days} days in the tin since your last smoke. That's a real gap — whatever it was doing then, it's had time to settle.`,
  (name, days) => `${name} hasn't come up in your rotation for ${days} days. Pull it out — it's overdue, and at this point it may surprise you.`,
];

const BLEND_REASON_LOW_STOCK = [
  (name, oz) => `${name} is down to ${oz.toFixed(1)} oz — close enough to the end that a session now makes sense before it's gone.`,
  (name, oz) => `Only ${oz.toFixed(1)} oz remaining on ${name}. Finish it well — a focused session at the end of a tin is worth more than letting it dry out.`,
];

const BLEND_REASON_HIGH_RATED = [
  (name, days) => `${name} is one of your top-rated blends and hasn't been smoked in ${days} days. Strong blends don't stay strong if they're ignored.`,
  (name, days) => `Your rating on ${name} is high, and it's been ${days} days since your last bowl. That's the case for returning to it.`,
];

export function buildBlendSessionReason(blend, scoreData) {
  const { lastSmokedDays, sessionCount, oz, rating } = scoreData;
  const name = blend.name;
  const seed = blend.id || name;

  if (lastSmokedDays === null) {
    return pickVariant(seed, BLEND_REASON_NEVER_SMOKED)(name);
  }
  if (lastSmokedDays >= 30) {
    return pickVariant(seed, BLEND_REASON_LONG_GAP)(name, lastSmokedDays);
  }
  if (rating >= 4) {
    return pickVariant(seed, BLEND_REASON_HIGH_RATED)(name, lastSmokedDays);
  }
  if (oz !== null && oz < 2) {
    return pickVariant(seed, BLEND_REASON_LOW_STOCK)(name, oz);
  }
  return `${name} fits your current rotation gap — usage timing and blend balance both land here.`;
}

const CIGAR_REASON_NEVER_LOGGED = [
  (name) => `${name} has no cigar sessions logged yet. One focused smoke tonight creates a baseline Curator can use for future humidor planning.`,
  (name) => `No session history exists for ${name}. Logging it now turns it from a static inventory line into a true session candidate.`,
  (name) => `${name} is in your humidor but off the books. A first session gives you real recency and enjoyment data to work from.`,
];

const CIGAR_REASON_LONG_GAP = [
  (name, days) => `${name} hasn't shown up in a session for ${days} days. That's a meaningful rest window and a strong revisit signal.`,
  (name, days) => `${days} days since your last session with ${name}. That's enough distance to reassess it with a fresh palate.`,
  (name, days) => `${name} has rested ${days} days in storage. It's a timely candidate for tonight's rotation.`,
];

const CIGAR_REASON_AGING_READY = [
  (name) => `${name} appears humidor-ready now. This is a good window to check how that extra rest translated in-session.`,
  (name) => `${name} is at or past its ready-to-smoke target. A session now validates whether the aging plan is paying off.`,
];

const CIGAR_REASON_LOW_STOCK_FAVORITE = [
  (name, qty) => `${name} is a favorite with only ${qty} stick${qty !== 1 ? 's' : ''} left. Smoke it while it's at peak and decide if it needs restock.`,
  (name, qty) => `You like ${name}, and inventory is down to ${qty}. This is the right time for a deliberate smoke-and-restock check.`,
];

export function buildCigarSessionReason(cigar, scoreData) {
  const { lastSessionDays, sessionCount, readySignal, availableSticks, rating } = scoreData;
  const name = cigar.name;
  const seed = cigar.id || name;

  if (lastSessionDays === null) {
    return pickVariant(seed, CIGAR_REASON_NEVER_LOGGED)(name);
  }
  if (readySignal) {
    return pickVariant(seed, CIGAR_REASON_AGING_READY)(name);
  }
  if (lastSessionDays >= 30) {
    return pickVariant(seed, CIGAR_REASON_LONG_GAP)(name, lastSessionDays);
  }
  if ((cigar.is_favorite || rating >= 4) && availableSticks <= 2) {
    return pickVariant(seed, CIGAR_REASON_LOW_STOCK_FAVORITE)(name, availableSticks);
  }
  if (sessionCount <= 1) {
    return `${name} is under-logged in your session history. Smoking it now improves recommendation quality and humidor rotation balance.`;
  }
  return `${name} is a balanced cigar-session candidate right now based on recency, inventory, and your collection profile.`;
}

// ─── Wine session reason builders ────────────────────────────────────────────

const WINE_REASON_NEVER_TASTED = [
  (name) => `${name} has no tasting logged yet. Opening it now creates the first data point Curator can use for drinking-window and cellar-balance recommendations.`,
  (name) => `There's no session history on ${name}. A pour tonight starts its record — even one note tells Curator whether it's drinking well now.`,
  (name) => `${name} is in your cellar with no logged tastings. Opening it is how you find out if the timing is right or if it needs more rest.`,
  (name) => `No tasting data exists for ${name}. One session closes that gap and turns it from a static cellar entry into an active recommendation candidate.`,
];

const WINE_REASON_IN_WINDOW = [
  (name) => `${name} is currently inside its drinking window — the cellar balance and timing both point to opening it now.`,
  (name) => `${name} is drinking well right now. Opening it within the window is the right move before conditions shift.`,
  (name) => `The drinking window on ${name} is open. Cellaring it further carries diminishing returns at this stage.`,
];

const WINE_REASON_AT_PEAK = [
  (name) => `${name} is at or approaching its peak window. Pour it now — holding it longer risks missing the optimal experience.`,
  (name) => `Timing is right for ${name}. Peak drinking windows close gradually; opening it now is the correct decision.`,
];

const WINE_REASON_PAST_PEAK = [
  (name) => `${name} may be past its intended peak window. Opening it sooner rather than later is advisable — waiting will not improve it.`,
  (name) => `${name} has exceeded its drinking window estimate. It's worth opening now and evaluating while it still shows well.`,
];

const WINE_REASON_LONG_GAP = [
  (name, days) => `${name} hasn't had a tasting logged in ${days} days. Revisiting it now captures how it's evolved in the cellar since your last note.`,
  (name, days) => `${days} days since your last pour of ${name}. Wines shift — this is likely a different experience than your last entry suggests.`,
];

export function buildWineSessionReason(wine, scoreData) {
  const { lastTastedDays, drinkWindowStatus, sessionCount } = scoreData;
  const name = wine.name || wine.wine_name || 'This wine';
  const seed = wine.id || name;

  if (lastTastedDays === null) {
    return pickVariant(seed, WINE_REASON_NEVER_TASTED)(name);
  }
  if (drinkWindowStatus === 'past_peak') {
    return pickVariant(seed, WINE_REASON_PAST_PEAK)(name);
  }
  if (drinkWindowStatus === 'peak' || drinkWindowStatus === 'at_peak') {
    return pickVariant(seed, WINE_REASON_AT_PEAK)(name);
  }
  if (drinkWindowStatus === 'in_window' || drinkWindowStatus === 'drink_now') {
    return pickVariant(seed, WINE_REASON_IN_WINDOW)(name);
  }
  if (lastTastedDays >= 60) {
    return pickVariant(seed, WINE_REASON_LONG_GAP)(name, lastTastedDays);
  }
  return `${name} is a strong session candidate based on recency, cellar balance, and your collection profile.`;
}

// ─── Pairing narrative builders ───────────────────────────────────────────────
// Each blendType × whiskeyType combination has a structurally distinct narrative.
// Narratives do NOT reuse "this works because" or identical opening structures.

const PAIRING_OPENING_STYLES = [
  // Style A: Direct observation (what's happening)
  'direct',
  // Style B: Contrast framing (what's NOT happening)
  'contrast',
  // Style C: Outcome first
  'outcome',
  // Style D: Functional (what the pipe does)
  'functional',
  // Style E: Collection-based reasoning
  'collection',
];

export function buildPairingNarrative(pipe, blend, bottle, tab) {
  const bt = blend?.blend_type || blend?.blend_family || '';
  const wt = (bottle?.type || bottle?.whiskey_type || bottle?.spirit_type || '').toLowerCase();
  const seed = `${pipe?.id}${blend?.id}${bottle?.id}${tab}`;

  // ── English/Balkan + Peated Scotch ──
  if ((bt === 'English' || bt === 'English/Balkan' || bt === 'Balkan') &&
      (wt.includes('islay') || wt.includes('peated'))) {
    const style = pickVariant(seed, ['direct', 'contrast', 'outcome']);
    if (style === 'direct') {
      return `${blend.name} carries Latakia smoke as a structural element, not a flavoring — and ${bottle.name}'s phenolic depth operates the same way. Neither is decorating the other. They're doubling down on the same character. ${pipe.name} becomes the environment where that happens: a chamber that can sustain density and heat over an hour without tipping into harshness. What you end up with is a session that intensifies steadily rather than peaking early and fading.`;
    }
    if (style === 'contrast') {
      return `This isn't a contrast pairing — nothing here is cutting or softening anything else. ${blend.name} and ${bottle.name} are reinforcing the same smoky, dark direction. The interest comes from how each adds a different dimension to that shared character: the tobacco brings earth and spice, the dram brings brine and peat. ${pipe.name}'s role is containment — keeping both focused without letting the heat blur the distinction.`;
    }
    return `What you notice first in this combination is density. ${blend.name}'s Latakia is present from the first draw, and ${bottle.name}'s peat arrives on the palate in the same register. Neither announcement is sharp. They merge rather than compete. ${pipe.name} sustains that over the session — the bowl size and stem length keep it even. This is a long, deliberate session — not the kind you rush.`;
  }

  // ── Aromatic + Irish ──
  if (bt === 'Aromatic' && wt.includes('irish')) {
    const style = pickVariant(seed, ['functional', 'outcome', 'direct']);
    if (style === 'functional') {
      return `${bottle.name} is doing more work here than it seems. Its clean, grain-forward character cuts through ${blend.name}'s sweetness before the topping becomes cloying — then steps back. That reset is the mechanism: each sip of the whiskey is a palate refresh, not a complement. ${pipe.name} matters because a pipe that runs hot here would push the sweetness further and defeat that balance. A pipe that smokes cool and dry keeps the interplay clean.`;
    }
    if (style === 'outcome') {
      return `The sweetness in ${blend.name} lands lighter than you'd expect. That's ${bottle.name} at work — the Irish grain character absorbs the topping's edge and leaves the aromatic's better qualities intact. The result is a session that's pleasant without being saccharine. ${pipe.name} holds that at the right temperature. A cooler-smoking pipe is the difference between this pairing working and feeling too sweet.`;
    }
    return `${blend.name}'s flavoring character and ${bottle.name}'s clean Irish profile occupy different register positions — one sweet and rounded, one dry and grain-forward. They don't merge; they alternate. A sip of the whiskey resets what the bowl established, which is how you maintain interest across a longer session. ${pipe.name} is the anchor: it keeps the tobacco's character consistent so the whiskey has something defined to respond to.`;
  }

  // ── Burley/Virginia-Burley + Bourbon ──
  if ((bt === 'Burley' || bt === 'Virginia/Burley') && wt.includes('bourbon')) {
    const style = pickVariant(seed, ['direct', 'outcome', 'contrast']);
    if (style === 'direct') {
      return `The earthy, nutty structure of ${blend.name} and the vanilla-oak character of ${bottle.name} occupy the same warmth register without competing for it. That's why this settles rather than spikes. ${pipe.name} is handling both without interference — the chamber volume and bowl geometry keep the tobacco's body intact, which is what the bourbon needs to respond to. The session unfolds at pace rather than peaking.`;
    }
    if (style === 'outcome') {
      return `Two hours with ${blend.name} and ${bottle.name} feel earned rather than just pleasant. The tobacco's earthiness gives the bourbon's sweetness somewhere to land; the bourbon's warmth reinforces what the tobacco does naturally. Neither needs to perform. ${pipe.name} is why this holds across a longer session — a pipe that handles Burley's density well keeps the combination from going flat midway.`;
    }
    return `This isn't a pairing that surprises — it delivers exactly what it promises. ${blend.name}'s Burley gives the session a dry, substantive base, and ${bottle.name}'s corn-forward sweetness fills in the warmth without overwhelming it. The combination doesn't create tension. It creates comfort. ${pipe.name} is consistent enough to let both do their job without adding variables.`;
  }

  // ── Virginia/Perique + Rye ──
  if (bt === 'Virginia/Perique' && wt.includes('rye')) {
    const style = pickVariant(seed, ['direct', 'contrast', 'functional']);
    if (style === 'direct') {
      return `Perique's peppery signature finds an exact counterpart in ${bottle.name}'s grain spice. They don't cancel each other — they raise the overall tension of the session. ${blend.name} keeps its Virginia sweetness underneath, which prevents the combination from turning harsh, but the dominant note across both bowl and glass is sharpness. ${pipe.name} matters here because it determines how much heat enters the equation. A pipe that runs hot pushes both elements too far.`;
    }
    if (style === 'contrast') {
      return `This is not a gentle combination. ${blend.name}'s Perique brings real pepper and dried fruit, and ${bottle.name}'s rye grain doesn't soften it — it adds its own edge on top. What makes it work is the Virginia base in the tobacco, which gives the palate a moment of sweetness between the sharper notes. ${pipe.name} has to handle density here — a small bowl or tight draw would overwhelm the session before it builds.`;
    }
    return `${pipe.name} is doing specific work in this combination: moderating the heat so ${blend.name}'s Perique doesn't spike into bitterness. Get that right, and what you have is a session where the spice from the tobacco and the rye grain character from ${bottle.name} create mutual reinforcement — each one sharpens the other in a way that stays interesting rather than becoming fatiguing.`;
  }

  // ── Virginia/Oriental + Highland/Speyside ──
  if ((bt === 'Virginia' || bt === 'Virginia/Oriental') &&
      (wt.includes('highland') || wt.includes('speyside') || wt.includes('single malt'))) {
    const style = pickVariant(seed, ['outcome', 'direct', 'collection']);
    if (style === 'outcome') {
      return `The fruit character in ${blend.name} — the natural sweetness that Virginia leaf carries without any flavoring — finds an echo in ${bottle.name}'s malt profile. Neither is heavy. Together they create a session with real brightness that stays interesting across time. ${pipe.name} is the reason this stays clean: a pipe that can run cool and even keeps the Virginia's delicate sweetness intact rather than baking it off early.`;
    }
    if (style === 'direct') {
      return `${blend.name} leans toward the lighter, brighter end of the tobacco spectrum. ${bottle.name} occupies similar territory — the Highland or Speyside character brings fruit and malt without heaviness. These two elements don't counterbalance each other; they amplify each other's strengths. ${pipe.name}'s contribution is consistency: a bowl that keeps combustion even lets the Virginia's natural sweetness develop across the session instead of flaring early.`;
    }
    return `In a rotation like yours, this combination offers something that most of your other pairings don't: lightness with structure. ${blend.name} and ${bottle.name} are both restrained by nature. The pairing doesn't assert itself — it rewards attention. ${pipe.name} is well-suited to that kind of session: a pipe that doesn't add its own character lets the tobacco and whiskey define the experience.`;
  }

  // ── Default: grounded in actual items ──
  const style = pickVariant(seed, ['direct', 'functional', 'outcome']);
  if (style === 'direct') {
    return `${blend.name} and ${bottle.name} share a tendency toward the same register — neither is trying to dominate. What that creates is a session with internal consistency: what you taste in the bowl is close to what you taste in the glass, which is restful rather than demanding. ${pipe.name} holds both steady. Over the course of an hour, the combination opens rather than fades.`;
  }
  if (style === 'functional') {
    return `${pipe.name} is doing specific work here: it's keeping the session at the temperature where ${blend.name}'s character stays clear and ${bottle.name} can respond to something defined. Pull those apart and both are fine on their own. Together, with the right pipe, the session has a coherence that neither would achieve independently.`;
  }
  return `What you get with ${blend.name} and ${bottle.name} isn't complexity for its own sake. The combination settles. The tobacco does what it does, the whiskey does what it does, and they don't argue. ${pipe.name} is the right container for that kind of session — predictable, controlled, and reliable enough to let both items speak.`;
}

export function buildWhyItWorksCurator(blend, bottle) {
  const bt = blend?.blend_type || blend?.blend_family || '';
  const wt = (bottle?.type || bottle?.whiskey_type || '').toLowerCase();
  const seed = `why_${blend?.id}${bottle?.id}`;

  const variations = [
    // Variation set A: mechanism first
    () => {
      if ((bt === 'English' || bt === 'Balkan') && (wt.includes('islay') || wt.includes('peated'))) {
        return `The tobacco's smoke and the dram's peat operate in the same register. They reinforce rather than compete — everything moves in the same direction.`;
      }
      if (bt === 'Aromatic' && wt.includes('irish')) {
        return `The Irish whiskey's grain character cuts through the topping's sweetness at the right moment, acting as a palate reset rather than a complement.`;
      }
      if ((bt === 'Burley' || bt === 'Virginia/Burley') && wt.includes('bourbon')) {
        return `The tobacco's earthy structure and the bourbon's oak-sweet warmth don't compete — they share the same warmth register and settle into each other.`;
      }
      if (bt === 'Virginia/Perique' && wt.includes('rye')) {
        return `Perique's pepper and rye's grain spice sharpen each other rather than cancel out. The Virginia base keeps the combination from tipping into harshness.`;
      }
      return `Both tobacco and spirit maintain their identity across the session — neither dominates, which is what lets the combination hold across time.`;
    },

    // Variation set B: outcome framing
    () => {
      if ((bt === 'English' || bt === 'Balkan') && (wt.includes('islay') || wt.includes('peated'))) {
        return `The result is a session that intensifies steadily. Smoke from both sides creates depth rather than harshness when the tobacco and spirit are calibrated this closely.`;
      }
      if (bt === 'Aromatic' && wt.includes('irish')) {
        return `The sweetness from the aromatic stays present but controlled — the whiskey keeps it from becoming the only thing you notice.`;
      }
      return `The session has internal consistency — bowl and glass are pointing in the same direction without crowding each other.`;
    },
  ];

  return pickVariant(seed, variations)();
}

export function buildWhatToExpectCurator(blend, bottle) {
  const bt = blend?.blend_type || blend?.blend_family || '';
  const wt = (bottle?.type || bottle?.whiskey_type || '').toLowerCase();
  const seed = `expect_${blend?.id}${bottle?.id}`;

  const options = [
    () => {
      if ((bt === 'English' || bt === 'Balkan') && (wt.includes('islay') || wt.includes('peated'))) {
        return `A long, deliberate session. The smoke settles in rather than spikes. Give it time — the first bowl establishes the baseline and the second one is where it opens.`;
      }
      if (bt === 'Aromatic' && wt.includes('irish')) {
        return `A lighter session than the category suggests. The whiskey keeps the sweetness honest. This is one to smoke slowly and attentively.`;
      }
      if ((bt === 'Burley' || bt === 'Virginia/Burley') && wt.includes('bourbon')) {
        return `Warmth and consistency from first light to finish. This is the kind of combination that doesn't need to be analyzed — you'll know immediately if it's working.`;
      }
      if (bt === 'Virginia/Perique' && wt.includes('rye')) {
        return `Real edges throughout. The spice doesn't soften — it builds. Best smoked when you want to be engaged, not relaxed.`;
      }
      return `A session with balance rather than peaks. Neither the tobacco nor the whiskey will announce itself loudly. What you'll notice is how well-matched they are.`;
    },

    () => {
      if ((bt === 'English' || bt === 'Balkan') && (wt.includes('islay') || wt.includes('peated'))) {
        return `Dense and unhurried. The session rewards patience — it doesn't show everything in the first fifteen minutes.`;
      }
      if ((bt === 'Burley' || bt === 'Virginia/Burley') && wt.includes('bourbon')) {
        return `Comfort. Not excitement — comfort. The kind where both elements are in their lane and the hour passes well.`;
      }
      return `A session that holds together across time. The combination doesn't peak early or fade — it maintains.`;
    },
  ];

  return pickVariant(seed, options)();
}

// ─── Grow & Expand rationale builder ─────────────────────────────────────────

const GROW_OPENING_STYLES = [
  // Each style has a different structural approach
  'gap_first',       // What's missing, then why it matters
  'collection_lens', // What you have, then what it can't do
  'contrast',        // What would change with the new item
  'functional',      // What specific role the new item fills
];

export function buildGrowRationale(context = {}) {
  const { existingType, suggestedType, existingItems = [], suggestedProduct, moduleKey } = context;
  const seed = `${existingType}${suggestedType}${suggestedProduct}`;
  const style = pickVariant(seed, GROW_OPENING_STYLES);

  if (moduleKey === 'tobacco' || moduleKey === 'blend') {
    if (style === 'gap_first') {
      return buildTobaccoGapFirst(existingType, suggestedType, suggestedProduct, existingItems);
    }
    if (style === 'collection_lens') {
      return buildTobaccoCollectionLens(existingType, suggestedType, suggestedProduct, existingItems);
    }
    if (style === 'contrast') {
      return buildTobaccoContrast(existingType, suggestedType, suggestedProduct, existingItems);
    }
    return buildTobaccoFunctional(existingType, suggestedType, suggestedProduct, existingItems);
  }

  if (moduleKey === 'whiskey' || moduleKey === 'bottle') {
    if (style === 'gap_first') {
      return buildWhiskeyGapFirst(existingType, suggestedType, suggestedProduct, existingItems);
    }
    if (style === 'collection_lens') {
      return buildWhiskeyCollectionLens(existingType, suggestedType, suggestedProduct, existingItems);
    }
    if (style === 'contrast') {
      return buildWhiskeyContrast(existingType, suggestedType, suggestedProduct, existingItems);
    }
    return buildWhiskeyFunctional(existingType, suggestedType, suggestedProduct, existingItems);
  }

  return `Your collection would benefit from this addition. It addresses a gap that limits what Curator can suggest for session planning and pairing.`;
}

function buildTobaccoGapFirst(existingType, suggestedType, product, items) {
  const count = items.length;
  const typeLabel = existingType || 'current blend family';
  return `${suggestedType} is absent from your cellar. With ${count} ${typeLabel} blend${count !== 1 ? 's' : ''} already in rotation, your sessions are pulling in one direction — and that's fine until you want contrast. ${product || suggestedType} fills the lane that everything you currently own leaves open.`;
}

function buildTobaccoCollectionLens(existingType, suggestedType, product, items) {
  const count = items.length;
  const typeLabel = existingType || 'your current blends';
  return `${count > 0 ? count + ' ' + typeLabel + ' blend' + (count !== 1 ? 's give' : ' gives') : 'Your current collection gives'} you a clear picture of one flavor territory. What it doesn't give you is the contrast that makes that territory interesting by comparison. ${suggestedType} — specifically something like ${product || 'this style'} — introduces the second axis.`;
}

function buildTobaccoContrast(existingType, suggestedType, product, items) {
  return `Everything your cellar does well right now, it does in the ${existingType || 'same'} direction. A ${suggestedType} blend changes that. Not by displacing what you have — by giving it something to sit next to. ${product || suggestedType} is the straightforward choice: it's documented, it's not experimental, and it answers a specific gap rather than adding volume for its own sake.`;
}

function buildTobaccoFunctional(existingType, suggestedType, product, items) {
  return `The functional gap here is ${suggestedType} — a family your current blends don't cover. Adding ${product || 'something in this lane'} doesn't expand the collection arbitrarily; it unlocks session types and pairings that your existing stock can't support. The recommendation is specific rather than general for that reason.`;
}

function buildWhiskeyGapFirst(existingType, suggestedType, product, items) {
  const count = items.length;
  return `${suggestedType} is missing from your collection. Your ${count} bottle${count !== 1 ? 's' : ''} cover${count === 1 ? 's' : ''} the ${existingType || 'current'} lane well — but that lane has limits. ${product || suggestedType} introduces the specific contrast that opens pairing territory your current selection can't reach.`;
}

function buildWhiskeyCollectionLens(existingType, suggestedType, product, items) {
  return `Your bourbon foundation is consistent, but consistency has a ceiling. Everything in the collection is pulling toward sweetness and oak. ${product || suggestedType} puts something in the opposite corner — ${suggestedType.toLowerCase().includes('rye') ? 'spice and grain tension instead of warmth' : 'a different character that your current bottles can\'t replicate'}. It doesn't replace anything. It creates contrast.`;
}

function buildWhiskeyContrast(existingType, suggestedType, product, items) {
  return `The gap isn't visible from inside the collection — it only shows when you want something your bottles can't deliver. ${suggestedType} is that something. A bottle like ${product || 'one in this style'} sits in different pairing territory than what you have: different tobacco affinities, different serve contexts, different finish character. That's what makes it the addition worth making.`;
}

function buildWhiskeyFunctional(existingType, suggestedType, product, items) {
  return `There's a specific pairing use case that none of your current bottles handle: the ${suggestedType} lane. ${product || suggestedType} addresses that directly. It's not about diversity for its own sake — it's about unlocking a session type that your current collection leaves on the table.`;
}

// ─── Chat response voice ──────────────────────────────────────────────────────

/**
 * Returns phrasing variation for common chat response patterns.
 * The chat should call these instead of hardcoding sentence starters.
 */

export const CHAT_VOICE = {
  notEnoughData: (module) => {
    const options = [
      `There isn't enough ${module || 'collection'} data yet to make a confident call here. Log a few sessions or add some records and this becomes answerable.`,
      `The data isn't there yet to give you a real answer on this — ${module || 'collection'} history is thin. A few more logged sessions change that.`,
      `I'd be guessing without more ${module || 'collection'} data. Add some records or log sessions and Curator will have something real to work with.`,
    ];
    return options[Math.abs((module || '').length) % options.length];
  },

  followUpNamed: (name, type) => {
    const options = [
      `You're asking about ${name}. Here's what the data says:`,
      `${name} — ${type ? type + ', ' : ''}here's the reasoning:`,
      `On ${name} specifically:`,
    ];
    return options[Math.abs((name || '').length) % options.length];
  },

  tonightBottle: (name, daysSince) => {
    if (!daysSince) {
      return `Tonight I'd open ${name}. It hasn't had a tasting logged yet — that's the most practical reason to start there. First session gives you a reference point.`;
    }
    const options = [
      `Tonight, ${name}. It's been ${daysSince} days since your last pour — long enough that your palate isn't just repeating itself.`,
      `${name} is the right call tonight. At ${daysSince} days since your last session, it's due, and the gap is long enough to make the revisit meaningful.`,
      `Open ${name}. ${daysSince} days is a real gap — you're tasting it fresh. That matters more than picking the obvious pour.`,
    ];
    return options[Math.abs((name || '').length) % options.length];
  },
};
