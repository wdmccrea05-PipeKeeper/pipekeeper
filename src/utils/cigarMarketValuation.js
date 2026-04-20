function toNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function roundMoney(value) {
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getRemainingSticks(cigar) {
  const singles = toNum(cigar?.singles_equivalent);
  if (singles > 0) return singles;

  const qty = toNum(cigar?.quantity);
  const cpp = toNum(cigar?.cigars_per_package);
  if (qty > 0 && cpp > 0) return qty * cpp;
  return qty > 0 ? qty : 0;
}

function getBasisSticks(cigar, remainingSticks) {
  const initial = toNum(cigar?.initial_quantity);
  return initial > 0 ? initial : remainingSticks;
}

function inferObservationUnitPrice(observation, cigar) {
  const observed = toNum(observation?.observed_price);
  if (observed <= 0) return null;

  const packageSize = Math.max(1, toNum(cigar?.cigars_per_package) || 1);
  const text = `${observation?.condition_note || ''} ${observation?.source_name || ''}`.toLowerCase();
  const mentionsSingle = /\bsingle\b|per\s*stick|stick\b/.test(text);
  const mentionsPackage = /\bbox\b|bundle|pack\b|5\s*pack/.test(text);

  const priceType = String(observation?.price_type || '').toLowerCase();
  const packageLikelyByPrice = packageSize > 1 && observed >= 20;
  const treatAsPackage = packageSize > 1 && !mentionsSingle && (mentionsPackage || packageLikelyByPrice);

  const unitPrice = treatAsPackage ? observed / packageSize : observed;
  let certainty = 1;
  if (treatAsPackage && !mentionsPackage) certainty = 0.75;
  if (!treatAsPackage && packageLikelyByPrice && !mentionsSingle) certainty = 0.7;

  const trustByType = {
    retail: 1,
    aftermarket: 0.85,
    auction: 0.8,
    collector: 0.75,
    estimate: 0.55,
    private_sale: 0.65,
    other: 0.5,
  };
  const trust = trustByType[priceType] ?? 0.5;

  const observedDate = parseDate(observation?.observed_date);
  let recency = 0.45;
  if (observedDate) {
    const ageDays = (Date.now() - observedDate.getTime()) / MS_PER_DAY;
    if (ageDays <= 60) recency = 1;
    else if (ageDays <= 180) recency = 0.8;
    else if (ageDays <= 365) recency = 0.6;
  }

  return {
    unitPrice,
    weight: trust * recency * certainty,
    observedDate,
    sourceType: priceType || 'other',
  };
}

function snapshotUnitPrice(snapshot, remainingSticks) {
  const total = toNum(
    snapshot?.computed_current_value ??
    snapshot?.computed_value ??
    snapshot?.market_value ??
    snapshot?.collector_value ??
    snapshot?.retail_value
  );
  if (total <= 0 || remainingSticks <= 0) return null;

  const observedDate = parseDate(snapshot?.snapshot_date);
  return {
    unitPrice: total / remainingSticks,
    weight: 0.6,
    observedDate,
    sourceType: 'snapshot',
  };
}

function weightedAverage(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const totalWeight = candidates.reduce((sum, c) => sum + toNum(c.weight), 0);
  if (totalWeight <= 0) return null;
  const weighted = candidates.reduce((sum, c) => sum + (toNum(c.unitPrice) * toNum(c.weight)), 0);
  return weighted / totalWeight;
}

function sampleStdDev(values) {
  if (!Array.isArray(values) || values.length < 2) return 0;
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + ((v - avg) ** 2), 0) / (values.length - 1);
  return Math.sqrt(Math.max(0, variance));
}

function resolveConfidence(candidates, weightedUnit) {
  if (!candidates.length || !Number.isFinite(weightedUnit) || weightedUnit <= 0) return 'low';
  const avgWeight = candidates.reduce((s, c) => s + toNum(c.weight), 0) / candidates.length;
  const spread = sampleStdDev(candidates.map((c) => toNum(c.unitPrice))) / weightedUnit;
  if (candidates.length >= 4 && avgWeight >= 0.75 && spread <= 0.25) return 'high';
  if (candidates.length >= 2 && avgWeight >= 0.5 && spread <= 0.45) return 'medium';
  return 'low';
}

function resolveSourceLabel(candidates) {
  const types = [...new Set(candidates.map((c) => c.sourceType).filter(Boolean))];
  if (types.length === 0) return null;
  if (types.length === 1) {
    const t = types[0];
    if (t === 'retail') return 'Retail listings';
    if (t === 'aftermarket' || t === 'auction') return 'Comparable listings';
    if (t === 'collector') return 'Collector references';
    if (t === 'snapshot') return 'Value snapshot trend';
    if (t === 'estimate') return 'Estimate references';
  }
  return 'Market comparables';
}

export function deriveCigarMarketValuation(cigar, { observations = [], snapshots = [] } = {}) {
  const remainingSticks = getRemainingSticks(cigar);
  const basisSticks = getBasisSticks(cigar, remainingSticks);
  if (remainingSticks <= 0) return null;

  const candidates = [];
  for (const observation of observations || []) {
    const inferred = inferObservationUnitPrice(observation, cigar);
    if (inferred?.unitPrice > 0) candidates.push(inferred);
  }
  for (const snapshot of snapshots || []) {
    const inferred = snapshotUnitPrice(snapshot, remainingSticks);
    if (inferred?.unitPrice > 0) candidates.push(inferred);
  }

  const weightedUnit = weightedAverage(candidates);
  if (!Number.isFinite(weightedUnit) || weightedUnit <= 0) return null;

  const confidence = resolveConfidence(candidates, weightedUnit);
  const newestDate = candidates
    .map((c) => c.observedDate)
    .filter(Boolean)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return {
    estimatedMarketUnitValue: roundMoney(weightedUnit),
    estimatedMarketTotalValue: roundMoney(weightedUnit * remainingSticks),
    replacementCostEstimate: roundMoney(weightedUnit * basisSticks),
    source: resolveSourceLabel(candidates),
    confidence,
    updatedAt: newestDate ? newestDate.toISOString() : new Date().toISOString(),
    comparableCount: candidates.length,
    remainingSticks,
  };
}

export function buildCigarMarketValuationPatch(cigar, derivation) {
  if (!cigar || !derivation?.estimatedMarketUnitValue || !derivation?.estimatedMarketTotalValue) {
    return null;
  }

  return {
    market_estimated_unit_value: derivation.estimatedMarketUnitValue,
    market_estimated_total_value: derivation.estimatedMarketTotalValue,
    market_replacement_cost_estimate: derivation.replacementCostEstimate,
    market_valuation_source: derivation.source || null,
    market_valuation_confidence: derivation.confidence || 'low',
    market_valuation_updated_at: derivation.updatedAt || new Date().toISOString(),
    market_comparable_count: derivation.comparableCount || 0,
  };
}
