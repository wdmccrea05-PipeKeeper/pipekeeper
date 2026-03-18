import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

type ModuleKey = 'pipe' | 'whiskey' | 'cigar' | 'coffee';

function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

function normalizeText(value: unknown): string {
  return String(value || '').trim();
}

function normalizeLower(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function pickRandom<T>(items: T[]): T | null {
  if (!Array.isArray(items) || items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)] ?? null;
}

function summarizePipe(pipe: any) {
  return {
    id: pipe?.id || '',
    name: normalizeText(pipe?.name || pipe?.shape || 'Unnamed Pipe'),
    maker: normalizeText(pipe?.maker),
    shape: normalizeText(pipe?.shape),
    material: normalizeText(pipe?.material),
    favorite: !!pipe?.favorite,
    notes: normalizeText(pipe?.notes),
    lastSmoked: pipe?.last_smoked_date || null,
  };
}

function summarizeBlend(blend: any) {
  return {
    id: blend?.id || '',
    name: normalizeText(blend?.name || 'Unnamed Blend'),
    manufacturer: normalizeText(blend?.manufacturer),
    genre: normalizeText(blend?.genre || blend?.blend_type),
    favorite: !!blend?.favorite,
    notes: normalizeText(blend?.notes),
    quantity: safeNumber(blend?.quantity, 0),
    cellarStatus: normalizeText(blend?.cellar_status),
  };
}

function summarizeBottle(bottle: any) {
  return {
    id: bottle?.id || '',
    name: normalizeText(bottle?.name || 'Unnamed Bottle'),
    distillery: normalizeText(bottle?.distillery),
    type: normalizeText(bottle?.type || bottle?.bottle_type),
    region: normalizeText(bottle?.region),
    country: normalizeText(bottle?.country),
    favorite: !!bottle?.favorite,
    notes: normalizeText(bottle?.notes),
    rating: safeNumber(bottle?.rating, 0),
    collectorValue: safeNumber(
      bottle?.collector_value ??
        bottle?.aftermarket_price ??
        bottle?.retail_price ??
        bottle?.average_market_value ??
        bottle?.purchase_price,
      0
    ),
  };
}

function buildPipeRecommendation(pipes: any[], blends: any[], profile: any) {
  const favoritePipes = pipes.filter((p) => p.favorite);
  const favoriteBlends = blends.filter((b) => b.favorite);
  const chosenPipe = pickRandom(favoritePipes) || pickRandom(pipes);
  const chosenBlend = pickRandom(favoriteBlends) || pickRandom(blends);

  if (!chosenPipe && !chosenBlend) {
    return {
      module: 'pipe',
      title: 'No pipe recommendation available',
      summary: 'Add pipes and blends to receive tailored pipe session recommendations.',
      confidence: 'low',
      selections: [],
      reasoning: [
        'No pipe or blend inventory was available.',
      ],
    };
  }

  const notes = [
    profile?.notes,
    profile?.pipe_notes,
    profile?.preferred_shapes,
    profile?.preferred_blends,
  ]
    .map(normalizeText)
    .filter(Boolean);

  const reasoning = [
    chosenPipe ? `Selected pipe: ${chosenPipe.name}${chosenPipe.maker ? ` by ${chosenPipe.maker}` : ''}` : null,
    chosenBlend ? `Selected blend: ${chosenBlend.name}${chosenBlend.manufacturer ? ` by ${chosenBlend.manufacturer}` : ''}` : null,
    notes.length ? 'Included collector notes and pipe-specific preferences in the recommendation.' : null,
  ].filter(Boolean);

  const summaryParts = [];
  if (chosenPipe) summaryParts.push(`Reach for ${chosenPipe.name}`);
  if (chosenBlend) summaryParts.push(`pair it with ${chosenBlend.name}`);
  const summary = summaryParts.length
    ? `${summaryParts.join(' and ')} for tonight’s session.`
    : 'Use one of your favorite pipe pieces tonight.';

  return {
    module: 'pipe',
    title: 'Pipe session suggestion',
    summary,
    confidence: chosenPipe && chosenBlend ? 'high' : 'medium',
    selections: [
      chosenPipe
        ? {
            type: 'pipe',
            id: chosenPipe.id,
            name: chosenPipe.name,
          }
        : null,
      chosenBlend
        ? {
            type: 'blend',
            id: chosenBlend.id,
            name: chosenBlend.name,
          }
        : null,
    ].filter(Boolean),
    reasoning,
  };
}

function buildWhiskeyRecommendation(bottles: any[], profile: any) {
  const favorites = bottles.filter((b) => b.favorite);
  const highlyRated = bottles.filter((b) => b.rating >= 4);
  const valuable = [...bottles].sort((a, b) => b.collectorValue - a.collectorValue);

  const chosenBottle =
    pickRandom(favorites) ||
    pickRandom(highlyRated) ||
    valuable[0] ||
    pickRandom(bottles);

  if (!chosenBottle) {
    return {
      module: 'whiskey',
      title: 'No whiskey recommendation available',
      summary: 'Add bottles to receive tailored whiskey session recommendations.',
      confidence: 'low',
      selections: [],
      reasoning: ['No bottle inventory was available.'],
    };
  }

  const notes = [
    profile?.notes,
    profile?.whiskey_notes,
    profile?.wine_notes,
    profile?.preferred_regions,
    profile?.preferred_styles,
  ]
    .map(normalizeText)
    .filter(Boolean);

  const reasoning = [
    `Selected bottle: ${chosenBottle.name}${chosenBottle.distillery ? ` from ${chosenBottle.distillery}` : ''}`,
    chosenBottle.rating >= 4 ? 'Bottle has a strong saved rating.' : null,
    chosenBottle.collectorValue > 0 ? 'Bottle has known value data and appears meaningful in the collection.' : null,
    notes.length ? 'Included collector notes and whiskey-specific preferences in the recommendation.' : null,
  ].filter(Boolean);

  return {
    module: 'whiskey',
    title: 'Whiskey session suggestion',
    summary: `Pour ${chosenBottle.name}${chosenBottle.type ? `, a ${chosenBottle.type}` : ''}, for tonight’s session.`,
    confidence: chosenBottle.favorite || chosenBottle.rating >= 4 ? 'high' : 'medium',
    selections: [
      {
        type: 'bottle',
        id: chosenBottle.id,
        name: chosenBottle.name,
      },
    ],
    reasoning,
  };
}

function buildCombinedRecommendation(pipes: any[], blends: any[], bottles: any[], profile: any) {
  const pipeRec = buildPipeRecommendation(pipes, blends, profile);
  const whiskeyRec = buildWhiskeyRecommendation(bottles, profile);

  if (pipeRec.confidence === 'low' && whiskeyRec.confidence === 'low') {
    return {
      module: 'combined',
      title: 'No combined session recommendation available',
      summary: 'Add items to your collections to receive tailored cross-module session suggestions.',
      confidence: 'low',
      selections: [],
      reasoning: ['No usable pipe or whiskey inventory was available.'],
    };
  }

  const selections = [...(pipeRec.selections || []), ...(whiskeyRec.selections || [])];
  const reasoning = unique([...(pipeRec.reasoning || []), ...(whiskeyRec.reasoning || [])]);

  const pipeName = pipeRec.selections?.find((s: any) => s.type === 'pipe')?.name;
  const blendName = pipeRec.selections?.find((s: any) => s.type === 'blend')?.name;
  const bottleName = whiskeyRec.selections?.find((s: any) => s.type === 'bottle')?.name;

  const summaryParts = [];
  if (pipeName) summaryParts.push(pipeName);
  if (blendName) summaryParts.push(blendName);
  if (bottleName) summaryParts.push(bottleName);

  const summary = summaryParts.length >= 2
    ? `Tonight’s combination: ${summaryParts.join(' + ')}.`
    : pipeRec.confidence !== 'low'
      ? pipeRec.summary
      : whiskeyRec.summary;

  return {
    module: 'combined',
    title: 'Combined session suggestion',
    summary,
    confidence:
      pipeRec.confidence === 'high' && whiskeyRec.confidence === 'high'
        ? 'high'
        : 'medium',
    selections,
    reasoning,
  };
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ success: false, error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();

    if (!me?.email) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const requestedModules = Array.isArray(body?.modules)
      ? unique(body.modules.map((m: unknown) => normalizeLower(m)).filter(Boolean))
      : [];
    const includeCombined = body?.includeCombined !== false;

    const [
      profileRows,
      pipes,
      blends,
      bottles,
    ] = await Promise.all([
      base44.entities.CollectorIntelligenceProfile?.filter?.({ user_email: me.email }).catch(() => []),
      base44.entities.Pipe?.list?.('-updated_date').catch(() => []),
      base44.entities.TobaccoBlend?.list?.('-updated_date').catch(() => []),
      base44.entities.Bottle?.list?.('-updated_date').catch(() => []),
    ]);

    const profile = Array.isArray(profileRows) && profileRows.length > 0 ? profileRows[0] : {};

    const pipeSummaries = (Array.isArray(pipes) ? pipes : []).map(summarizePipe);
    const blendSummaries = (Array.isArray(blends) ? blends : []).map(summarizeBlend);
    const bottleSummaries = (Array.isArray(bottles) ? bottles : []).map(summarizeBottle);

    const shouldInclude = (module: ModuleKey) =>
      requestedModules.length === 0 || requestedModules.includes(module);

    const recommendations = [];

    if (shouldInclude('pipe')) {
      recommendations.push(buildPipeRecommendation(pipeSummaries, blendSummaries, profile));
    }

    if (shouldInclude('whiskey')) {
      recommendations.push(buildWhiskeyRecommendation(bottleSummaries, profile));
    }

    if (
      includeCombined &&
      (requestedModules.length === 0 ||
        (requestedModules.includes('pipe') && requestedModules.includes('whiskey')))
    ) {
      recommendations.unshift(
        buildCombinedRecommendation(pipeSummaries, blendSummaries, bottleSummaries, profile)
      );
    }

    return Response.json({
      success: true,
      recommendations,
      context: {
        pipes: pipeSummaries.length,
        blends: blendSummaries.length,
        bottles: bottleSummaries.length,
        usedProfileNotes: !!(
          normalizeText(profile?.notes) ||
          normalizeText(profile?.pipe_notes) ||
          normalizeText(profile?.whiskey_notes) ||
          normalizeText(profile?.wine_notes)
        ),
      },
    });
  } catch (error) {
    console.error('[generateSessionRecommendation] fatal error:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
});