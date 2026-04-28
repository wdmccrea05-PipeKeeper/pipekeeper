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

function getCigarValue(cigar) {
  return Number(cigar.estimated_value) || Number(cigar.purchase_price) || 0;
}

function getCigarSticks(cigar) {
  return Math.max(0, Number(cigar.singles_equivalent ?? cigar.quantity ?? 0));
}

function getWineQuantity(wine) {
  return Math.max(0, Number(wine.quantity ?? 1));
}

function getWineTotalValue(wine) {
  if (!wine) return 0;
  const qty = getWineQuantity(wine);
  if (wine.manual_valuation_enabled && Number(wine.manual_estimated_value) > 0) {
    return Number(wine.manual_estimated_value) * qty;
  }
  if (Number(wine.estimated_total_value) > 0) return Number(wine.estimated_total_value);
  if (Number(wine.market_estimated_total_value) > 0) return Number(wine.market_estimated_total_value);
  if (Number(wine.estimated_unit_value) > 0) return Number(wine.estimated_unit_value) * qty;
  if (Number(wine.market_estimated_unit_value) > 0) return Number(wine.market_estimated_unit_value) * qty;
  if (Number(wine.estimated_value) > 0) return Number(wine.estimated_value) * qty;
  if (Number(wine.purchase_price) > 0) return Number(wine.purchase_price) * qty;
  return 0;
}

function getWinePrimaryImage(wine) {
  if (!wine) return null;
  const photos = Array.isArray(wine.photos) ? wine.photos : [];
  return photos[0] || wine.photo || wine.image || wine.label_image || wine.image_url || null;
}

function formatValue(v) {
  if (!v) return '$0';
  return v >= 1000
    ? `$${(v / 1000).toFixed(1)}k`
    : `$${Math.round(v).toLocaleString()}`;
}

function getBottleUsageKeyFromLog(log) {
  if (log?.bottle_id) return `id:${log.bottle_id}`;
  if (log?.bottle_name) return `name:${log.bottle_name}`;
  return null;
}

function getBottleUsageKeyFromBottle(bottle) {
  if (bottle?.id) return `id:${bottle.id}`;
  if (bottle?.name) return `name:${bottle.name}`;
  return null;
}

function buildNarrative({ pipes, blends, bottleTypes, totalBottles, mostUsedPipe, mostTastedBottle,
  dominantBlendType, dominantWhiskyType, underusedCount, mostValuable, totalSessions,
  cigarTypes, totalCigarSticks, mostSmokedCigar, cigarSessions, humidorCount, dominantCigarStrength,
  dominantCigarWrapper, dominantCigarCountry, topRatedCigar, highestValueCigar, restockCigarCount,
  wineBottleTypes, totalWineBottles, topWineProducer, topWineVarietal, topWineRegion, readyToDrinkWineCount, mostValuableWine }) {

  const bottles = bottleTypes;
  const hasPipes = pipes > 0;
  const hasBlends = blends > 0;
  const hasBottles = bottleTypes > 0;
  const hasCigars = cigarTypes > 0;
  const hasWines = wineBottleTypes > 0;
  const totalItems = pipes + blends + bottleTypes + cigarTypes + wineBottleTypes;

  if (totalItems === 0) {
    return "Your collection is just getting started. Add your first pipe, blend, bottle, cigar, or wine to see your story unfold.";
  }

  const parts = [];

  const bottleInventoryNote = totalBottles > bottleTypes
    ? ` (${totalBottles} bottles total across ${bottleTypes} ${bottleTypes === 1 ? 'label' : 'labels'})`
    : '';
  const cigarInventoryNote = totalCigarSticks > 0 ? ` (${totalCigarSticks} sticks)` : '';
  const humidorNote = humidorCount > 0 ? ` across ${humidorCount} humidor${humidorCount === 1 ? '' : 's'}` : '';

  if (hasPipes && hasBlends && hasBottles && hasCigars && hasWines) {
    parts.push(`Your collection reflects a comprehensive multi-module enthusiast — ${pipes} pipes across ${blends} blends, a spirits shelf of ${bottleTypes} whiskey types${bottleInventoryNote}, ${wineBottleTypes} wines in your cellar${totalWineBottles > wineBottleTypes ? ` (${totalWineBottles} bottles)` : ''}, and a humidor of ${cigarTypes} cigar ${cigarTypes === 1 ? 'type' : 'types'}${cigarInventoryNote}${humidorNote}.`);
  } else if (hasPipes && hasBlends && hasBottles && hasCigars) {
    parts.push(`Your collection reflects a serious multi-module collector — ${pipes} pipes across ${blends} blends, a spirits shelf of ${bottleTypes} bottle types${bottleInventoryNote}, and a humidor of ${cigarTypes} cigar ${cigarTypes === 1 ? 'type' : 'types'}${cigarInventoryNote}${humidorNote}.`);
  } else if (hasPipes && hasBlends && hasBottles) {
    const balance = pipes > blends
      ? `a pipe-forward rotation of ${pipes} pipes paired across ${blends} blends`
      : `a well-balanced rotation of ${pipes} pipes and ${blends} blends`;
    parts.push(`Your collection reflects a thoughtful collector's sensibility — ${balance}, alongside a spirits shelf of ${bottleTypes} carefully chosen ${bottleTypes === 1 ? 'bottle type' : 'bottle types'}${bottleInventoryNote}.`);
  } else if (hasPipes && hasBlends && hasCigars) {
    parts.push(`A well-rounded tobacco collector's setup: ${pipes} pipes paired with ${blends} blends, and a cigar collection of ${cigarTypes} ${cigarTypes === 1 ? 'type' : 'types'}${cigarInventoryNote}${humidorNote}.`);
  } else if (hasPipes && hasBlends) {
    parts.push(`Your pipe collection shows a focused collector at work — ${pipes} ${pipes === 1 ? 'pipe' : 'pipes'} paired across ${blends} ${blends === 1 ? 'blend' : 'blends'}, building a rotation with clear intention.`);
  } else if (hasBottles && hasCigars) {
    parts.push(`Your collection pairs a spirits shelf of ${bottleTypes} bottle types${bottleInventoryNote} with a cigar selection of ${cigarTypes} ${cigarTypes === 1 ? 'type' : 'types'}${cigarInventoryNote}${humidorNote} — a classic pairing collector's setup.`);
  } else if (hasBottles) {
    parts.push(`Your spirits collection spans ${bottleTypes} distinct ${bottleTypes === 1 ? 'bottle type' : 'bottle types'}${bottleInventoryNote} — a curated shelf that reflects considered taste.`);
  } else if (hasCigars) {
    parts.push(`Your cigar collection spans ${cigarTypes} ${cigarTypes === 1 ? 'type' : 'types'}${cigarInventoryNote}${humidorNote} — a growing humidor built with care.`);
  } else if (hasPipes) {
    parts.push(`You're building a focused pipe collection of ${pipes} ${pipes === 1 ? 'pipe' : 'pipes'}. Every collector starts somewhere.`);
  }

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

  if (mostUsedPipe && totalSessions > 0) {
    parts.push(`The ${mostUsedPipe.name} has earned its place as your most-reached-for pipe — a trusted companion in regular rotation.`);
  }

  if (mostTastedBottle) {
    parts.push(`Among your bottles, the ${mostTastedBottle.name} has been revisited most often — a sign of genuine appreciation.`);
  }

  if (mostSmokedCigar && cigarSessions > 0) {
    parts.push(`In your humidor, the ${mostSmokedCigar.name} stands out as your most-smoked cigar — a clear favorite.`);
  }

  if (dominantCigarStrength || dominantCigarWrapper || dominantCigarCountry) {
    const cigarProfileBits = [
      dominantCigarStrength ? `${dominantCigarStrength.toLowerCase()}-leaning strength` : null,
      dominantCigarWrapper ? `${dominantCigarWrapper} wrappers` : null,
      dominantCigarCountry ? `${dominantCigarCountry} origins` : null,
    ].filter(Boolean);
    if (cigarProfileBits.length) {
      parts.push(`Your cigar profile trends toward ${cigarProfileBits.join(', ')}.`);
    }
  }

  if (topRatedCigar) {
    parts.push(`Your highest rated cigar is ${topRatedCigar.name}${topRatedCigar.rating ? ` at ${topRatedCigar.rating}/5` : ''}.`);
  }

  if (highestValueCigar && highestValueCigar.value > 0) {
    parts.push(`${highestValueCigar.name} currently leads your humidor value at ${formatValue(highestValueCigar.value)}.`);
  }

  if (restockCigarCount > 0) {
    parts.push(`${restockCigarCount} cigar ${restockCigarCount === 1 ? 'entry is' : 'entries are'} flagged for restock priority.`);
  }

  if (topWineProducer && hasWines) {
    parts.push(`Your wine selections show a preference for ${topWineProducer} as a leading producer${topWineVarietal ? `, paired with a taste for ${topWineVarietal} as your primary varietal` : ''}${topWineRegion ? ` from ${topWineRegion}` : ''}.`);
  }

  if (readyToDrinkWineCount > 0) {
    parts.push(`You currently have ${readyToDrinkWineCount} wine${readyToDrinkWineCount === 1 ? '' : 's'} at peak drinking window — ready to open.`);
  }

  if (mostValuable && mostValuable.value > 0) {
    const typeLabel = mostValuable.type === 'pipe' ? 'pipe' : mostValuable.type === 'blend' ? 'blend' : mostValuable.type === 'cigar' ? 'cigar' : mostValuable.type === 'wine' ? 'wine' : 'bottle';
    parts.push(`The crown jewel of your collection is the ${mostValuable.name} — a ${typeLabel} valued at ${formatValue(mostValuable.value)}.`);
  }

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
    const includeCigar = enabledModules.includes('cigarkeeper');
    const includeWine = enabledModules.includes('winekeeper');

    // Fetch only AI-eligible module data in parallel
    const [pipes, blends, bottles, logs, tastingLogs, inventoryUnits, cigars, cigarSessionsList, humidors, wines, wineTastings] = await Promise.all([
      includePipes ? base44.entities.Pipe.filter({ created_by: user.email }, '-created_date', 500) : Promise.resolve([]),
      includePipes ? base44.entities.TobaccoBlend.filter({ created_by: user.email }, '-created_date', 500) : Promise.resolve([]),
      includeWhiskey ? base44.entities.Bottle.filter({ created_by: user.email }, '-created_date', 500) : Promise.resolve([]),
      includePipes ? base44.entities.SmokingLog.filter({ created_by: user.email }, '-date', 500) : Promise.resolve([]),
      includeWhiskey ? base44.entities.TastingLog.filter({ created_by: user.email }, '-tasting_date', 500) : Promise.resolve([]),
      includeWhiskey ? base44.entities.WhiskeyInventoryUnit.filter({ created_by: user.email }) : Promise.resolve([]),
      includeCigar ? base44.entities.Cigar.filter({ created_by: user.email }, '-created_date', 500) : Promise.resolve([]),
      includeCigar ? base44.entities.CigarSession.filter({ created_by: user.email }, '-date', 500) : Promise.resolve([]),
      includeCigar ? base44.entities.HumidorLocation.filter({ created_by: user.email }, '-updated_date', 200) : Promise.resolve([]),
      includeWine ? base44.entities.Wine.filter({ created_by: user.email }, '-created_date', 500) : Promise.resolve([]),
      includeWine ? base44.entities.WineTasting.filter({ created_by: user.email }, '-date', 500) : Promise.resolve([]),
    ]);

    const pipesList = Array.isArray(pipes) ? pipes : [];
    const blendsList = Array.isArray(blends) ? blends : [];
    const bottlesList = Array.isArray(bottles) ? bottles : [];
    const logsList = Array.isArray(logs) ? logs : [];
    const tastingLogsList = Array.isArray(tastingLogs) ? tastingLogs : [];
    const inventoryUnitsList = Array.isArray(inventoryUnits) ? inventoryUnits : [];
    const cigarsList = Array.isArray(cigars) ? cigars : [];
    const cigarSessionsData = Array.isArray(cigarSessionsList) ? cigarSessionsList : [];
    const humidorsList = Array.isArray(humidors) ? humidors : [];
    const winesList = Array.isArray(wines) ? wines : [];
    const wineTastingsList = Array.isArray(wineTastings) ? wineTastings : [];

    // Dual bottle metrics
    const bottleTypes = bottlesList.length; // distinct labels
    const totalBottles = inventoryUnitsList.length > 0
      ? inventoryUnitsList.length
      : bottlesList.reduce((s, b) => s + (Number(b.bottle_count) || 1), 0);

    // Cigar metrics
    const totalCigarSticks = cigarsList.reduce((s, c) => s + getCigarSticks(c), 0);
    const cigarTypes = cigarsList.length;

    // Most smoked cigar
    const cigarUsage = {};
    cigarSessionsData.forEach(s => {
      if (s.cigar_id && !s.is_out_of_collection) {
        cigarUsage[s.cigar_id] = (cigarUsage[s.cigar_id] || 0) + 1;
      }
    });
    const maxCigarUses = Math.max(...Object.values(cigarUsage), 0);
    const mostSmokedCigar = maxCigarUses > 0
      ? cigarsList.find(c => cigarUsage[c.id] === maxCigarUses)
      : null;

    // Favorite cigar
    const favoriteCigar = cigarsList.filter(c => c.is_favorite).sort((a, b) => (b.rating || 0) - (a.rating || 0))[0]
      || cigarsList.filter(c => c.rating >= 4).sort((a, b) => (b.rating || 0) - (a.rating || 0))[0]
      || null;

    const topRatedCigar = cigarsList.filter(c => c.rating != null).sort((a, b) => (b.rating || 0) - (a.rating || 0))[0] || null;
    const highestValueCigar = cigarsList
      .map((c) => ({ ...c, __value: getCigarValue(c) * getCigarSticks(c) }))
      .sort((a, b) => (b.__value || 0) - (a.__value || 0))[0] || null;

    const cigarStrengthCounts = {};
    const cigarWrapperCounts = {};
    const cigarCountryCounts = {};
    cigarsList.forEach(c => {
      if (c.strength) cigarStrengthCounts[c.strength] = (cigarStrengthCounts[c.strength] || 0) + 1;
      if (c.wrapper) cigarWrapperCounts[c.wrapper] = (cigarWrapperCounts[c.wrapper] || 0) + 1;
      if (c.country) cigarCountryCounts[c.country] = (cigarCountryCounts[c.country] || 0) + 1;
    });
    const dominantCigarStrength = Object.entries(cigarStrengthCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const dominantCigarWrapper = Object.entries(cigarWrapperCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const dominantCigarCountry = Object.entries(cigarCountryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const restockCigarCount = cigarsList.filter(c => {
      const status = String(c.status || '').toLowerCase();
      return status === 'restock' || getCigarSticks(c) <= 2;
    }).length;

    // Wine metrics
    const wineBottleTypes = winesList.length;
    const totalWineBottles = winesList.reduce((s, w) => s + getWineQuantity(w), 0);
    const wineCollectionValue = winesList.reduce((s, w) => s + getWineTotalValue(w), 0);
    
    const wineProducers = {};
    const wineVarietals = {};
    const wineRegions = {};
    winesList.forEach(w => {
      if (w.producer) wineProducers[w.producer] = (wineProducers[w.producer] || 0) + 1;
      if (w.varietal) wineVarietals[w.varietal] = (wineVarietals[w.varietal] || 0) + 1;
      const region = w.region || w.appellation || w.country_of_origin;
      if (region) wineRegions[region] = (wineRegions[region] || 0) + 1;
    });
    const topWineProducer = Object.entries(wineProducers).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const topWineVarietal = Object.entries(wineVarietals).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const topWineRegion = Object.entries(wineRegions).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    
    const readyToDrinkWineCount = winesList.filter(w => {
      const start = w.drink_window_start || w.drinking_window_start;
      const end = w.drink_window_end || w.drinking_window_end;
      if (!start || !end) return false;
      const now = new Date();
      return new Date(start) <= now && new Date(end) >= now;
    }).length;

    // Value totals
    const totalValue =
      pipesList.reduce((s, p) => s + getPipeValue(p), 0) +
      blendsList.reduce((s, b) => s + getTobaccoValue(b), 0) +
      bottlesList.reduce((s, b) => s + getBottleValue(b), 0) +
      cigarsList.reduce((s, c) => s + getCigarValue(c), 0) +
      wineCollectionValue;

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

    // Most tasted bottle — key by bottle_id (primary), fallback to name for legacy logs
    const bottleUsage = {};
    tastingLogsList.forEach(log => {
      const key = getBottleUsageKeyFromLog(log);
      if (key) bottleUsage[key] = (bottleUsage[key] || 0) + 1;
    });
    const maxBottleUses = Math.max(...Object.values(bottleUsage), 0);
    const mostTastedBottle = maxBottleUses > 0
      ? bottlesList.find(b => {
          const key = getBottleUsageKeyFromBottle(b);
          return key ? (bottleUsage[key] || 0) === maxBottleUses : false;
        })
      : null;

    // Most valuable item across all collections
    const allItems = [
      ...pipesList.map(p => ({ name: p.name, id: p.id, type: 'pipe', value: getPipeValue(p) })),
      ...blendsList.map(b => ({ name: b.name, id: b.id, type: 'blend', value: getTobaccoValue(b) })),
      ...bottlesList.map(b => ({ name: b.name, id: b.id, type: 'bottle', value: getBottleValue(b) })),
      ...cigarsList.map(c => ({ name: c.name, id: c.id, type: 'cigar', value: getCigarValue(c) })),
      ...winesList.map(w => ({ name: w.name, id: w.id, type: 'wine', value: getWineTotalValue(w) })),
    ];
    const mostValuable = allItems.filter(i => i.value > 0).sort((a, b) => b.value - a.value)[0] || null;
    
    // Wine highlights
    const mostValuableWine = winesList.length > 0
      ? [...winesList]
          .map(w => ({ ...w, value: getWineTotalValue(w) }))
          .sort((a, b) => b.value - a.value)
          .find(w => w.value > 0)
      : null;
    const topRatedWine = winesList.length > 0
      ? [...winesList]
          .filter(w => Number(w.rating) > 0)
          .sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0))[0]
      : null;
    const readyToDrinkWine = winesList.find(w => {
      const start = w.drink_window_start || w.drinking_window_start;
      const end = w.drink_window_end || w.drinking_window_end;
      if (!start || !end) return false;
      const now = new Date();
      return new Date(start) <= now && new Date(end) >= now;
    });

    const narrative = buildNarrative({
      pipes: pipesList.length,
      blends: blendsList.length,
      bottleTypes,
      totalBottles,
      mostUsedPipe,
      mostTastedBottle,
      dominantBlendType,
      dominantWhiskyType,
      underusedCount: underusedPipes.length,
      mostValuable,
      totalSessions: logsList.length,
      cigarTypes,
      totalCigarSticks,
      mostSmokedCigar,
      cigarSessions: cigarSessionsData.length,
      humidorCount: humidorsList.length,
      dominantCigarStrength,
      dominantCigarWrapper,
      dominantCigarCountry,
      topRatedCigar,
      highestValueCigar: highestValueCigar ? { ...highestValueCigar, value: highestValueCigar.__value || 0 } : null,
      restockCigarCount,
      wineBottleTypes,
      totalWineBottles,
      topWineProducer,
      topWineVarietal,
      topWineRegion,
      readyToDrinkWineCount,
      mostValuableWine,
    });

    const story = {
      narrative,
      metrics: {
        totalValue: Math.round(totalValue),
        pipes: pipesList.length,
        blends: blendsList.length,
        bottleTypes,
        totalBottles,
        bottles: bottleTypes,
        sessions: logsList.length,
        totalSessions: logsList.length,
        tastings: tastingLogsList.length,
        cigars: cigarTypes,
        cigarTypes,
        totalCigarSticks,
        cigarSticks: totalCigarSticks,
        cigarSessions: cigarSessionsData.length,
        humidorCount: humidorsList.length,
        dominantCigarStrength,
        dominantCigarWrapper,
        dominantCigarCountry,
        restockCigarCount,
        wineBottleTypes,
        totalWineBottles,
        wineValue: Math.round(wineCollectionValue),
        wineTastings: wineTastingsList.length,
        readyToDrinkWineCount,
      },
      highlights: {
        mostUsedPipe: mostUsedPipe
          ? {
              id: mostUsedPipe.id,
              name: mostUsedPipe.name,
              recordType: 'pipe',
              photos: mostUsedPipe.photos || [],
              photo: mostUsedPipe.photo,
              image: mostUsedPipe.image,
              image_url: mostUsedPipe.image_url,
              thumbnail: mostUsedPipe.thumbnail,
              uses: pipeUsage[mostUsedPipe.id] || 0,
            }
          : null,
        favoritePipe: favorites.pipe
          ? {
              id: favorites.pipe.id,
              name: favorites.pipe.name,
              recordType: 'pipe',
              photos: favorites.pipe.photos || [],
              photo: favorites.pipe.photo,
              image: favorites.pipe.image,
              image_url: favorites.pipe.image_url,
              thumbnail: favorites.pipe.thumbnail,
              rating: favorites.pipe.rating,
            }
          : null,
        favoriteBlend: favorites.blend
          ? {
              id: favorites.blend.id,
              name: favorites.blend.name,
              recordType: 'blend',
              photos: favorites.blend.photos || [],
              photo: favorites.blend.photo,
              logo: favorites.blend.logo,
              image: favorites.blend.image,
              image_url: favorites.blend.image_url,
              thumbnail: favorites.blend.thumbnail,
              rating: favorites.blend.rating,
            }
          : null,
        favoriteBottle: favorites.bottle
          ? {
              id: favorites.bottle.id,
              name: favorites.bottle.name,
              recordType: 'bottle',
              photo: favorites.bottle.photo,
              image: favorites.bottle.image,
              image_url: favorites.bottle.image_url,
              thumbnail: favorites.bottle.thumbnail,
              rating: favorites.bottle.rating,
            }
          : null,
        mostTastedBottle: mostTastedBottle
          ? {
              id: mostTastedBottle.id,
              name: mostTastedBottle.name,
              recordType: 'bottle',
              photo: mostTastedBottle.photo,
              image: mostTastedBottle.image,
              image_url: mostTastedBottle.image_url,
              thumbnail: mostTastedBottle.thumbnail,
              tastings: bottleUsage[getBottleUsageKeyFromBottle(mostTastedBottle) || ''] || 0,
            }
          : null,
        mostSmokedCigar: mostSmokedCigar
          ? {
              id: mostSmokedCigar.id,
              name: mostSmokedCigar.name,
              recordType: 'cigar',
              photos: mostSmokedCigar.photos || [],
              photo: mostSmokedCigar.photo,
              sessions: cigarUsage[mostSmokedCigar.id] || 0,
            }
          : null,
        favoriteCigar: favoriteCigar
          ? {
              id: favoriteCigar.id,
              name: favoriteCigar.name,
              recordType: 'cigar',
              photos: favoriteCigar.photos || [],
              photo: favoriteCigar.photo,
              rating: favoriteCigar.rating,
            }
          : null,
        topRatedCigar: topRatedCigar
          ? {
              id: topRatedCigar.id,
              name: topRatedCigar.name,
              recordType: 'cigar',
              photos: topRatedCigar.photos || [],
              photo: topRatedCigar.photo,
              rating: topRatedCigar.rating,
            }
          : null,
        highestValueCigar: highestValueCigar
          ? {
              id: highestValueCigar.id,
              name: highestValueCigar.name,
              recordType: 'cigar',
              photos: highestValueCigar.photos || [],
              photo: highestValueCigar.photo,
              value: Math.round(highestValueCigar.__value || 0),
            }
          : null,
        mostValuableItem: mostValuable
          ? (() => {
              let fullRecord = null;
              if (mostValuable.type === 'pipe') {
                fullRecord = pipesList.find(p => p.id === mostValuable.id);
              } else if (mostValuable.type === 'blend') {
                fullRecord = blendsList.find(b => b.id === mostValuable.id);
              } else if (mostValuable.type === 'bottle') {
                fullRecord = bottlesList.find(b => b.id === mostValuable.id);
              } else if (mostValuable.type === 'cigar') {
                fullRecord = cigarsList.find(c => c.id === mostValuable.id);
              }
              return fullRecord ? {
                id: mostValuable.id,
                name: mostValuable.name,
                recordType: mostValuable.type,
                photos: fullRecord.photos || [],
                photo: fullRecord.photo || fullRecord.logo,
                logo: fullRecord.logo,
                image: fullRecord.image,
                image_url: fullRecord.image_url,
                thumbnail: fullRecord.thumbnail,
                value: Math.round(mostValuable.value),
              } : null;
            })()
          : null,
        underusedCount: underusedPipes.length,
        dominantBlendType,
        dominantWhiskyType,
        mostValuableWine: mostValuableWine
          ? {
              id: mostValuableWine.id,
              name: mostValuableWine.name,
              recordType: 'wine',
              photos: mostValuableWine.photos || [],
              photo: getWinePrimaryImage(mostValuableWine),
              value: Math.round(mostValuableWine.value || 0),
            }
          : null,
        topRatedWine: topRatedWine
          ? {
              id: topRatedWine.id,
              name: topRatedWine.name,
              recordType: 'wine',
              photos: topRatedWine.photos || [],
              photo: getWinePrimaryImage(topRatedWine),
              rating: Number(topRatedWine.rating || 0),
            }
          : null,
        readyToDrinkWine: readyToDrinkWine
          ? {
              id: readyToDrinkWine.id,
              name: readyToDrinkWine.name,
              recordType: 'wine',
              photos: readyToDrinkWine.photos || [],
              photo: getWinePrimaryImage(readyToDrinkWine),
            }
          : null,
      },
    };

    return Response.json(story);
  } catch (error) {
    console.error('Story generation error:', error);
    return Response.json({ error: error.message || 'Failed to generate story' }, { status: 500 });
  }
});