/**
 * valueEngine.js
 * Canonical, module-agnostic valuation engine for WhiskeyKeeper and future modules.
 * All valuation logic should route through this file.
 *
 * Supported moduleKeys: 'whiskeykeeper', 'pipekeeper', 'cigarkeeper', 'winekeeper'
 * Unknown modules fall back to generic logic.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// ---------------------------------------------------------------------------
// 1. normalizeValuationInputs
// ---------------------------------------------------------------------------

/**
 * Extract and normalize the fields relevant to valuation from any item.
 * Returns a module-agnostic structure.
 */
export function normalizeValuationInputs(item, moduleKey) {
  if (!item) return null;

  const base = {
    id: item.id || null,
    name: item.name || '',
    retailValue: toNum(item.retail_price),
    marketValue: toNum(item.aftermarket_price),
    collectorValue: toNum(item.collector_value),
    purchaseValue: toNum(item.purchase_price),
    estimatedValue: toNum(item.estimated_value),
    confidence: item.value_confidence || null,
    lastUpdated: item.value_last_updated || item.updated_date || item.created_date || null,
  };

  if (moduleKey === 'whiskeykeeper') {
    return {
      ...base,
      age: toNum(item.age),
      abv: toNum(item.abv),
      type: item.type || '',
      region: item.region || '',
      country: item.country || '',
      fillLevel: item.fill_level || 'Full',
      productionStatus: item.production_status || '',
      edition: item.edition || '',
      isDiscontinued: !!(item.discontinued || item.production_status === 'Discontinued'),
      isAllocated: !!(item.allocated || item.production_status === 'Allocated'),
      valuationNotes: item.valuation_notes || '',
      manualValueOverride: item.manual_value_override ? toNum(item.manual_value_override) : null,
      valueSourceNotes: item.value_source_notes || '',
      replacementDifficultyOverride: item.replacement_difficulty || null,
      availabilityNote: item.availability_note || '',
    };
  }

  if (moduleKey === 'pipekeeper') {
    // Detect tobacco blend by presence of blend_type or manufacturer without maker
    const isTobacco = !!(item.blend_type || (item.manufacturer && !item.maker));

    if (isTobacco) {
      const totalOz =
        toNum(item.tin_total_quantity_oz) +
        toNum(item.bulk_total_quantity_oz) +
        toNum(item.pouch_total_quantity_oz);
      const pricePerOz = toNum(item.price_per_oz);
      const aiEstimatedValue = toNum(item.ai_estimated_value);
      // Manual market value → collectorValue; AI est * oz → estimatedValue; price/oz * oz → marketValue; cost_basis → purchaseValue
      return {
        ...base,
        itemType: 'tobacco',
        manufacturer: item.manufacturer || '',
        blendType: item.blend_type || '',
        pricePerOz,
        totalOz,
        totalTins: toNum(item.tin_total_tins),
        totalPouches: toNum(item.pouch_total_pouches),
        isDiscontinued: !!(
          item.discontinued ||
          (item.production_status || '').toLowerCase().includes('discontinue')
        ),
        productionStatus: item.production_status || '',
        agingPotential: item.aging_potential || '',
        isLimitedBatch: !!(item.limited_batch || item.is_limited),
        isRegionalExclusive: !!(item.regional_exclusive || item.region_exclusive),
        // Remap to canonical base fields for shared engine
        collectorValue: toNum(item.manual_market_value),
        estimatedValue: aiEstimatedValue > 0 && totalOz > 0 ? aiEstimatedValue * totalOz : 0,
        marketValue: pricePerOz > 0 && totalOz > 0 ? pricePerOz * totalOz : 0,
        purchaseValue: toNum(item.cost_basis),
      };
    }

    // Pipe item
    return {
      ...base,
      itemType: 'pipe',
      maker: item.maker || '',
      bowlMaterial: item.bowl_material || '',
      condition: item.condition || '',
      yearMade: item.year_made || '',
      shape: item.shape || '',
      isHandmade: !!(item.is_handmade || item.handmade),
      isLimitedRun: !!(item.limited_run || item.is_limited_run),
      productionStatus: item.production_status || '',
      artisanGrade: item.artisan_grade || '',
    };
  }

  if (moduleKey === 'cigarkeeper') {
    return {
      ...base,
      brand: item.brand || '',
      vitola: item.vitola || '',
      origin: item.origin || item.country || '',
      vintage: toNum(item.vintage_year),
    };
  }

  if (moduleKey === 'winekeeper') {
    return {
      ...base,
      grape: item.grape || item.varietal || '',
      vintage: toNum(item.vintage_year || item.vintage),
      appellation: item.appellation || item.region || '',
      rating: toNum(item.rating),
    };
  }

  // Generic fallback
  return base;
}

// ---------------------------------------------------------------------------
// 2. computeCurrentValue
// ---------------------------------------------------------------------------

/**
 * Returns the canonical current value for an item.
 * Priority differs per module.
 */
export function computeCurrentValue(item, moduleKey) {
  if (!item) return 0;
  const inputs = normalizeValuationInputs(item, moduleKey);
  if (!inputs) return 0;

  // Manual override takes absolute precedence when set
  if (inputs.manualValueOverride > 0) return inputs.manualValueOverride;

  if (moduleKey === 'whiskeykeeper') {
    return (
      inputs.collectorValue ||
      inputs.marketValue ||
      inputs.retailValue ||
      inputs.purchaseValue ||
      0
    );
  }

  if (moduleKey === 'pipekeeper') {
    if (inputs.itemType === 'tobacco') {
      // Priority: manual market value → AI estimate * oz → price/oz * oz → cost basis
      return (
        inputs.collectorValue ||
        inputs.estimatedValue ||
        inputs.marketValue ||
        inputs.purchaseValue ||
        0
      );
    }
    // Pipe priority: estimated (manual) → collector → purchase
    return (
      inputs.estimatedValue ||
      inputs.collectorValue ||
      inputs.purchaseValue ||
      0
    );
  }

  // Generic: best available value
  return (
    inputs.collectorValue ||
    inputs.estimatedValue ||
    inputs.marketValue ||
    inputs.retailValue ||
    inputs.purchaseValue ||
    0
  );
}

// ---------------------------------------------------------------------------
// 3. computeRarityScore
// ---------------------------------------------------------------------------

/**
 * Returns a rarity score from 0 to 100.
 * Higher = rarer.
 */
export function computeRarityScore(item, moduleKey) {
  if (!item) return 0;
  const inputs = normalizeValuationInputs(item, moduleKey);
  if (!inputs) return 0;

  let score = 0;

  if (moduleKey === 'whiskeykeeper') {
    // Type premium
    if (inputs.type === 'Single Malt' || inputs.type === 'Single Grain') score += 20;
    if (inputs.type === 'Scotch Whisky' || inputs.type === 'Blended Malt') score += 10;

    // Age premium
    if (inputs.age >= 30) score += 35;
    else if (inputs.age >= 25) score += 25;
    else if (inputs.age >= 18) score += 18;
    else if (inputs.age >= 12) score += 10;

    // Production status
    const status = (inputs.productionStatus || '').toLowerCase();
    if (status === 'discontinued' || status === 'vintage') score += 25;
    else if (status === 'limited edition' || status === 'allocated') score += 18;
    else if (status === 'single cask' || status === 'cask strength') score += 12;

    if (inputs.isDiscontinued) score += 10;
    if (inputs.isAllocated) score += 8;

    // ABV / cask strength
    if (inputs.abv >= 60) score += 12;
    else if (inputs.abv >= 55) score += 8;
    else if (inputs.abv >= 50) score += 4;

    // Rare regions
    const rareRegions = ['campbeltown', 'islay'];
    if (rareRegions.some(r => (inputs.region || '').toLowerCase().includes(r))) score += 6;

    // Fill level depreciation for open bottles
    if (inputs.fillLevel && inputs.fillLevel !== 'Full' && inputs.fillLevel !== 'Sealed') {
      const fillPenalties = { High: -5, Medium: -12, Low: -20, Empty: -30 };
      score += fillPenalties[inputs.fillLevel] || 0;
    }
  } else if (moduleKey === 'pipekeeper') {
    if (inputs.itemType === 'tobacco') {
      // Discontinued blends are increasingly scarce
      if (inputs.isDiscontinued) score += 35;

      // Limited batch or small-run production
      if (inputs.isLimitedBatch) score += 20;

      // Regional exclusivity (hard to import)
      if (inputs.isRegionalExclusive) score += 15;

      // Cellar age premium — if priced above a typical blend
      if (inputs.pricePerOz >= 8) score += 15;
      else if (inputs.pricePerOz >= 4) score += 8;

      // Blend type premiums (rare/specialty tobaccos)
      const rareBlendTypes = ['latakia', 'oriental', 'perique', 'virginia flake', 'navy flake'];
      if (rareBlendTypes.some(t => (inputs.blendType || '').toLowerCase().includes(t))) score += 10;

      // Production status
      const status = (inputs.productionStatus || '').toLowerCase();
      if (status.includes('limited') || status.includes('seasonal')) score += 12;
    } else {
      // Pipe rarity
      const premiumMakers = ['dunhill', 'barling', 'comoy', 'sasieni', 'charatan', 'castello', 'ardor', 'ser jacopo', 'radice'];
      const makerLower = (inputs.maker || '').toLowerCase();
      if (premiumMakers.some(m => makerLower.includes(m))) score += 25;

      const materialScores = { Meerschaum: 20, Morta: 18, Briar: 8, Clay: 5 };
      score += materialScores[inputs.bowlMaterial] || 0;

      const yearNum = parseInt(inputs.yearMade, 10);
      if (!isNaN(yearNum)) {
        if (yearNum < 1960) score += 30;
        else if (yearNum < 1980) score += 20;
        else if (yearNum < 2000) score += 10;
      }

      const conditionScores = { Mint: 15, Excellent: 10, 'Very Good': 5 };
      score += conditionScores[inputs.condition] || 0;

      // Handmade or limited-run pipes are inherently rarer
      if (inputs.isHandmade) score += 10;
      if (inputs.isLimitedRun) score += 12;
    }
  } else if (moduleKey === 'cigarkeeper') {
    if (inputs.vintage > 0 && inputs.vintage < new Date().getFullYear() - 10) score += 25;
    score += Math.min(toNum(inputs.rating) * 8, 40);
  } else if (moduleKey === 'winekeeper') {
    const age = new Date().getFullYear() - inputs.vintage;
    if (age >= 20) score += 30;
    else if (age >= 10) score += 18;
    else if (age >= 5) score += 8;
    score += Math.min(toNum(inputs.rating) * 8, 40);
  } else {
    // Generic: value-based rarity proxy
    const cv = computeCurrentValue(item, moduleKey);
    if (cv >= 500) score += 40;
    else if (cv >= 200) score += 25;
    else if (cv >= 100) score += 12;
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

// ---------------------------------------------------------------------------
// 4. computeReplacementDifficulty
// ---------------------------------------------------------------------------

const DIFFICULTY_LEVELS = {
  VERY_HARD: 'very_hard',
  HARD: 'hard',
  MODERATE: 'moderate',
  EASY: 'easy',
};

/**
 * Returns 'easy' | 'moderate' | 'hard' | 'very_hard'.
 */
export function computeReplacementDifficulty(item, moduleKey) {
  if (!item) return DIFFICULTY_LEVELS.EASY;
  const inputs = normalizeValuationInputs(item, moduleKey);
  if (!inputs) return DIFFICULTY_LEVELS.EASY;

  // Respect explicit override stored on the item
  if (inputs.replacementDifficultyOverride) return inputs.replacementDifficultyOverride;

  const rarity = computeRarityScore(item, moduleKey);

  if (moduleKey === 'whiskeykeeper') {
    const status = (inputs.productionStatus || '').toLowerCase();
    const isDiscontinued = inputs.isDiscontinued || status === 'discontinued' || status === 'vintage';
    const isLimited = status === 'limited edition' || status === 'allocated' || inputs.isAllocated;

    if (isDiscontinued && (inputs.age >= 20 || rarity >= 75)) return DIFFICULTY_LEVELS.VERY_HARD;
    if (isDiscontinued || (inputs.age >= 25)) return DIFFICULTY_LEVELS.HARD;
    if (isLimited || (inputs.age >= 18)) return DIFFICULTY_LEVELS.HARD;
    if (inputs.age >= 12 || rarity >= 50) return DIFFICULTY_LEVELS.MODERATE;
    return DIFFICULTY_LEVELS.EASY;
  }

  if (moduleKey === 'pipekeeper') {
    if (inputs.itemType === 'tobacco') {
      const status = (inputs.productionStatus || '').toLowerCase();
      const isDiscontinued = inputs.isDiscontinued || status.includes('discontinue');
      const isLimited = inputs.isLimitedBatch || status.includes('limited') || status.includes('seasonal');

      if (isDiscontinued && inputs.isRegionalExclusive) return DIFFICULTY_LEVELS.VERY_HARD;
      if (isDiscontinued) return DIFFICULTY_LEVELS.HARD;
      if (isLimited || inputs.isRegionalExclusive) return DIFFICULTY_LEVELS.MODERATE;
      return DIFFICULTY_LEVELS.EASY;
    }

    // Pipe replacement difficulty
    const premiumMakers = ['dunhill', 'barling', 'comoy', 'sasieni', 'charatan', 'castello', 'ardor'];
    const makerLower = (inputs.maker || '').toLowerCase();
    const isPremium = premiumMakers.some(m => makerLower.includes(m));
    const yearNum = parseInt(inputs.yearMade, 10);
    const isVintage = !isNaN(yearNum) && yearNum < 1980;
    const isCollector = !isNaN(yearNum) && yearNum < 2000;

    if (isVintage && isPremium) return DIFFICULTY_LEVELS.VERY_HARD;
    if (isVintage || (isCollector && isPremium)) return DIFFICULTY_LEVELS.HARD;
    if (isPremium || inputs.bowlMaterial === 'Meerschaum' || inputs.bowlMaterial === 'Morta') return DIFFICULTY_LEVELS.MODERATE;
    if (inputs.isHandmade) return DIFFICULTY_LEVELS.MODERATE;
    return DIFFICULTY_LEVELS.EASY;
  }

  // Generic: rarity-based
  if (rarity >= 75) return DIFFICULTY_LEVELS.VERY_HARD;
  if (rarity >= 50) return DIFFICULTY_LEVELS.HARD;
  if (rarity >= 25) return DIFFICULTY_LEVELS.MODERATE;
  return DIFFICULTY_LEVELS.EASY;
}

// ---------------------------------------------------------------------------
// 5. computeOpenVsHoldDecision
// ---------------------------------------------------------------------------

/**
 * Returns { holdRecommendation: 'hold' | 'open' | 'either', rationale: string[] }
 * collectionContext is optional: { bottles: [], medianValue: number }
 */
export function computeOpenVsHoldDecision(item, moduleKey, collectionContext = {}) {
  if (!item) return { holdRecommendation: 'either', rationale: ['Insufficient data'] };

  const rarity = computeRarityScore(item, moduleKey);
  const difficulty = computeReplacementDifficulty(item, moduleKey);
  const currentValue = computeCurrentValue(item, moduleKey);
  const inputs = normalizeValuationInputs(item, moduleKey);
  const rationale = [];

  // Compute median collection value for context
  const collectionBottles = collectionContext?.bottles || [];
  let medianValue = collectionContext?.medianValue || 0;
  if (!medianValue && collectionBottles.length > 0) {
    const sorted = [...collectionBottles]
      .map(b => computeCurrentValue(b, moduleKey))
      .filter(v => v > 0)
      .sort((a, b) => a - b);
    medianValue = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  }

  // Check for duplicates (opens the door to consuming one)
  const hasDuplicates =
    collectionBottles.length > 0 &&
    collectionBottles.filter(b => b.id !== item.id && b.name === item.name).length > 0;

  const isVeryHard = difficulty === DIFFICULTY_LEVELS.VERY_HARD;
  const isHard = difficulty === DIFFICULTY_LEVELS.HARD;
  const isEasy = difficulty === DIFFICULTY_LEVELS.EASY;

  const isHighValue = currentValue > 0 && medianValue > 0 && currentValue >= medianValue * 1.5;

  if (moduleKey === 'whiskeykeeper') {
    const status = (inputs?.productionStatus || '').toLowerCase();
    const fillLevel = inputs?.fillLevel || 'Full';
    const isSealed = fillLevel === 'Full' || fillLevel === 'Sealed';
    const isOpen = !isSealed;

    // Strong hold signals
    if (isVeryHard) rationale.push('Replacement is extremely difficult — this bottle cannot easily be replaced');
    if (isHard) rationale.push('Limited availability makes replacement challenging');
    if (status === 'discontinued') rationale.push('Discontinued production — sealed examples are increasingly scarce');
    if (status === 'vintage') rationale.push('Vintage release with fixed supply');
    if (inputs?.age >= 25) rationale.push(`${inputs.age}-year age statement commands a significant hold premium`);
    if (isHighValue) rationale.push(`Value (${currentValue > 0 ? '$' + Math.round(currentValue) : '—'}) is above your collection median — holding preserves maximum optionality`);
    if (rarity >= 70) rationale.push(`High rarity score (${rarity}/100) — collector demand may increase over time`);

    // Strong open signals
    if (hasDuplicates) rationale.push('You have duplicates — opening one is lower risk');
    if (isEasy) rationale.push('Widely available — easy to replace if enjoyed');
    if (rarity <= 25 && !isHighValue) rationale.push('Low rarity score — minimal collector penalty for opening');
    if (isOpen) rationale.push('Bottle is already open — best enjoyed before quality degrades');

    const holdSignals = [isVeryHard, isHard, isHighValue, rarity >= 60, status === 'discontinued', status === 'vintage'].filter(Boolean).length;
    const openSignals = [hasDuplicates, isEasy, rarity <= 25, isOpen].filter(Boolean).length;

    let holdRecommendation;
    if (holdSignals >= 2 && openSignals === 0) holdRecommendation = 'hold';
    else if (openSignals >= 2 && holdSignals === 0) holdRecommendation = 'open';
    else holdRecommendation = 'either';

    if (holdRecommendation === 'hold' && rationale.filter(r => r.toLowerCase().includes('hold') || r.toLowerCase().includes('preserv') || r.toLowerCase().includes('scarce') || r.toLowerCase().includes('replac')).length === 0) {
      rationale.push('Overall profile favors holding this bottle');
    }
    if (holdRecommendation === 'open' && rationale.filter(r => r.toLowerCase().includes('open') || r.toLowerCase().includes('enjoy')).length === 0) {
      rationale.push('No strong reason to hold — enjoy it');
    }
    if (holdRecommendation === 'either' && rationale.length === 0) {
      rationale.push('Mixed signals — open vs hold is a personal choice');
    }

    return { holdRecommendation, rationale };
  }

  if (moduleKey === 'pipekeeper') {
    if (inputs.itemType === 'tobacco') {
      // Tobacco decision: smoke_now / smoke_later / cellar / hold_for_trade
      const rationale = [];
      const status = (inputs.productionStatus || '').toLowerCase();

      if (isVeryHard || (inputs.isDiscontinued && rarity >= 65)) {
        rationale.push('Discontinued and scarce — secondary market value may appreciate');
        if (hasDuplicates) rationale.push('You have duplicates — consider trading one for premium');
        rationale.push('Hold unopened stock for potential trade or future premium value');
        return { holdRecommendation: 'hold_for_trade', rationale };
      }

      if (inputs.isDiscontinued || (isHard && rarity >= 50)) {
        rationale.push('Discontinued blend — limited remaining supply');
        if (inputs.totalOz > 16) {
          rationale.push(`You have ${inputs.totalOz.toFixed(1)} oz — enough to cellar and smoke`);
          rationale.push('Age remaining stock for enhanced flavor development');
          return { holdRecommendation: 'cellar', rationale };
        }
        rationale.push('Smoke slowly and enjoy — replacement will be difficult');
        return { holdRecommendation: 'smoke_later', rationale };
      }

      const agingPotential = (inputs.agingPotential || '').toLowerCase();
      if (agingPotential.includes('excellent') || agingPotential.includes('high') || agingPotential.includes('great')) {
        rationale.push('High aging potential — cellaring will improve this blend');
        if (inputs.totalOz > 8) rationale.push(`${inputs.totalOz.toFixed(1)} oz gives room to smoke and cellar`);
        return { holdRecommendation: 'cellar', rationale };
      }

      if (inputs.isLimitedBatch || status.includes('limited') || status.includes('seasonal')) {
        rationale.push('Limited batch or seasonal release');
        rationale.push('Save for special occasions — replenishment may not be possible');
        return { holdRecommendation: 'smoke_later', rationale };
      }

      // Low rarity, widely available
      if (rarity <= 25 && isEasy) {
        rationale.push('Widely available and easy to replenish');
        rationale.push('Enjoy freely — no reason to hold back');
        return { holdRecommendation: 'smoke_now', rationale };
      }

      rationale.push('Readily available — smoke and enjoy at your pace');
      return { holdRecommendation: 'smoke_now', rationale };
    }

    // Pipe decision: use / rotate / preserve / insure
    const rationale = [];

    if (isVeryHard && rarity >= 75) {
      rationale.push('Extremely rare and irreplaceable — insure against loss or damage');
      rationale.push('Consider professional appraisal and proper storage');
      if (currentValue > 0) rationale.push(`Current value (~$${Math.round(currentValue)}) justifies formal coverage`);
      return { holdRecommendation: 'insure', rationale };
    }

    if (isVeryHard || rarity >= 70) {
      rationale.push('Rare or vintage pipe — preserve display quality');
      rationale.push('Active use may reduce collector value or risk damage');
      if (hasDuplicates) rationale.push('You have similar pipes — smoke those instead');
      return { holdRecommendation: 'preserve', rationale };
    }

    if (isHard || rarity >= 45) {
      rationale.push('Moderately rare — include thoughtfully in rotation');
      rationale.push('Enjoy it, but clean and maintain carefully after each use');
      if (currentValue > 0 && medianValue > 0 && currentValue >= medianValue * 1.5) {
        rationale.push('Above-median value — be mindful of wear');
      }
      return { holdRecommendation: 'rotate', rationale };
    }

    rationale.push('Widely available — use and enjoy freely');
    if (hasDuplicates) rationale.push('You have similar pipes — rotate them to prevent ghosting');
    return { holdRecommendation: 'use', rationale };
  }

  // Generic
  if (rarity >= 60 || isVeryHard || isHard) {
    rationale.push('Rarity or replacement difficulty suggests holding');
    return { holdRecommendation: 'hold', rationale };
  }
  if (rarity <= 20 && isEasy) {
    rationale.push('Low rarity and easy replacement — safe to use');
    return { holdRecommendation: 'open', rationale };
  }
  rationale.push('No strong signal — personal preference applies');
  return { holdRecommendation: 'either', rationale };
}

// ---------------------------------------------------------------------------
// 6. buildValuationSnapshot
// ---------------------------------------------------------------------------

/**
 * Build a full valuation snapshot object.
 * This is the canonical output shape for a valuation computation.
 *
 * Output shape:
 * {
 *   currentValue, retailValue, marketValue, collectorValue,
 *   source, confidence, rarityScore, replacementDifficulty,
 *   holdRecommendation, rationale, trend
 * }
 */
export function buildValuationSnapshot(item, moduleKey, collectionContext = {}) {
  if (!item) return null;

  const inputs = normalizeValuationInputs(item, moduleKey);
  const currentValue = computeCurrentValue(item, moduleKey);
  const rarityScore = computeRarityScore(item, moduleKey);
  const replacementDifficulty = computeReplacementDifficulty(item, moduleKey);
  const { holdRecommendation, rationale } = computeOpenVsHoldDecision(item, moduleKey, collectionContext);

  // Determine value source and confidence
  let source = 'Unknown';
  let confidence = 'low';

  if (inputs.manualValueOverride > 0) {
    source = 'Manual Override';
    confidence = 'high';
  } else if (inputs.collectorValue > 0) {
    source = 'Collector Value';
    confidence = 'high';
  } else if (inputs.marketValue > 0) {
    source = 'Aftermarket / Secondary Market';
    confidence = 'medium';
  } else if (inputs.retailValue > 0) {
    source = 'Retail Price';
    confidence = 'medium';
  } else if (inputs.purchaseValue > 0) {
    source = 'Purchase Price';
    confidence = 'low';
  } else if (inputs.estimatedValue > 0) {
    source = 'Estimated Value';
    confidence = 'low';
  }

  // Respect explicitly stored confidence if it exists
  if (inputs.confidence) {
    const c = (inputs.confidence || '').toLowerCase();
    if (['high', 'medium', 'low'].includes(c)) confidence = c;
  }

  // Resolve trend from history embedded in collectionContext
  const trend = resolveValueTrend(collectionContext?.valueHistory || []);

  return {
    currentValue,
    retailValue: inputs.retailValue,
    marketValue: inputs.marketValue,
    collectorValue: inputs.collectorValue,
    source,
    confidence,
    rarityScore,
    replacementDifficulty,
    holdRecommendation,
    rationale,
    trend,
  };
}

// ---------------------------------------------------------------------------
// 7. resolveValueTrend
// ---------------------------------------------------------------------------

/**
 * Derive a trend direction from an array of value history entries.
 * Each entry should have: { computed_current_value or value, snapshot_date or date }
 * Returns: 'up' | 'down' | 'flat' | 'unknown'
 */
export function resolveValueTrend(history) {
  if (!Array.isArray(history) || history.length < 2) return 'unknown';

  const sorted = [...history]
    .map(h => ({
      value: toNum(h.computed_current_value ?? h.value ?? 0),
      date: new Date(h.snapshot_date || h.date || 0),
    }))
    .filter(h => h.value > 0 && !isNaN(h.date.getTime()))
    .sort((a, b) => a.date - b.date);

  if (sorted.length < 2) return 'unknown';

  const oldest = sorted[0].value;
  const newest = sorted[sorted.length - 1].value;

  if (oldest === 0) return 'unknown';

  const changePct = ((newest - oldest) / oldest) * 100;
  if (changePct >= 5) return 'up';
  if (changePct <= -5) return 'down';
  return 'flat';
}

// ---------------------------------------------------------------------------
// Exported convenience: difficulty labels
// ---------------------------------------------------------------------------

export const DIFFICULTY_LABELS = {
  easy: 'Easy to Replace',
  moderate: 'Moderately Available',
  hard: 'Hard to Replace',
  very_hard: 'Very Hard to Replace',
};

export const TREND_LABELS = {
  up: '↑ Trending Up',
  down: '↓ Trending Down',
  flat: '→ Stable',
  unknown: '— Unknown Trend',
};

export const HOLD_RECOMMENDATION_LABELS = {
  hold: 'Hold',
  open: 'Safe to Open',
  either: 'Either',
};

export const PIPE_RECOMMENDATION_LABELS = {
  use: 'Use Freely',
  rotate: 'Include in Rotation',
  preserve: 'Preserve — Limit Use',
  insure: 'Preserve & Insure',
};

export const TOBACCO_RECOMMENDATION_LABELS = {
  smoke_now: 'Smoke Now',
  smoke_later: 'Save for Later',
  cellar: 'Cellar for Aging',
  hold_for_trade: 'Hold for Trade',
};
