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
// Pipe maker configuration — data-driven enrichment
// ---------------------------------------------------------------------------

/**
 * Known pipe maker metadata.
 * These are conservative defaults consulted when no explicit maker-status
 * fields are stored on the item. Item-level fields always take precedence.
 *
 * tier: 'prestige' | 'master' | 'established' | 'emerging'
 * productionStatus: 'active' | 'retired' | 'deceased' | 'inactive'
 * isHandmade: true if the maker is known for individual handmade work
 *
 * Keys are lowercase and matched with String.includes() so partial names
 * (e.g. 'ivarsson') also resolve correctly.
 */
export const PIPE_MAKER_CONFIG = {
  // ── Classic English makers (largely inactive / historic) ──
  'dunhill':         { tier: 'prestige',    productionStatus: 'inactive',  isHandmade: false },
  'barling':         { tier: 'prestige',    productionStatus: 'inactive',  isHandmade: true  },
  'comoy':           { tier: 'prestige',    productionStatus: 'inactive',  isHandmade: false },
  'sasieni':         { tier: 'prestige',    productionStatus: 'inactive',  isHandmade: true  },
  'charatan':        { tier: 'prestige',    productionStatus: 'inactive',  isHandmade: true  },
  // ── Italian artisan makers ──
  'castello':        { tier: 'prestige',    productionStatus: 'active',    isHandmade: true  },
  'ardor':           { tier: 'prestige',    productionStatus: 'active',    isHandmade: true  },
  'ser jacopo':      { tier: 'prestige',    productionStatus: 'active',    isHandmade: true  },
  'radice':          { tier: 'master',      productionStatus: 'active',    isHandmade: true  },
  'moretti':         { tier: 'master',      productionStatus: 'deceased',  isHandmade: true  },
  // ── Nordic / Scandinavian makers ──
  'lars ivarsson':   { tier: 'prestige',    productionStatus: 'deceased',  isHandmade: true  },
  'sixten ivarsson': { tier: 'prestige',    productionStatus: 'deceased',  isHandmade: true  },
  'nording':         { tier: 'established', productionStatus: 'retired',   isHandmade: false },
  'w.o. larsen':     { tier: 'established', productionStatus: 'inactive',  isHandmade: false },
  // ── Czech / Eastern European makers ──
  'jirsa':           { tier: 'master',      productionStatus: 'active',    isHandmade: true  },
  'jan zaloudek':    { tier: 'prestige',    productionStatus: 'deceased',  isHandmade: true  },
  'kapet':           { tier: 'established', productionStatus: 'active',    isHandmade: true  },
  // ── American artisan makers ──
  'boswell':         { tier: 'established', productionStatus: 'active',    isHandmade: true  },
};

/**
 * Look up maker config by name (case-insensitive, partial match).
 * Returns the first matching config entry, or null if not found.
 * @param {string} makerName
 * @returns {{ tier: string, productionStatus: string, isHandmade: boolean } | null}
 */
function resolvePipeMakerConfig(makerName) {
  if (!makerName) return null;
  const lower = makerName.toLowerCase();
  for (const [key, cfg] of Object.entries(PIPE_MAKER_CONFIG)) {
    if (lower.includes(key)) return cfg;
  }
  return null;
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
      isUnicorn: !!(item.unicorn || item.is_unicorn),
      batchType: item.batch_type || '',
      isExportOnly: !!(item.export_only || item.travel_retail || item.is_travel_retail),
      isExclusive: !!(item.exclusive || item.production_status === 'Exclusive'),
      producerStatus: item.producer_status || '',
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
      const manualValueOverride = toNum(item.manual_market_value) || toNum(item.manual_value_override);
      const makerStatusRaw = (item.manufacturer_status || item.maker_status || '').toLowerCase();
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
        isLimitedBatch: !!(item.limited_batch || item.is_limited || item.is_limited_release),
        isRegionalExclusive: !!(item.regional_exclusive || item.region_exclusive || item.regional_exclusivity),
        isSeasonal: !!(item.seasonal || item.is_seasonal || (item.production_status || '').toLowerCase().includes('seasonal')),
        isMakerInactive: !!(
          item.manufacturer_inactive ||
          makerStatusRaw === 'inactive' ||
          makerStatusRaw === 'defunct' ||
          makerStatusRaw.includes('closed') ||
          makerStatusRaw.includes('no longer')
        ),
        manufacturerStatus: item.manufacturer_status || '',
        cellarAgeYears: toNum(item.cellar_age_years || item.cellar_age),
        rarityOverride: toNum(item.rarity_score_override || item.rarity_override),
        // Remap to canonical base fields for shared engine.
        // manualValueOverride is the highest-priority value source; it also doubles as collectorValue.
        collectorValue: manualValueOverride > 0 ? manualValueOverride : toNum(item.manual_market_value),
        estimatedValue: aiEstimatedValue > 0 && totalOz > 0 ? aiEstimatedValue * totalOz : 0,
        marketValue: pricePerOz > 0 && totalOz > 0 ? pricePerOz * totalOz : 0,
        purchaseValue: toNum(item.cost_basis),
        manualValueOverride: manualValueOverride > 0 ? manualValueOverride : null,
      };
    }

    // Pipe item
    const makerStatusRaw = (item.maker_status || '').toLowerCase();
    const isMakerDeceased = !!(
      item.maker_deceased ||
      makerStatusRaw.includes('deceased') ||
      makerStatusRaw.includes('passed')
    );
    const isMakerRetired = !!(
      item.maker_retired ||
      makerStatusRaw === 'retired' ||
      makerStatusRaw.includes('no longer producing') ||
      makerStatusRaw.includes('no longer making') ||
      makerStatusRaw.includes('stopped making')
    );
    const isMakerInactive = !!(
      item.maker_inactive ||
      makerStatusRaw === 'inactive' ||
      makerStatusRaw === 'defunct' ||
      makerStatusRaw.includes('closed')
    );
    const isOneOfAKind = !!(
      item.one_of_a_kind ||
      item.is_one_of_a_kind ||
      item.unique ||
      item.commissioned ||
      (item.production_type || '').toLowerCase() === 'one_off' ||
      (item.production_type || '').toLowerCase() === 'one-off'
    );
    const isCustom = !!(
      item.is_custom ||
      item.custom ||
      item.artisan ||
      item.is_handmade ||
      item.handmade
    );
    const productionTypeLower = (item.production_type || '').toLowerCase();
    return {
      ...base,
      itemType: 'pipe',
      maker: item.maker || '',
      bowlMaterial: item.bowl_material || '',
      condition: item.condition || '',
      yearMade: item.year_made || '',
      shape: item.shape || '',
      isHandmade: isCustom,
      isLimitedRun: !!(item.limited_run || item.is_limited_run || item.is_limited),
      productionStatus: item.production_status || '',
      artisanGrade: item.artisan_grade || '',
      // New enhanced fields
      isOneOfAKind,
      isCustom,
      productionType: item.production_type || '',
      artisanTier: item.artisan_tier || '',
      makerStatus: item.maker_status || '',
      isMakerDeceased,
      isMakerRetired,
      isMakerInactive,
      hasProvenance: !!(
        item.provenance ||
        item.provenance_notes ||
        item.has_provenance ||
        item.stamped ||
        item.certified ||
        item.graded
      ),
      isGraded: !!(item.graded || item.is_graded || item.grade),
      replacementDifficultyOverride: item.replacement_difficulty_override || item.replacement_difficulty || null,
      // Resolve effective production type
      _effectiveProdType: isOneOfAKind || productionTypeLower === 'one_off' || productionTypeLower === 'one-off'
        ? 'one_off'
        : productionTypeLower === 'limited_artisan_batch' || productionTypeLower === 'limited_artisan'
          ? 'limited_artisan_batch'
          : productionTypeLower === 'standard_artisan' || isCustom
            ? 'standard_artisan'
            : 'factory',
      // Manual rarity score override (bypasses computed score)
      rarityScoreOverride: toNum(item.rarity_score_override || item.rarity_override),
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
 *
 * Pipe scoring targets (floor: 50 — no pipe may score below 50):
 *   common factory / standard production:              50–60
 *   respected but currently available artisan:         60–75
 *   limited artisan / special line / harder-to-find:   70–85
 *   one-of-a-kind custom artisan:                      80–95
 *   one-of-a-kind + deceased/retired maker/provenance: 90–100
 *
 * Tobacco scoring targets (floor: 10):
 *   common in-production blend:                        10–20
 *   seasonal / limited / regional:                     30–55
 *   discontinued (active manufacturer):                45–65
 *   discontinued + inactive manufacturer:              60–80
 *   multiple scarcity signals combined:                70–90+
 *
 * Bottle scoring targets (floor: 5):
 *   basic in-production, no age statement:             5–25
 *   limited / allocated / aged:                        25–60
 *   discontinued + aged + closed producer:             70–90+
 */
export function computeRarityScore(item, moduleKey) {
  if (!item) return 0;
  const inputs = normalizeValuationInputs(item, moduleKey);
  if (!inputs) return 0;

  let score = 0;

  if (moduleKey === 'whiskeykeeper') {
    // Base floor — even a basic in-production bottle has some collectible signal
    score = 5;

    // Type premium
    if (inputs.type === 'Single Malt' || inputs.type === 'Single Grain') score += 20;
    else if (inputs.type === 'Scotch Whisky' || inputs.type === 'Blended Malt') score += 10;

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
    if (inputs.isUnicorn) score += 20;
    if (inputs.isExportOnly) score += 10;
    if (inputs.isExclusive) score += 12;

    // Batch type
    const batchType = (inputs.batchType || '').toLowerCase();
    if (batchType === 'single_barrel' || batchType === 'single barrel') score += 12;
    else if (batchType === 'small_batch' || batchType === 'small batch') score += 6;

    // Producer status
    const producerStatus = (inputs.producerStatus || '').toLowerCase();
    if (producerStatus.includes('closed') || producerStatus.includes('defunct')) score += 20;
    else if (producerStatus.includes('silent') || producerStatus.includes('mothballed')) score += 15;

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
      // Apply rarity override if manually set
      if (inputs.rarityOverride > 0) return Math.min(100, Math.max(0, Math.round(inputs.rarityOverride)));

      // ── TOBACCO RARITY ─────────────────────────────────────────────────────
      // Additive scoring with a base floor of 10.
      // Typical ranges:
      //   common in-production blend:                 10–20
      //   seasonal / limited / regional:              30–55
      //   discontinued (active manufacturer):         45–65
      //   discontinued from inactive manufacturer:   60–80
      //   multiple scarcity signals combined:        70–90+

      // Base floor for all tobacco blends
      score = 10;

      // Discontinued blends are increasingly scarce
      if (inputs.isDiscontinued) score += 38;

      // Manufacturer status
      if (inputs.isMakerInactive) score += 18;

      // Limited batch or small-run production
      if (inputs.isLimitedBatch) score += 20;

      // Seasonal release
      if (inputs.isSeasonal) score += 14;

      // Regional exclusivity (hard to import)
      if (inputs.isRegionalExclusive) score += 16;

      // Cellar age premium — aged stock that can no longer be easily replicated
      if (inputs.cellarAgeYears >= 10) score += 20;
      else if (inputs.cellarAgeYears >= 5) score += 12;
      else if (inputs.cellarAgeYears >= 2) score += 6;

      // Price signal — premium per-oz pricing indicates specialty/scarce blend
      if (inputs.pricePerOz >= 10) score += 15;
      else if (inputs.pricePerOz >= 6) score += 10;
      else if (inputs.pricePerOz >= 4) score += 5;

      // Blend type premiums (rare/specialty tobaccos)
      const rareBlendTypes = ['latakia', 'oriental', 'perique', 'virginia flake', 'navy flake', 'flake'];
      if (rareBlendTypes.some(t => (inputs.blendType || '').toLowerCase().includes(t))) score += 8;

      // Production status signals
      const status = (inputs.productionStatus || '').toLowerCase();
      if (status.includes('limited') || status.includes('seasonal')) score += 10;

    } else {
      // ── PIPE RARITY ──────────────────────────────────────────────────────────

      // Apply rarity override if manually set
      if (inputs.rarityScoreOverride > 0) return Math.min(100, Math.max(0, Math.round(inputs.rarityScoreOverride)));

      // ── PIPE RARITY (rewritten) ─────────────────────────────────────────────
      //
      // ALL pipes have a minimum floor of 50.  Scoring is layered:
      //   base floor + production type + maker status + characteristics.
      //
      // Target bands:
      //   common factory / standard production:              50–60
      //   respected but currently available artisan:         60–75
      //   limited artisan / special line / harder-to-find:   70–85
      //   one-of-a-kind custom artisan:                      80–95
      //   one-of-a-kind + deceased/retired maker/provenance: 90–100
      //
      // Rarity and replaceability are distinct — replaceability is handled
      // separately in computeReplacementDifficulty.
      const PIPE_RARITY_FLOOR = 50;

      // 1. Production type sets the starting base above the floor.
      //    Maker-config enrichment can upgrade 'factory' to 'standard_artisan'
      //    when the maker is known for handmade/artisan work.
      const prodType = inputs._effectiveProdType || 'factory';
      const makerCfg = resolvePipeMakerConfig(inputs.maker);

      // If maker config says this is a handmade maker but no explicit
      // production type was set, treat as standard_artisan for scoring.
      let effectiveProdType = prodType;
      if (makerCfg?.isHandmade && effectiveProdType === 'factory') {
        effectiveProdType = 'standard_artisan';
      }

      if (effectiveProdType === 'one_off') {
        // A one-of-a-kind pipe is definitionally rare.
        // Base of 82 means even without additional factors the score lands in
        // the 80–95 target band.
        score = 82;
      } else if (effectiveProdType === 'limited_artisan_batch') {
        // Additional factors bring this into the 70–85 band.
        score = 68;
      } else if (effectiveProdType === 'standard_artisan') {
        // Additional factors bring this into the 60–75 band.
        score = 60;
      } else {
        // Factory / unknown: floor only.
        score = PIPE_RARITY_FLOOR;
      }

      // 2. Maker status — strongest secondary driver.
      //    Item-level fields take precedence; fall back to maker config.
      const effectiveMakerDeceased = inputs.isMakerDeceased || makerCfg?.productionStatus === 'deceased';
      const effectiveMakerRetired  = inputs.isMakerRetired  || makerCfg?.productionStatus === 'retired';
      const effectiveMakerInactive = inputs.isMakerInactive || makerCfg?.productionStatus === 'inactive';

      if (effectiveMakerDeceased) {
        score += 15;
        // Artisan work from a deceased maker is doubly non-reproducible
        if (effectiveProdType !== 'factory') score += 5;
      } else if (effectiveMakerRetired) {
        score += 12;
        if (effectiveProdType !== 'factory') score += 3;
      } else if (effectiveMakerInactive) {
        score += 8;
      }

      // 3. Artisan tier / collectibility.
      //    Use explicit artisan_tier field; fall back to maker config.
      const effectiveArtisanTier = (inputs.artisanTier || makerCfg?.tier || '').toLowerCase();
      if (effectiveArtisanTier === 'prestige' || effectiveArtisanTier === 'master') score += 7;
      else if (effectiveArtisanTier === 'established') score += 4;
      else if (effectiveArtisanTier === 'emerging') score += 2;

      // 4. Premium maker recognition (applied independently of artisan-tier flag).
      const PREMIUM_MAKERS = [
        'dunhill', 'barling', 'comoy', 'sasieni', 'charatan', 'castello',
        'ardor', 'ser jacopo', 'radice', 'jirsa', 'jan zaloudek', 'kapet',
        'lars ivarsson', 'sixten ivarsson', 'w.o. larsen', 'bing & grondahl',
      ];
      const makerLower = (inputs.maker || '').toLowerCase();
      if (PREMIUM_MAKERS.some(m => makerLower.includes(m))) score += 6;

      // 5. Material premium (rare materials are harder to source / replace).
      const materialBoosts = { Meerschaum: 7, Morta: 5, Briar: 2, Clay: 1 };
      score += materialBoosts[inputs.bowlMaterial] || 0;

      // 6. Age / era premium.
      const yearNum = parseInt(inputs.yearMade, 10);
      if (!isNaN(yearNum)) {
        if (yearNum < 1940) score += 10;
        else if (yearNum < 1960) score += 7;
        else if (yearNum < 1980) score += 4;
        else if (yearNum < 2000) score += 2;
      }

      // 7. Condition bonus (well-preserved examples are rarer).
      const conditionLower = (inputs.condition || '').toLowerCase();
      if (conditionLower.includes('mint') || conditionLower.includes('nos')) score += 4;
      else if (conditionLower.includes('excellent')) score += 2;
      else if (conditionLower.includes('very good')) score += 1;

      // 8. Provenance / certification / grading.
      if (inputs.hasProvenance || inputs.isGraded) score += 5;

      // 9. Factory limited run (small boost for factory items with a limited release).
      if (inputs.isLimitedRun && effectiveProdType === 'factory') score += 5;

      // Enforce floor: no pipe may score below 50.
      score = Math.max(PIPE_RARITY_FLOOR, score);
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
 *
 * Replacement difficulty is computed separately from rarity.
 * A rare item is not automatically very hard to replace — current availability,
 * substitutability, and market frequency are separate variables.
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

    // Unicorn / ultra-limited with no current production: near-impossible to replace
    if (inputs.isUnicorn) return DIFFICULTY_LEVELS.VERY_HARD;
    if (isDiscontinued && inputs.producerStatus && inputs.producerStatus.toLowerCase().includes('closed')) return DIFFICULTY_LEVELS.VERY_HARD;
    if (isDiscontinued && (inputs.age >= 20 || rarity >= 75)) return DIFFICULTY_LEVELS.VERY_HARD;
    if (isDiscontinued || (inputs.age >= 25)) return DIFFICULTY_LEVELS.HARD;
    if (isLimited || (inputs.age >= 18)) return DIFFICULTY_LEVELS.HARD;
    if (inputs.isExportOnly || inputs.isExclusive) return DIFFICULTY_LEVELS.HARD;
    if (inputs.age >= 12 || rarity >= 50) return DIFFICULTY_LEVELS.MODERATE;
    if (inputs.isAllocated) return DIFFICULTY_LEVELS.MODERATE;
    return DIFFICULTY_LEVELS.EASY;
  }

  if (moduleKey === 'pipekeeper') {
    if (inputs.itemType === 'tobacco') {
      const status = (inputs.productionStatus || '').toLowerCase();
      const isDiscontinued = inputs.isDiscontinued || status.includes('discontinue');
      const isLimited = inputs.isLimitedBatch || status.includes('limited') || status.includes('seasonal');

      // Discontinued from an inactive manufacturer with no substitutes: very hard
      if (isDiscontinued && inputs.isMakerInactive) return DIFFICULTY_LEVELS.VERY_HARD;
      if (isDiscontinued && inputs.isRegionalExclusive) return DIFFICULTY_LEVELS.VERY_HARD;
      // Discontinued: hard (still findable on secondary market)
      if (isDiscontinued) return DIFFICULTY_LEVELS.HARD;
      // Inactive maker with limited stock still circulating
      if (inputs.isMakerInactive && isLimited) return DIFFICULTY_LEVELS.HARD;
      // Seasonal, limited, regional, or inactive maker still in business
      if (isLimited || inputs.isRegionalExclusive || inputs.isSeasonal) return DIFFICULTY_LEVELS.MODERATE;
      if (inputs.isMakerInactive) return DIFFICULTY_LEVELS.MODERATE;
      return DIFFICULTY_LEVELS.EASY;
    }

    // ── PIPE replacement difficulty ───────────────────────────────────────────
    // Rarity and replaceability are distinct concepts.
    // Rules:
    //   - one-of-a-kind → very_hard (by definition)
    //   - deceased/retired maker + artisan → very_hard / hard
    //   - factory pipes remain easier to replace
    //   - a handmade artisan pipe should never be "easy to replace"
    const prodType = inputs._effectiveProdType || 'factory';
    const makerCfgForDiff = resolvePipeMakerConfig(inputs.maker);

    // Effective maker status: item fields take precedence over config defaults.
    const effMakerDeceased = inputs.isMakerDeceased || makerCfgForDiff?.productionStatus === 'deceased';
    const effMakerRetired  = inputs.isMakerRetired  || makerCfgForDiff?.productionStatus === 'retired';
    const effMakerInactive = inputs.isMakerInactive || makerCfgForDiff?.productionStatus === 'inactive';

    // Effective production type: upgrade factory → standard_artisan when
    // the maker is known for handmade work and no explicit type is set.
    let effProdType = prodType;
    if (makerCfgForDiff?.isHandmade && effProdType === 'factory') {
      effProdType = 'standard_artisan';
    }

    // One-of-a-kind: by definition cannot be replaced
    if (effProdType === 'one_off' || inputs.isOneOfAKind) return DIFFICULTY_LEVELS.VERY_HARD;

    // Deceased maker + artisan work: no more supply is possible
    if (effMakerDeceased && (effProdType === 'limited_artisan_batch' || effProdType === 'standard_artisan')) {
      return DIFFICULTY_LEVELS.VERY_HARD;
    }

    // Deceased maker (factory work may still have surplus stock)
    if (effMakerDeceased) return DIFFICULTY_LEVELS.HARD;

    // Limited artisan batch from active/retired maker
    if (effProdType === 'limited_artisan_batch') return DIFFICULTY_LEVELS.HARD;

    // Retired maker: their pipes are still findable but increasingly scarce
    if (effMakerRetired && (effProdType === 'standard_artisan' || inputs.isHandmade)) {
      return DIFFICULTY_LEVELS.HARD;
    }
    if (effMakerRetired) return DIFFICULTY_LEVELS.MODERATE;
    // Inactive maker (company closed but not a retired/deceased artisan)
    if (effMakerInactive) return DIFFICULTY_LEVELS.MODERATE;

    // Premium maker or artisan-grade without the above flags
    const PREMIUM_MAKERS_DIFF = ['dunhill', 'barling', 'comoy', 'sasieni', 'charatan', 'castello', 'ardor'];
    const makerLower = (inputs.maker || '').toLowerCase();
    const isPremium = PREMIUM_MAKERS_DIFF.some(m => makerLower.includes(m));
    if (isPremium || effProdType === 'standard_artisan' || inputs.isHandmade) return DIFFICULTY_LEVELS.MODERATE;

    // Special materials: inherently limited supply
    if (inputs.bowlMaterial === 'Meerschaum' || inputs.bowlMaterial === 'Morta') return DIFFICULTY_LEVELS.MODERATE;

    return DIFFICULTY_LEVELS.EASY;
  }

  // Generic: rarity-based (adjusted for modules that may have a rarity floor)
  if (rarity >= 80) return DIFFICULTY_LEVELS.VERY_HARD;
  if (rarity >= 60) return DIFFICULTY_LEVELS.HARD;
  if (rarity >= 35) return DIFFICULTY_LEVELS.MODERATE;
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

    if (isVeryHard && rarity >= 85) {
      rationale.push('Extremely rare and irreplaceable — insure against loss or damage');
      rationale.push('Consider professional appraisal and proper storage');
      if (currentValue > 0) rationale.push(`Current value (~$${Math.round(currentValue)}) justifies formal coverage`);
      return { holdRecommendation: 'insure', rationale };
    }

    if (isVeryHard || rarity >= 80) {
      rationale.push('Rare or vintage pipe — preserve display quality');
      rationale.push('Active use may reduce collector value or risk damage');
      if (hasDuplicates) rationale.push('You have similar pipes — smoke those instead');
      return { holdRecommendation: 'preserve', rationale };
    }

    if (isHard || rarity >= 65) {
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

// ---------------------------------------------------------------------------
// 8. Shared valuation action helpers
// ---------------------------------------------------------------------------

/**
 * Build a snapshot record for saving to ItemValueSnapshot entity.
 * Call this from any detail page before creating the record.
 *
 * @param {object} item - The raw item record (pipe, blend, bottle, etc.)
 * @param {string} moduleKey - 'pipekeeper' | 'whiskeykeeper' | ...
 * @param {string} itemType - 'pipe' | 'tobacco' | 'bottle' | ...
 * @param {string} createdBy - User email
 * @param {object} [opts] - Optional overrides: { note, collectionContext, isAutoGenerated }
 * @returns {object} Record ready to pass to base44.entities.ItemValueSnapshot.create()
 */
export function buildItemValueSnapshotRecord(item, moduleKey, itemType, createdBy, opts = {}) {
  const snapshot = buildValuationSnapshot(item, moduleKey, opts.collectionContext || {});
  if (!snapshot) return null;

  const today = new Date().toISOString().slice(0, 10);
  const inputs = normalizeValuationInputs(item, moduleKey);

  return {
    module_key: moduleKey,
    item_type: itemType,
    item_id: item.id,
    created_by: createdBy,
    snapshot_date: opts.snapshotDate || today,
    computed_current_value: snapshot.currentValue || null,
    retail_value: inputs?.retailValue > 0 ? inputs.retailValue : null,
    market_value: inputs?.marketValue > 0 ? inputs.marketValue : null,
    collector_value: inputs?.collectorValue > 0 ? inputs.collectorValue : null,
    value_confidence: snapshot.confidence || 'low',
    source: snapshot.source || null,
    rarity_score: snapshot.rarityScore ?? null,
    replacement_difficulty: snapshot.replacementDifficulty || null,
    recommendation: snapshot.holdRecommendation || null,
    notes: opts.note || null,
    is_auto_generated: opts.isAutoGenerated || false,
  };
}

/**
 * Build a price observation record for saving to PriceObservation entity.
 * @param {string} moduleKey
 * @param {string} itemType - 'pipe' | 'tobacco' | 'bottle' | ...
 * @param {string} itemId
 * @param {string} createdBy
 * @param {object} observation - { observed_price, price_type, source_name, source_url, observed_date, condition_note, region, currency, ... }
 * @returns {object} Record ready to pass to base44.entities.PriceObservation.create()
 */
export function buildPriceObservationRecord(moduleKey, itemType, itemId, createdBy, observation) {
  const today = new Date().toISOString().slice(0, 10);
  return {
    module_key: moduleKey,
    item_type: itemType,
    item_id: itemId,
    created_by: createdBy,
    observed_price: Number(observation.observed_price),
    price_type: observation.price_type || 'retail',
    source_name: observation.source_name || null,
    source_url: observation.source_url || null,
    observed_date: observation.observed_date || today,
    condition_note: observation.condition_note || null,
    fill_level: observation.fill_level || null,
    region: observation.region || null,
    currency: observation.currency || 'USD',
    is_manual: true,
  };
}
