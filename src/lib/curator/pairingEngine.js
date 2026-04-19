import { pickVariant } from './curatorVoice.js';

const OVERLAYS = [
  { key: 'best_match', label: 'Best Match', confidence: 'High Confidence' },
  { key: 'rediscover', label: 'Rediscover', confidence: 'Medium Confidence' },
  { key: 'something_new', label: 'Something New', confidence: 'Experimental' },
];

const PAIRING_FAMILIES = [
  {
    key: 'whiskey_cigar',
    label: 'Whiskey + Cigar',
    liquidType: 'whiskey',
    smokingSessionType: 'cigar',
    requires: ['whiskeykeeper', 'cigarkeeper'],
  },
  {
    key: 'whiskey_pipe_session',
    label: 'Whiskey + Pipe Session',
    liquidType: 'whiskey',
    smokingSessionType: 'pipe_session',
    requires: ['whiskeykeeper', 'pipekeeper'],
  },
  {
    key: 'wine_cigar',
    label: 'Wine + Cigar',
    liquidType: 'wine',
    smokingSessionType: 'cigar',
    requires: ['winekeeper', 'cigarkeeper'],
  },
  {
    key: 'wine_pipe_session',
    label: 'Wine + Pipe Session',
    liquidType: 'wine',
    smokingSessionType: 'pipe_session',
    requires: ['winekeeper', 'pipekeeper'],
  },
];

const LIQUID_RECORD_META = {
  whiskey: { key: 'bottle', type: 'bottle', recordType: 'bottle' },
  wine: { key: 'wine', type: 'wine', recordType: 'wine' },
};

const FULL_BODY_WINE_STYLES = ['full', 'fortified', 'bold', 'cabernet', 'syrah'];
const MEDIUM_BODY_WINE_STYLES = ['medium', 'merlot', 'tempranillo'];
const LIGHT_BODY_WINE_STYLES = ['light', 'white', 'sparkling', 'rose'];

function safeNum(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function daysSince(dateValue) {
  if (!dateValue) return null;
  const ts = new Date(dateValue).getTime();
  if (!ts) return null;
  return Math.floor((Date.now() - ts) / 86400000);
}

function getBlendType(blend) {
  return String(blend?.blend_type || blend?.blend_family || '').trim();
}

function getWhiskeyType(liquid) {
  return String(liquid?.type || liquid?.whiskey_type || liquid?.spirit_type || '').trim().toLowerCase();
}

function getWineStyle(liquid) {
  return String(liquid?.style || liquid?.varietal || '').trim().toLowerCase();
}

function normalizeStrengthLevel(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return null;
  if (text.includes('full') || text.includes('strong') || text.includes('bold')) return 4;
  if (text.includes('medium-full') || text.includes('med-full')) return 3.5;
  if (text.includes('medium')) return 3;
  if (text.includes('mild-medium') || text.includes('med-mild')) return 2.5;
  if (text.includes('mild') || text.includes('light')) return 2;
  return null;
}

function getCigarBodyLevel(cigar) {
  return (
    normalizeStrengthLevel(cigar?.strength) ??
    normalizeStrengthLevel(cigar?.body) ??
    normalizeStrengthLevel(cigar?.profile) ??
    3
  );
}

function getLiquidBodyLevel(liquid, liquidType) {
  if (liquidType === 'wine') {
    const style = getWineStyle(liquid);
    if (FULL_BODY_WINE_STYLES.some((token) => style.includes(token))) return 4;
    if (MEDIUM_BODY_WINE_STYLES.some((token) => style.includes(token))) return 3;
    if (LIGHT_BODY_WINE_STYLES.some((token) => style.includes(token))) return 2;
    return 3;
  }

  const abv = safeNum(liquid?.abv);
  if (abv >= 50) return 4;
  if (abv >= 43) return 3;
  const wt = getWhiskeyType(liquid);
  if (wt.includes('islay') || wt.includes('peated') || wt.includes('rye')) return 3.5;
  if (wt.includes('irish') || wt.includes('blended')) return 2.5;
  return 3;
}

function getStockValue(item) {
  const stockFields = [
    'singles_equivalent',
    'quantity',
    'inventory_count',
    'bottle_count',
    'in_stock_count',
    'remaining_qty',
  ];

  for (const field of stockFields) {
    if (item?.[field] !== undefined && item?.[field] !== null && item?.[field] !== '') {
      return safeNum(item[field]);
    }
  }

  return null;
}

function isAvailableItem(item, { requireStock = false } = {}) {
  if (!item || item.ai_excluded === true) return false;

  const status = String(item.status || item.availability || '').trim().toLowerCase();
  const openState = String(item.open_state || '').trim().toLowerCase();

  if (item.unavailable === true) return false;
  if (status === 'unavailable' || status === 'out_of_stock' || status === 'archived') return false;
  if (openState === 'empty' || openState === 'depleted') return false;

  const stockValue = getStockValue(item);
  if (requireStock && stockValue !== null && stockValue <= 0) return false;

  return true;
}

function isCigarEligible(cigar) {
  return isAvailableItem(cigar, { requireStock: true }) && cigar?.not_for_me !== true;
}

function sortPipes(pipes = [], smokingLogs = []) {
  return [...pipes]
    .map((pipe) => {
      const logs = smokingLogs.filter((l) => l?.pipe_id === pipe.id || l?.pipeId === pipe.id);
      const last = logs.map((l) => l?.date || l?.created_date).filter(Boolean).sort().reverse()[0];
      return {
        ...pipe,
        _sessionCount: logs.length,
        _lastUsedDays: daysSince(last),
        _ratingScore: safeNum(pipe.rating),
      };
    })
    .sort((a, b) => ((b._ratingScore + b._sessionCount) - (a._ratingScore + a._sessionCount)) || ((b._lastUsedDays || 0) - (a._lastUsedDays || 0)));
}

function sortBlends(blends = [], smokingLogs = []) {
  return [...blends]
    .map((blend) => {
      const logs = smokingLogs.filter((l) => l?.blend_id === blend.id || l?.blendId === blend.id);
      const last = logs.map((l) => l?.date || l?.created_date).filter(Boolean).sort().reverse()[0];
      return {
        ...blend,
        _sessionCount: logs.length,
        _lastUsedDays: daysSince(last),
        _ratingScore: safeNum(blend.rating),
      };
    })
    .sort((a, b) => ((b._ratingScore + b._sessionCount) - (a._ratingScore + a._sessionCount)) || ((b._lastUsedDays || 0) - (a._lastUsedDays || 0)));
}

function sortLiquids(liquids = [], tastingLogs = [], liquidType = 'whiskey') {
  const logIdFields = liquidType === 'wine'
    ? ['wine_id', 'wineId', 'bottle_id', 'bottleId']
    : ['bottle_id', 'bottleId', 'wine_id', 'wineId'];

  return [...liquids]
    .map((liquid) => {
      const logs = tastingLogs.filter((l) => logIdFields.some((field) => l?.[field] === liquid.id));
      const last = logs.map((l) => l?.date || l?.tasting_date || l?.created_date).filter(Boolean).sort().reverse()[0];
      return {
        ...liquid,
        _sessionCount: logs.length,
        _lastUsedDays: daysSince(last),
        _ratingScore: safeNum(liquid.rating),
        _valueScore: safeNum(liquid.estimated_value || liquid.retail_price || liquid.purchase_price),
      };
    })
    .sort((a, b) => ((b._ratingScore + b._sessionCount) - (a._ratingScore + a._sessionCount)) || (b._valueScore - a._valueScore) || ((b._lastUsedDays || 0) - (a._lastUsedDays || 0)));
}

function sortCigars(cigars = [], cigarSessions = []) {
  return [...cigars]
    .map((cigar) => {
      const logs = cigarSessions.filter((s) => s?.cigar_id === cigar.id || s?.cigarId === cigar.id);
      const last = logs.map((s) => s?.date || s?.created_date).filter(Boolean).sort().reverse()[0];
      return {
        ...cigar,
        _sessionCount: logs.length,
        _lastUsedDays: daysSince(last),
        _ratingScore: safeNum(cigar.rating),
      };
    })
    .sort((a, b) => ((b._ratingScore + b._sessionCount) - (a._ratingScore + a._sessionCount)) || ((b._lastUsedDays || 0) - (a._lastUsedDays || 0)));
}

function wrapPipe(pipe) {
  return { id: pipe.id, type: 'pipe', recordType: 'pipe', name: pipe.name };
}

function wrapBlend(blend) {
  return { id: blend.id, type: 'blend', recordType: 'blend', name: blend.name };
}

function wrapCigar(cigar) {
  return { id: cigar.id, type: 'cigar', recordType: 'cigar', name: cigar.name };
}

function wrapLiquid(liquid, liquidType) {
  const meta = LIQUID_RECORD_META[liquidType] || LIQUID_RECORD_META.whiskey;
  return {
    id: liquid.id,
    type: meta.type,
    recordType: meta.recordType,
    name: liquid.name,
  };
}

function pairingTypeForFamily(family, blend, liquid) {
  if (family.liquidType === 'whiskey') {
    const wt = getWhiskeyType(liquid);
    const bt = getBlendType(blend);
    if ((bt === 'English' || bt === 'English/Balkan' || bt === 'Balkan') && (wt.includes('islay') || wt.includes('peated'))) {
      return 'Reinforcing';
    }
    if (bt === 'Aromatic' && wt.includes('irish')) {
      return 'Contrast';
    }
    return 'Complement';
  }

  const style = getWineStyle(liquid);
  if (family.smokingSessionType === 'cigar') {
    if (style.includes('red') || style.includes('fortified')) return 'Reinforcing';
    return 'Complement';
  }

  if (style.includes('sparkling') || style.includes('white')) return 'Contrast';
  return 'Complement';
}

function buildFamilyNarrative(family, { overlay, pipe, blend, cigar, liquid }) {
  const seed = [
    `family=${family.key}`,
    `overlay=${overlay}`,
    `pipe=${pipe?.id || 'none'}`,
    `blend=${blend?.id || 'none'}`,
    `cigar=${cigar?.id || 'none'}`,
    `liquid=${liquid?.id || 'none'}`,
  ].join('|');

  if (family.smokingSessionType === 'pipe_session') {
    const options = family.liquidType === 'whiskey'
      ? [
          () => `${blend?.name} sets the smoke profile, ${liquid?.name} mirrors its weight, and ${pipe?.name} is a reliable vessel for this longer three-part session.`,
          () => `${pipe?.name} and ${blend?.name} create a stable tobacco baseline, then ${liquid?.name} adds depth without drowning the bowl's core character.`,
          () => `${liquid?.name} complements ${blend?.name} while ${pipe?.name} keeps heat and draw steady — this is a deliberate pipe session, not a random mix.`,
        ]
      : [
          () => `${blend?.name} keeps the smoke expressive, ${liquid?.name} adds lift and restraint, and ${pipe?.name} keeps the session balanced start to finish.`,
          () => `${pipe?.name} and ${blend?.name} anchor the smoke side while ${liquid?.name} provides contrast so the session stays clean and layered.`,
          () => `${liquid?.name} supports ${blend?.name} without turning spirit-heavy language into wine territory, and ${pipe?.name} keeps the blend focused.`,
        ];
    return pickVariant(seed, options)();
  }

  const cigarOptions = family.liquidType === 'whiskey'
    ? [
        () => `${cigar?.name} and ${liquid?.name} land in the same body range, so the smoke and pour reinforce each other without turning sharp.`,
        () => `${liquid?.name} tracks the strength of ${cigar?.name}, giving you a confident cigar + whiskey session with no unnecessary friction.`,
        () => `${cigar?.name} carries the smoke body while ${liquid?.name} keeps pace on warmth and finish for a coherent two-part session.`,
      ]
    : [
        () => `${cigar?.name} gives structure while ${liquid?.name} brings restraint, making this cigar + wine pairing about balance, not force.`,
        () => `${liquid?.name} supports ${cigar?.name} with acidity and fruit lift so the smoke stays defined instead of heavy.`,
        () => `${cigar?.name} and ${liquid?.name} complement each other with clean contrast and controlled intensity across the session.`,
      ];

  return pickVariant(seed, cigarOptions)();
}

function buildWhyItWorks(family, { blend, cigar, liquid }) {
  if (family.smokingSessionType === 'pipe_session') {
    if (family.liquidType === 'whiskey') {
      return `${blend?.name} provides tobacco body, ${liquid?.name} matches that weight, and the session stays coherent because pipe and pour are calibrated to the same pace.`;
    }
    return `${blend?.name} supplies smoke depth while ${liquid?.name} contributes lift and freshness, creating support without palate fatigue.`;
  }

  if (family.liquidType === 'whiskey') {
    return `${cigar?.name} and ${liquid?.name} share compatible strength and finish, so neither side dominates the session.`;
  }

  return `${cigar?.name} brings smoke texture and ${liquid?.name} adds complementary structure, keeping the pairing composed rather than aggressive.`;
}

function buildWhatToExpect(family) {
  if (family.smokingSessionType === 'pipe_session') {
    return family.liquidType === 'whiskey'
      ? 'Expect a longer three-part session where tobacco and whiskey build together as the bowl progresses.'
      : 'Expect a measured three-part session with smoke depth first and wine-led balance throughout.';
  }

  return family.liquidType === 'whiskey'
    ? 'Expect a focused two-part smoke-and-spirit session with steady body and a warm finish.'
    : 'Expect a restrained cigar-and-wine session emphasizing complement, contrast, and balance.';
}

function getOverlayLists(base = [], stale = []) {
  return {
    best_match: base,
    rediscover: stale,
    something_new: [...base].reverse(),
  };
}

function firstUnused(list = [], usedIds = new Set()) {
  return list.find((item) => !usedIds.has(item?.id)) || list[0] || null;
}

function pickCigarLiquidPairForOverlay({ overlay, family, cigars = [], liquids = [], usedCigarIds = new Set(), usedLiquidIds = new Set() }) {
  const freshCigars = cigars.filter((item) => !usedCigarIds.has(item?.id));
  const freshLiquids = liquids.filter((item) => !usedLiquidIds.has(item?.id));
  const cigarPool = (freshCigars.length ? freshCigars : cigars).slice(0, 6);
  const liquidPool = (freshLiquids.length ? freshLiquids : liquids).slice(0, 6);

  if (!cigarPool.length || !liquidPool.length) {
    return {
      cigar: firstUnused(cigars, usedCigarIds),
      liquid: firstUnused(liquids, usedLiquidIds),
    };
  }

  let best = null;
  for (const cigar of cigarPool) {
    for (const liquid of liquidPool) {
      const cigarLevel = getCigarBodyLevel(cigar);
      const liquidLevel = getLiquidBodyLevel(liquid, family.liquidType);
      const diff = Math.abs(cigarLevel - liquidLevel);
      const staleBoost = (safeNum(cigar?._lastUsedDays) + safeNum(liquid?._lastUsedDays)) * 0.01;
      const qualityBoost = safeNum(cigar?.rating) + safeNum(liquid?.rating);
      // Overlay scoring:
      // - best_match: heavily rewards tight body/strength alignment
      // - rediscover: prefers reasonable fit while weighting stale items
      // - something_new: rewards stronger contrast for exploration
      const fitScore = overlay === 'something_new'
        ? (diff * 5)
        : overlay === 'rediscover'
          ? (12 - diff * 2)
          : (20 - diff * 6);
      const score = fitScore + qualityBoost + (overlay === 'best_match' ? 0 : staleBoost);

      if (!best || score > best.score) {
        best = { cigar, liquid, score };
      }
    }
  }

  return { cigar: best?.cigar || null, liquid: best?.liquid || null };
}

function buildPairingContext(context = {}) {
  const { activeModules = {} } = context;
  const pipeActive = activeModules.pipekeeper === true;
  const whiskeyActive = activeModules.whiskeykeeper === true;
  const wineActive = activeModules.winekeeper === true;
  const cigarActive = activeModules.cigarkeeper === true;

  const pipes = pipeActive ? (context.pipes || []).filter((pipe) => isAvailableItem(pipe)) : [];
  const blends = pipeActive ? (context.blends || []).filter((blend) => isAvailableItem(blend)) : [];
  const bottles = whiskeyActive ? (context.bottles || []).filter((bottle) => isAvailableItem(bottle, { requireStock: true })) : [];
  const wines = wineActive ? (context.wines || []).filter((wine) => isAvailableItem(wine, { requireStock: true })) : [];
  const cigars = cigarActive ? (context.cigars || []).filter((cigar) => isCigarEligible(cigar)) : [];

  return {
    activeModules,
    pipes,
    blends,
    bottles,
    wines,
    cigars,
    smokingLogs: context.smokingLogs || [],
    tastingLogs: context.tastingLogs || [],
    cigarSessions: context.cigarSessions || [],
  };
}

function isFamilySupported(ctx, family) {
  const hasRequiredModules = family.requires.every((moduleKey) => ctx.activeModules?.[moduleKey] === true);
  if (!hasRequiredModules) return false;

  const hasLiquidData = family.liquidType === 'whiskey' ? ctx.bottles.length > 0 : ctx.wines.length > 0;
  if (!hasLiquidData) return false;

  if (family.smokingSessionType === 'cigar') {
    return ctx.cigars.length > 0;
  }

  return ctx.pipes.length > 0 && ctx.blends.length > 0;
}

function makePairing(family, overlay, contextItems) {
  const { pipe, blend, cigar, liquid } = contextItems;
  if (!liquid) return null;
  if (family.smokingSessionType === 'pipe_session' && (!pipe || !blend)) return null;
  if (family.smokingSessionType === 'cigar' && !cigar) return null;

  const wrappedPipe = pipe ? wrapPipe(pipe) : null;
  const wrappedBlend = blend ? wrapBlend(blend) : null;
  const wrappedCigar = cigar ? wrapCigar(cigar) : null;
  const wrappedLiquid = wrapLiquid(liquid, family.liquidType);
  const liquidMeta = LIQUID_RECORD_META[family.liquidType] || LIQUID_RECORD_META.whiskey;

  return {
    id: `${family.key}_${overlay.key}_${pipe?.id || 'none'}_${blend?.id || 'none'}_${cigar?.id || 'none'}_${liquid?.id || 'none'}`,
    subTab: family.key,
    pairingFamily: family.key,
    pairingFamilyLabel: family.label,
    overlay: overlay.key,
    overlayLabel: overlay.label,
    confidenceLabel: overlay.confidence,
    liquidType: family.liquidType,
    smokingSessionType: family.smokingSessionType,
    pairingType: pairingTypeForFamily(family, blend, liquid),
    primaryModule: family.smokingSessionType === 'pipe_session' ? 'pipe' : 'cigar',
    pipe: wrappedPipe,
    blend: wrappedBlend,
    cigar: wrappedCigar,
    liquid: wrappedLiquid,
    [liquidMeta.key]: wrappedLiquid,
    leftItem: family.smokingSessionType === 'pipe_session' ? wrappedPipe : wrappedCigar,
    blendBridge: wrappedBlend,
    rightItem: wrappedLiquid,
    cigarItem: wrappedCigar,
    narrative: buildFamilyNarrative(family, { overlay: overlay.key, pipe, blend, cigar, liquid }),
    whyItWorks: buildWhyItWorks(family, { blend, cigar, liquid }),
    whatToExpect: buildWhatToExpect(family),
    bestMomentForIt: family.smokingSessionType === 'pipe_session'
      ? 'Best when you want a full smoke session with deliberate pacing between bowl and pour.'
      : 'Best when you want a focused smoke-and-pour session with clear flavor alignment.',
  };
}

function buildFamilyPairings(ctx, family) {
  const liquids = family.liquidType === 'whiskey' ? ctx.bottles : ctx.wines;
  const sortedLiquids = sortLiquids(liquids, ctx.tastingLogs, family.liquidType);
  const staleLiquids = [...sortedLiquids].sort((a, b) => (b._lastUsedDays || 0) - (a._lastUsedDays || 0));

  const liquidByOverlay = getOverlayLists(sortedLiquids, staleLiquids);
  const usedLiquidIds = new Set();

  if (family.smokingSessionType === 'cigar') {
    const sortedCigars = sortCigars(ctx.cigars, ctx.cigarSessions);
    const staleCigars = [...sortedCigars].sort((a, b) => (b._lastUsedDays || 0) - (a._lastUsedDays || 0));
    const cigarByOverlay = getOverlayLists(sortedCigars, staleCigars);
    const usedCigarIds = new Set();

    return OVERLAYS
      .map((overlay) => {
        const { cigar, liquid } = pickCigarLiquidPairForOverlay({
          overlay: overlay.key,
          family,
          cigars: cigarByOverlay[overlay.key] || [],
          liquids: liquidByOverlay[overlay.key] || [],
          usedCigarIds,
          usedLiquidIds,
        });
        if (cigar?.id) usedCigarIds.add(cigar.id);
        if (liquid?.id) usedLiquidIds.add(liquid.id);
        return makePairing(family, overlay, { cigar, liquid });
      })
      .filter(Boolean);
  }

  const sortedPipes = sortPipes(ctx.pipes, ctx.smokingLogs);
  const sortedBlends = sortBlends(ctx.blends, ctx.smokingLogs);
  const stalePipes = [...sortedPipes].sort((a, b) => (b._lastUsedDays || 0) - (a._lastUsedDays || 0));
  const staleBlends = [...sortedBlends].sort((a, b) => (b._lastUsedDays || 0) - (a._lastUsedDays || 0));

  const pipeByOverlay = getOverlayLists(sortedPipes, stalePipes);
  const blendByOverlay = getOverlayLists(sortedBlends, staleBlends);
  const usedPipeIds = new Set();
  const usedBlendIds = new Set();

  return OVERLAYS
    .map((overlay) => {
      const pipe = firstUnused(pipeByOverlay[overlay.key], usedPipeIds);
      const blend = firstUnused(blendByOverlay[overlay.key], usedBlendIds);
      const liquid = firstUnused(liquidByOverlay[overlay.key], usedLiquidIds);
      if (pipe?.id) usedPipeIds.add(pipe.id);
      if (blend?.id) usedBlendIds.add(blend.id);
      if (liquid?.id) usedLiquidIds.add(liquid.id);
      return makePairing(family, overlay, { pipe, blend, liquid });
    })
    .filter(Boolean);
}

export function generatePairingRecommendations(context = {}) {
  const ctx = buildPairingContext(context);

  const supportedFamilies = PAIRING_FAMILIES.filter((family) => isFamilySupported(ctx, family));
  if (supportedFamilies.length === 0) {
    console.log('CURATOR_DECISION', {
      intent: 'pairings',
      engineUsed: 'pairing',
      reason: 'no_supported_pairing_families',
      modules: ctx.activeModules,
      dataCounts: {
        pipes: ctx.pipes.length,
        blends: ctx.blends.length,
        bottles: ctx.bottles.length,
        wines: ctx.wines.length,
        cigars: ctx.cigars.length,
      },
    });
    return [];
  }

  const pairings = supportedFamilies.flatMap((family) => buildFamilyPairings(ctx, family));

  console.log('CURATOR_DECISION', {
    intent: 'pairings',
    engineUsed: 'pairing',
    modules: ctx.activeModules,
    supportedFamilies: supportedFamilies.map((family) => family.key),
    pairingsGenerated: pairings.length,
    dataCounts: {
      pipes: ctx.pipes.length,
      blends: ctx.blends.length,
      bottles: ctx.bottles.length,
      wines: ctx.wines.length,
      cigars: ctx.cigars.length,
    },
  });

  return pairings;
}

export const pairingFamilies = PAIRING_FAMILIES;
