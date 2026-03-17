import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function getBottleValue(bottle) {
  return (
    Number(bottle.collector_value) ||
    Number(bottle.aftermarket_price) ||
    Number(bottle.retail_price) ||
    Number(bottle.purchase_price) ||
    0
  );
}

function getPipeValue(pipe) {
  return Number(pipe.estimated_value) || Number(pipe.purchase_price) || 0;
}

function getTobaccoValue(blend) {
  return Number(blend.manual_market_value) || Number(blend.ai_estimated_value) || 0;
}

function formatValue(v) {
  if (!v) return '$0';
  return v >= 1000
    ? `$${(v / 1000).toFixed(1)}k`
    : `$${Math.round(v).toLocaleString()}`;
}

function buildNarrative({ pipes, blends, bottles, mostUsedPipe, mostTastedBottle,
  dominantBlendType, dominantWhiskyType, underusedCount, mostValuable, totalSessions }) {

  const hasPipes = pipes > 0;
  const hasBlends = blends > 0;
  const hasBottles = bottles > 0;
  const totalItems = pipes + blends + bottles;

  if (totalItems === 0) {
    return "Your collection is just getting started. Add your first pipe, blend, or bottle to see your story unfold.";
  }

  const parts = [];

  // Opening — collection character
  if (hasPipes && hasBlends && hasBottles) {
    const balance = pipes > blends
      ? `a pipe-forward rotation of ${pipes} pipes paired across ${blends} blends`
      : `a well-balanced rotation of ${pipes} pipes and ${blends} blends`;
    parts.push(`Your collection reflects a thoughtful collector's sensibility — ${balance}, alongside a spirits shelf of ${bottles} carefully chosen ${bottles === 1 ? 'bottle' : 'bottles'}.`);
  } else if (hasPipes && hasBlends) {
    parts.push(`Your pipe collection shows a focused collector at work — ${pipes} ${pipes === 1 ? 'pipe' : 'pipes'} paired across ${blends} ${blends === 1 ? 'blend' : 'blends'}, building a rotation with clear intention.`);
  } else if (hasBottles) {
    parts.push(`Your spirits collection stands at ${bottles} ${bottles === 1 ? 'bottle' : 'bottles'} — a curated shelf that reflects considered taste and a collector's eye for quality.`);
  } else if (hasPipes) {
    parts.push(`You're building a focused pipe collection of ${pipes} ${pipes === 1 ? 'pipe' : 'pipes'}. Every collector starts somewhere.`);
  }

  // Tobacco character
  if (dominantBlendType && hasBlends) {
    const blendDesc = {
      'English': 'a preference for rich, complex English blends — a choice that signals serious intent',
      'Virginia': 'a leaning toward bright Virginia blends — clean, consistent, and endlessly nuanced',
      'Aromatic': 'a fondness for aromatic blends — approachable and distinctly personal',
      'Burley': 'a taste for sturdy Burley blends — reliable, grounded, and time-tested',
      'Virginia/Perique': 'a refined palate drawn to the complexity of Virginia/Perique — a blend with history',
      'Balkan': 'an affinity for Balkan blends — layered, contemplative, and unmistakably distinguished',
    };
    const desc = blendDesc[dominantBlendType] || `a clear preference for ${dominantBlendType.toLowerCase()} blends`;
    parts.push(`Your tobacco selections reveal ${desc}.`);
  }

  // Whiskey character
  if (dominantWhiskyType && hasBottles) {
    const whiskeyDesc = {
      'Single Malt Scotch': 'your whiskey shelf leans toward the depth and regional character of Single Malt Scotch',
      'Bourbon': 'your spirits selection favors Bourbon — bold, warm, and quintessentially American',
      'Blended Scotch': 'a preference for the consistency and craft of Blended Scotch',
      'Rye': 'a taste for the spice and structure of Rye whiskey',
      'Irish': 'the approachable elegance of Irish whiskey anchors your spirits selection',
      'Japanese': 'your collection reflects the precision and subtlety of Japanese whisky',
    };
    const desc = whiskeyDesc[dominantWhiskyType] || `your spirits collection emphasizes ${dominantWhiskyType.toLowerCase()}`;
    parts.push(`On the spirits side, ${desc}.`);
  }

  // Activity and engagement
  if (mostUsedPipe && totalSessions > 0) {
    parts.push(`The ${mostUsedPipe.name} has earned its place as your most-reached-for pipe — a trusted companion in regular rotation.`);
  }

  if (mostTastedBottle) {
    parts.push(`Among your bottles, the ${mostTastedBottle.name} has been revisited most often — a sign of genuine appreciation.`);
  }

  // Crown jewel
  if (mostValuable && mostValuable.value > 0) {
    const typeLabel = mostValuable.type === 'pipe' ? 'pipe' : mostValuable.type === 'blend' ? 'blend' : 'bottle';
    parts.push(`The crown jewel of your collection is the ${mostValuable.name} — a ${typeLabel} valued at ${formatValue(mostValuable.value)}.`);
  }

  // Closing note
  if (underusedCount > 0) {
    parts.push(`With ${underusedCount} ${underusedCount === 1 ? 'pipe' : 'pipes'} still awaiting their moment, there's more of this collection yet to be discovered.`);
  }

  return parts.join(' ');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Accept optional module eligibility filter from caller.
    // If not provided, fall back to fetching user profile to determine enabled modules.
    let bodyEnabledModules = null;
    try {
      const body = await req.json().catch(() => ({}));
      bodyEnabledModules = body?.enabledModules || null; // e.g. ['pipekeeper', 'whiskeykeeper']
    } catch {}

    // Determine which modules are AI-eligible
    // If caller didn't pass enabledModules, check user profile
    let enabledModules = bodyEnabledModules;
    if (!enabledModules) {
      try {
        const profiles = await base44.entities.UserProfile.filter({ user_email: user.email });
        const profile = profiles?.[0] || null;
        const prefsSet = profile?.module_preferences_set === true;
        enabledModules = [
          'pipekeeper', // always include
          ...(prefsSet
            ? (profile?.whiskeykeeper_enabled !== false ? ['whiskeykeeper'] : [])
            : ['whiskeykeeper']), // default on for existing users
        ];
      } catch {
        enabledModules = ['pipekeeper', 'whiskeykeeper'];
      }
    }

    const includePipes = enabledModules.includes('pipekeeper');
    const includeWhiskey = enabledModules.includes('whiskeykeeper');

    // Fetch only AI-eligible module data in parallel
    const [pipes, blends, bottles, logs, tastingLogs] = await Promise.all([
      includePipes ? base44.entities.Pipe.filter({ created_by: user.email }, '-created_date', 500) : Promise.resolve([]),
      includePipes ? base44.entities.TobaccoBlend.filter({ created_by: user.email }, '-created_date', 500) : Promise.resolve([]),
      includeWhiskey ? base44.entities.Bottle.filter({ created_by: user.email }, '-created_date', 500) : Promise.resolve([]),
      includePipes ? base44.entities.SmokingLog.filter({ created_by: user.email }, '-date', 500) : Promise.resolve([]),
      includeWhiskey ? base44.entities.TastingLog.filter({ created_by: user.email }, '-tasting_date', 500) : Promise.resolve([]),
    ]);

    const pipesList = Array.isArray(pipes) ? pipes : [];
    const blendsList = Array.isArray(blends) ? blends : [];
    const bottlesList = Array.isArray(bottles) ? bottles : [];
    const logsList = Array.isArray(logs) ? logs : [];
    const tastingLogsList = Array.isArray(tastingLogs) ? tastingLogs : [];

    // Value totals
    const totalValue =
      pipesList.reduce((s, p) => s + getPipeValue(p), 0) +
      blendsList.reduce((s, b) => s + getTobaccoValue(b), 0) +
      bottlesList.reduce((s, b) => s + getBottleValue(b), 0);

    // Favorites
    const favorites = {
      pipe: pipesList.filter(p => p.is_favorite).sort((a, b) => (b.rating || 0) - (a.rating || 0))[0],
      blend: blendsList.filter(b => b.is_favorite).sort((a, b) => (b.rating || 0) - (a.rating || 0))[0],
      bottle: bottlesList.filter(b => b.favorite).sort((a, b) => (b.rating || 0) - (a.rating || 0))[0],
    };

    // Most used pipe
    const pipeUsage = {};
    logsList.forEach(log => {
      if (log.pipe_id) pipeUsage[log.pipe_id] = (pipeUsage[log.pipe_id] || 0) + 1;
    });
    const maxPipeUses = Math.max(...Object.values(pipeUsage), 0);
    const mostUsedPipe = maxPipeUses > 0 ? pipesList.find(p => pipeUsage[p.id] === maxPipeUses) : null;

    // Underused pipes
    const avgPipeUsage = logsList.length / Math.max(pipesList.length, 1);
    const underusedPipes = pipesList.filter(p => (pipeUsage[p.id] || 0) < avgPipeUsage * 0.3);

    // Blend type dominance
    const blendTypes = {};
    blendsList.forEach(b => {
      if (b.blend_type) blendTypes[b.blend_type] = (blendTypes[b.blend_type] || 0) + 1;
    });
    const dominantBlendType = Object.entries(blendTypes).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Whiskey type dominance
    const whiskyTypes = {};
    bottlesList.forEach(b => {
      if (b.type) whiskyTypes[b.type] = (whiskyTypes[b.type] || 0) + 1;
    });
    const dominantWhiskyType = Object.entries(whiskyTypes).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Most tasted bottle
    const bottleUsage = {};
    tastingLogsList.forEach(log => {
      if (log.bottle_name) bottleUsage[log.bottle_name] = (bottleUsage[log.bottle_name] || 0) + 1;
    });
    const maxBottleUses = Math.max(...Object.values(bottleUsage), 0);
    const mostTastedBottle = maxBottleUses > 0 ? bottlesList.find(b => bottleUsage[b.name] === maxBottleUses) : null;

    // Most valuable item across all collections
    const allItems = [
      ...pipesList.map(p => ({ name: p.name, id: p.id, type: 'pipe', value: getPipeValue(p) })),
      ...blendsList.map(b => ({ name: b.name, id: b.id, type: 'blend', value: getTobaccoValue(b) })),
      ...bottlesList.map(b => ({ name: b.name, id: b.id, type: 'bottle', value: getBottleValue(b) })),
    ];
    const mostValuable = allItems.filter(i => i.value > 0).sort((a, b) => b.value - a.value)[0] || null;

    const narrative = buildNarrative({
      pipes: pipesList.length,
      blends: blendsList.length,
      bottles: bottlesList.length,
      mostUsedPipe,
      mostTastedBottle,
      dominantBlendType,
      dominantWhiskyType,
      underusedCount: underusedPipes.length,
      mostValuable,
      totalSessions: logsList.length,
    });

    const story = {
      narrative,
      metrics: {
        totalValue: Math.round(totalValue),
        pipes: pipesList.length,
        blends: blendsList.length,
        bottles: bottlesList.length,
        totalSessions: logsList.length,
      },
      highlights: {
        mostUsedPipe: mostUsedPipe
          ? { name: mostUsedPipe.name, id: mostUsedPipe.id, uses: pipeUsage[mostUsedPipe.id] || 0 }
          : null,
        favoritePipe: favorites.pipe
          ? { name: favorites.pipe.name, id: favorites.pipe.id, rating: favorites.pipe.rating }
          : null,
        favoriteBlend: favorites.blend
          ? { name: favorites.blend.name, id: favorites.blend.id, rating: favorites.blend.rating }
          : null,
        favoriteBottle: favorites.bottle
          ? { name: favorites.bottle.name, id: favorites.bottle.id, rating: favorites.bottle.rating }
          : null,
        mostTastedBottle: mostTastedBottle
          ? { name: mostTastedBottle.name, id: mostTastedBottle.id, tastings: bottleUsage[mostTastedBottle.name] || 0 }
          : null,
        mostValuableItem: mostValuable
          ? { name: mostValuable.name, id: mostValuable.id, type: mostValuable.type, value: Math.round(mostValuable.value) }
          : null,
        underusedCount: underusedPipes.length,
        dominantBlendType,
        dominantWhiskyType,
      },
    };

    return Response.json(story);
  } catch (error) {
    console.error('Story generation error:', error);
    return Response.json({ error: error.message || 'Failed to generate story' }, { status: 500 });
  }
});