/**
 * normalizeIdentifiedItem.js
 *
 * Converts raw LLM identification results into the canonical shared output
 * shape used across UPC lookups, photo identification, and quick-add flows.
 *
 * Canonical output shape:
 * {
 *   itemType: "pipe" | "blend" | "bottle",
 *   confidence: "low" | "medium" | "high",
 *   confidenceScore: number,        // 0–100
 *   candidates: Array<NormalizedCandidate>,
 *   selected: NormalizedCandidate | null,
 * }
 *
 * NormalizedCandidate:
 * {
 *   name:          string,
 *   maker:         string,
 *   category:      string,
 *   details:       object,   // item-type-specific detail fields
 *   valuationSeed: object,   // fields usable by the shared valuation engine
 *   source:        "upc" | "photo" | "search",
 * }
 */

// ── Confidence helpers ────────────────────────────────────────────────────────

/**
 * Convert a textual or numeric confidence descriptor from the LLM into the
 * three-tier system used throughout the app.
 */
export function resolveConfidenceLevel(rawConfidence) {
  if (typeof rawConfidence === 'number') {
    if (rawConfidence >= 80) return 'high';
    if (rawConfidence >= 45) return 'medium';
    return 'low';
  }
  if (typeof rawConfidence === 'string') {
    const lower = rawConfidence.toLowerCase();
    if (lower === 'high' || lower === 'certain' || lower === 'confirmed') return 'high';
    if (lower === 'medium' || lower === 'moderate' || lower === 'likely') return 'medium';
  }
  return 'low';
}

export function confidenceToScore(level) {
  if (level === 'high') return 90;
  if (level === 'medium') return 60;
  return 20;
}

// ── Per-type normalization ────────────────────────────────────────────────────

function normalizePipe(raw, source) {
  const maker = raw.identified_maker || raw.maker || '';
  const model = raw.model_or_series || raw.model || raw.line_or_series || raw.name || '';
  const name = model ? `${maker} ${model}`.trim() : maker;

  const details = {
    line_series: raw.line_or_series || raw.model_or_series || raw.model || '',
    shape_number: raw.shape_number || raw.shape_code || '',
    shape: raw.shape || '',
    bowlStyle: raw.bowlStyle || raw.bowl_style || '',
    shankShape: raw.shankShape || raw.shank_shape || '',
    bend: raw.bend || '',
    sizeClass: raw.sizeClass || raw.size_class || '',
    bowl_material: raw.bowl_material || '',
    material: raw.material || '',
    stem_material: raw.stem_material || '',
    stem_logo: raw.stem_logo || '',
    finish: raw.finish || '',
    stamping: Array.isArray(raw.stampings)
      ? raw.stampings.join(', ')
      : raw.stamping_text || raw.stamping || '',
    year_made: raw.year_made || raw.estimated_era || raw.era_date_range || '',
    era_date_range: raw.era_date_range || raw.estimated_era || '',
    condition: raw.condition || '',
    condition_notes: raw.condition_notes || '',
    dimensions: raw.dimensions || '',
    country_of_origin: raw.country_of_origin || raw.country || '',
    notes: raw.identification_notes || raw.notes || '',
    evidence_used: Array.isArray(raw.evidence_used) ? raw.evidence_used : [],
    missing_fields: Array.isArray(raw.missing_fields) ? raw.missing_fields : [],
    uncertain_fields: Array.isArray(raw.uncertain_fields) ? raw.uncertain_fields : [],
    photos: Array.isArray(raw.photos) ? raw.photos : [],
    barcode: raw._inputBarcode || raw.barcode || '',
    upc: raw.upc || '',
    ean: raw.ean || '',
  };

  const valuationSeed = {
    estimated_value: raw.estimated_value ?? null,
    estimated_value_range: raw.estimated_value_range || null,
    handmade_hint: raw.handmade_hint || null,
    line_series: details.line_series || null,
    maker,
    purchase_price: raw.original_price ?? raw.purchase_price ?? null,
  };

  return {
    name,
    maker,
    category: details.shape,
    details,
    valuationSeed,
    source,
    candidateConfidence: resolveConfidenceLevel(raw.confidence),
    candidateConfidenceScore: typeof raw.confidence_score === 'number' ? raw.confidence_score : undefined,
    evidence: details.evidence_used,
  };
}

function normalizeBlend(raw, source) {
  const maker = raw.manufacturer || raw.maker || '';
  const name = raw.name || raw.blend_name || '';

  const details = {
    blend_type: raw.blend_type || raw.blend_family || '',
    strength: raw.strength || '',
    cut: raw.cut || '',
    flavor_notes: Array.isArray(raw.flavor_notes) ? raw.flavor_notes : [],
    production_status: raw.production_status || raw.discontinued_hint || '',
    packaging_size: raw.packaging_size || raw.size || '',
    region: raw.region || raw.country || '',
    country: raw.country || '',
    barcode: raw._inputBarcode || raw.barcode || '',
    upc: raw.upc || '',
    ean: raw.ean || '',
  };

  const valuationSeed = {
    retail_price: raw.retail_price ?? raw.estimated_price ?? raw.purchase_price ?? null,
    discontinued_hint: raw.discontinued_hint || raw.production_status || null,
    packaging_size: details.packaging_size || null,
    region_exclusivity: raw.region_exclusivity || null,
    maker,
  };

  return { name, maker, category: details.blend_type, details, valuationSeed, source };
}

function normalizeBottle(raw, source) {
  const maker = raw.distillery || raw.maker || '';
  const name = raw.name || raw.bottle_name || '';

  const details = {
    type: raw.type || raw.whiskey_type || '',
    age: raw.age ?? null,
    abv: raw.abv ?? null,
    region: raw.region || '',
    country: raw.country || '',
    bottle_size: raw.bottle_size || '750ml',
    edition: raw.special_edition || raw.edition || '',
    batch: raw.batch || '',
    tasting_notes: raw.tasting_notes || '',
    barcode: raw._inputBarcode || raw.barcode || '',
    upc: raw.upc || '',
    ean: raw.ean || '',
  };

  const valuationSeed = {
    retail_price: raw.estimated_price ?? raw.retail_price ?? null,
    edition: details.edition || null,
    rarity_hint: raw.rarity_hint || null,
    replacement_hint: raw.replacement_hint || null,
    maker,
    purchase_price: raw.purchase_price ?? null,
  };

  return { name, maker, category: details.type, details, valuationSeed, source };
}

function normalizeCigar(raw, source) {
  const maker = raw.brand || raw.manufacturer || raw.maker || '';
  const name = raw.name || raw.cigar_name || '';

  const details = {
    brand: raw.brand || raw.manufacturer || '',
    line: raw.line || raw.series || '',
    vitola: raw.vitola || raw.size || '',
    wrapper: raw.wrapper || '',
    binder: raw.binder || '',
    filler: raw.filler || '',
    country_of_origin: raw.country_of_origin || raw.country || '',
    factory: raw.factory || '',
    body: raw.body || '',
    strength: raw.strength || '',
    flavor_notes: Array.isArray(raw.flavor_notes) ? raw.flavor_notes : [],
    production_status: raw.production_status || '',
    release_type: raw.release_type || '',
    length_inches: raw.length_inches ?? null,
    ring_gauge: raw.ring_gauge ?? null,
    box_date: raw.box_date || '',
    barcode: raw._inputBarcode || raw.barcode || '',
    upc: raw.upc || '',
    ean: raw.ean || '',
  };

  const valuationSeed = {
    retail_price: raw.retail_price ?? raw.estimated_price ?? null,
    production_status: details.production_status || null,
    release_type: details.release_type || null,
    rarity_hint: raw.rarity_hint || raw.limited_hint || null,
    maker,
  };

  return { name, maker, category: details.vitola || details.line, details, valuationSeed, source };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Normalize a raw wine LLM result into the canonical candidate shape.
 */
function normalizeWine(raw, source = 'search') {
  const producer = raw.producer || raw.winery || '';
  const name = raw.name || raw.wine_name || '';

  const details = {
    producer,
    vintage: raw.vintage ? Number(raw.vintage) : null,
    varietal: raw.varietal || raw.grape_variety || '',
    region: raw.region || '',
    appellation: raw.appellation || '',
    style: raw.style || raw.wine_type || '',
    abv: raw.abv ? Number(raw.abv) : null,
    description: raw.description || '',
    barcode: raw._inputBarcode || raw.barcode || '',
    upc: raw.upc || '',
    ean: raw.ean || '',
  };

  const valuationSeed = {
    retail_price: raw.retail_price ?? raw.estimated_price ?? null,
    vintage: details.vintage,
    region: details.region,
    varietal: details.varietal,
    producer,
  };

  return { name, maker: producer, category: details.varietal || details.style, details, valuationSeed, source };
}

/**
 * Normalize a raw LLM result into the canonical candidate shape.
 *
 * @param {object} rawResult - Raw LLM response object for a single item
 * @param {"pipe"|"blend"|"bottle"|"cigar"|"wine"} itemType
 * @param {"upc"|"photo"|"search"} source
 * @returns {NormalizedCandidate}
 */
export function normalizeSingleCandidate(rawResult, itemType, source = 'search') {
  if (!rawResult) return null;
  if (itemType === 'pipe') return normalizePipe(rawResult, source);
  if (itemType === 'blend') return normalizeBlend(rawResult, source);
  if (itemType === 'bottle') return normalizeBottle(rawResult, source);
  if (itemType === 'cigar') return normalizeCigar(rawResult, source);
  if (itemType === 'wine') return normalizeWine(rawResult, source);
  return { name: rawResult.name || '', maker: '', category: '', details: rawResult, valuationSeed: {}, source };
}

/**
 * Normalize a full LLM identification response into the canonical output shape.
 *
 * @param {object} rawResult   - Raw LLM response (single item or {candidates:[...]})
 * @param {"pipe"|"blend"|"bottle"|"cigar"} itemType
 * @param {"upc"|"photo"|"search"} source
 * @returns {IdentifyResult}
 */
export function normalizeIdentifiedItem(rawResult, itemType, source = 'search') {
  if (!rawResult) {
    return {
      itemType,
      confidence: 'low',
      confidenceScore: 0,
      candidates: [],
      selected: null,
    };
  }

  // Support both single-item and multi-candidate responses
  const rawCandidates = Array.isArray(rawResult.candidates)
    ? rawResult.candidates
    : Array.isArray(rawResult.items)
    ? rawResult.items
    : [rawResult];

  const candidates = rawCandidates
    .filter(Boolean)
    .map((c) => normalizeSingleCandidate(c, itemType, source));

  candidates.sort((a, b) => {
    const scoreA = Number(a?.candidateConfidenceScore ?? -1);
    const scoreB = Number(b?.candidateConfidenceScore ?? -1);
    return scoreB - scoreA;
  });

  const confidence = resolveConfidenceLevel(rawResult.confidence);
  const confidenceScore = typeof rawResult.confidence_score === 'number'
    ? rawResult.confidence_score
    : confidenceToScore(confidence);

  return {
    itemType,
    confidence,
    confidenceScore,
    candidates,
    selected: candidates[0] || null,
  };
}

// ── Quick-add payload builder ─────────────────────────────────────────────────

/**
 * Convert a normalized identified item (or candidate) into a flat object
 * ready to prefill a quick-add or manual form.
 *
 * @param {NormalizedCandidate} identifiedItem
 * @param {"pipe"|"blend"|"bottle"|"cigar"} itemType
 * @returns {object}
 */
export function buildQuickAddPayload(identifiedItem, itemType) {
  if (!identifiedItem) return {};
  const { name, maker, details = {}, valuationSeed = {} } = identifiedItem;

  const base = { name };

  if (itemType === 'pipe') {
    return {
      ...base,
      maker,
      shape: details.shape,
      bowlStyle: details.bowlStyle,
      shankShape: details.shankShape,
      bend: details.bend,
      sizeClass: details.sizeClass,
      bowl_material: details.bowl_material,
      stem_material: details.stem_material,
      finish: details.finish,
      stamping: details.stamping,
      year_made: details.year_made,
      condition: details.condition,
      country_of_origin: details.country_of_origin,
      notes: details.notes,
      line_series: details.line_series,
      shape_number: details.shape_number,
      stem_logo: details.stem_logo,
      photos: details.photos,
      estimated_value: valuationSeed.estimated_value ?? undefined,
      purchase_price: valuationSeed.purchase_price ?? undefined,
      barcode: details.barcode || undefined,
      upc: details.upc || undefined,
      ean: details.ean || undefined,
    };
  }

  if (itemType === 'blend') {
    return {
      ...base,
      manufacturer: maker,
      blend_type: details.blend_type,
      strength: details.strength,
      cut: details.cut,
      flavor_notes: details.flavor_notes,
      production_status: details.production_status,
      notes: details.notes,
      purchase_price: valuationSeed.retail_price ?? undefined,
      barcode: details.barcode || undefined,
      upc: details.upc || undefined,
      ean: details.ean || undefined,
    };
  }

  if (itemType === 'bottle') {
    return {
      ...base,
      distillery: maker,
      type: details.type,
      age: details.age,
      abv: details.abv,
      region: details.region,
      country: details.country,
      bottle_size: details.bottle_size,
      notes: details.tasting_notes,
      purchase_price: valuationSeed.retail_price ?? undefined,
      barcode: details.barcode || undefined,
      upc: details.upc || undefined,
      ean: details.ean || undefined,
    };
  }

  if (itemType === 'cigar') {
    return {
      ...base,
      brand: maker,
      line: details.line,
      vitola: details.vitola,
      wrapper: details.wrapper,
      binder: details.binder,
      filler: details.filler,
      country_of_origin: details.country_of_origin,
      factory: details.factory,
      body: details.body,
      strength: details.strength,
      flavor_notes: details.flavor_notes,
      production_status: details.production_status,
      release_type: details.release_type,
      barcode: details.barcode || undefined,
      upc: details.upc || undefined,
      ean: details.ean || undefined,
      purchase_price: valuationSeed.retail_price ?? undefined,
    };
  }

  if (itemType === 'wine') {
    return {
      ...base,
      producer: maker,
      vintage: details.vintage ?? undefined,
      varietal: details.varietal || undefined,
      region: details.region || undefined,
      appellation: details.appellation || undefined,
      style: details.style || undefined,
      abv: details.abv ?? undefined,
      notes: details.description || undefined,
      purchase_price: valuationSeed.retail_price ?? undefined,
      barcode: details.barcode || undefined,
      upc: details.upc || undefined,
      ean: details.ean || undefined,
    };
  }

  return base;
}

// ── Valuation seed builder ────────────────────────────────────────────────────

/**
 * Extract fields from an identified item that can be consumed by the shared
 * valuation engine (platform/valuation.js) or module-specific value engines.
 *
 * Does NOT introduce new valuation formulas — only surfaces recognized data.
 *
 * @param {NormalizedCandidate} identifiedItem
 * @param {"pipe"|"blend"|"bottle"|"cigar"} itemType
 * @returns {object}
 */
export function buildValuationSeedData(identifiedItem, itemType) {
  if (!identifiedItem) return {};
  const { valuationSeed = {}, details = {} } = identifiedItem;

  if (itemType === 'pipe') {
    return {
      estimated_value: valuationSeed.estimated_value ?? null,
      purchase_price: valuationSeed.purchase_price ?? null,
      value_source: 'identify',
      value_confidence: valuationSeed.estimated_value ? 'medium' : 'low',
      // Extra context fields the pipe value engine can use
      maker: valuationSeed.maker || null,
      line_series: valuationSeed.line_series || null,
      handmade_hint: valuationSeed.handmade_hint || null,
    };
  }

  if (itemType === 'blend') {
    return {
      purchase_price: valuationSeed.retail_price ?? null,
      value_source: 'identify',
      value_confidence: valuationSeed.retail_price ? 'medium' : 'low',
      // Extra context
      discontinued_hint: valuationSeed.discontinued_hint || null,
      packaging_size: valuationSeed.packaging_size || null,
      region_exclusivity: valuationSeed.region_exclusivity || null,
    };
  }

  if (itemType === 'bottle') {
    return {
      purchase_price: valuationSeed.retail_price ?? valuationSeed.purchase_price ?? null,
      value_source: 'identify',
      value_confidence: valuationSeed.retail_price ? 'medium' : 'low',
      // Extra context
      edition: valuationSeed.edition || null,
      rarity_hint: valuationSeed.rarity_hint || null,
      replacement_hint: valuationSeed.replacement_hint || null,
    };
  }

  if (itemType === 'cigar') {
    return {
      purchase_price: valuationSeed.retail_price ?? null,
      value_source: 'identify',
      value_confidence: valuationSeed.retail_price ? 'medium' : 'low',
      // Extra context
      production_status: valuationSeed.production_status || null,
      release_type: valuationSeed.release_type || null,
      rarity_hint: valuationSeed.rarity_hint || null,
      maker: valuationSeed.maker || null,
    };
  }

  if (itemType === 'wine') {
    return {
      purchase_price: valuationSeed.retail_price ?? null,
      value_source: 'identify',
      value_confidence: valuationSeed.retail_price ? 'medium' : 'low',
      vintage: valuationSeed.vintage || null,
      region: valuationSeed.region || null,
      varietal: valuationSeed.varietal || null,
      producer: valuationSeed.producer || null,
    };
  }

  return {};
}
