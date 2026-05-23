import { roundCurrency, toNumber } from '@/shared/utils/calculations/valuationUtils';

const STALE_VALUATION_DAYS = 180;
const REFRESH_AFTER_DAYS = 30;

export function getRemainingSticks(cigar) {
  const singles = toNumber(cigar?.singles_equivalent);
  if (singles && singles > 0) return singles;

  const qty = toNumber(cigar?.quantity);
  const cpp = toNumber(cigar?.cigars_per_package);
  if (qty && qty > 0 && cpp && cpp > 0) return qty * cpp;

  return qty && qty > 0 ? qty : 0;
}

function getBasisSticks(cigar, remainingSticks) {
  const initial = toNumber(cigar?.initial_quantity);
  if (initial && initial > 0) return initial;
  return remainingSticks;
}

function getPurchasePerStick(cigar, basisSticks) {
  const purchasePrice = toNumber(cigar?.purchase_price);
  if (!purchasePrice || purchasePrice <= 0) return null;

  const priceType = cigar?.purchase_price_type || 'total_paid';
  const packageSize = toNumber(cigar?.cigars_per_package);

  if (priceType === 'single') return purchasePrice;
  if ((priceType === 'pack' || priceType === 'box' || priceType === 'bundle') && packageSize && packageSize > 0) {
    return purchasePrice / packageSize;
  }
  if (basisSticks && basisSticks > 0) return purchasePrice / basisSticks;
  return null;
}

function getGuidedMultiplier(cigar) {
  let multiplier = 1;

  const productionStatus = String(cigar?.production_status || '').toLowerCase();
  if (productionStatus === 'limited') multiplier += 0.12;
  if (productionStatus === 'discontinued') multiplier += 0.15;
  if (productionStatus === 'seasonal') multiplier += 0.06;

  const rating = toNumber(cigar?.rating);
  if (rating && rating >= 4.5) multiplier += 0.08;
  else if (rating && rating >= 4) multiplier += 0.05;

  if (cigar?.is_favorite) multiplier += 0.04;

  const agingStart = cigar?.aging_start_date ? new Date(cigar.aging_start_date) : null;
  if (agingStart && !Number.isNaN(agingStart.getTime())) {
    const ageDays = Math.max(0, (Date.now() - agingStart.getTime()) / (1000 * 60 * 60 * 24));
    if (ageDays >= 720) multiplier += 0.08;
    else if (ageDays >= 365) multiplier += 0.05;
    else if (ageDays >= 180) multiplier += 0.03;
  }

  return multiplier;
}

export function normalizeCigarValuationConfidence(value) {
  const v = String(value || '').toLowerCase().trim();
  return ['high', 'medium', 'low'].includes(v) ? v : 'low';
}

export function shouldRefreshCigarValuation(cigar) {
  if (!cigar) return true;
  if (cigar.manual_valuation_enabled) return false;

  const hasMarketValue = Number(cigar.market_estimated_unit_value) > 0;
  if (!hasMarketValue) return true;

  const confidence = normalizeCigarValuationConfidence(
    cigar.valuation_confidence || cigar.market_valuation_confidence,
  );
  if (confidence === 'low') return true;

  const updatedAt = cigar.valuation_updated_at || cigar.market_valuation_updated_at;
  if (!updatedAt) return true;

  const updatedDate = new Date(updatedAt);
  if (Number.isNaN(updatedDate.getTime())) return true;

  const daysSince = (Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince > REFRESH_AFTER_DAYS;
}

export function deriveCigarValuationPatch(cigar, enrichmentResult) {
  if (!cigar || !enrichmentResult) return {};
  if (cigar.manual_valuation_enabled) return {};

  const sticks = getRemainingSticks(cigar);
  const now = new Date().toISOString();

  const inferredUnit =
    Number(enrichmentResult.estimated_unit_value) > 0
      ? Number(enrichmentResult.estimated_unit_value)
      : Number(enrichmentResult.msrp_per_stick) > 0
        ? Number(enrichmentResult.msrp_per_stick)
        : null;

  if (!inferredUnit) return {};

  const totalValue = roundCurrency(inferredUnit * sticks);
  const replacementCost = totalValue;

  const confidence = normalizeCigarValuationConfidence(enrichmentResult.valuation_confidence);
  const source = String(enrichmentResult.valuation_source || '').trim() || 'Market reference';
  const notes = String(enrichmentResult.valuation_notes || '').trim() || null;
  const comparableCount =
    Number(enrichmentResult.comparable_count) > 0
      ? Math.round(Number(enrichmentResult.comparable_count))
      : 1;

  return {
    market_estimated_unit_value: inferredUnit,
    market_estimated_total_value: totalValue,
    market_replacement_cost_estimate: replacementCost,
    market_valuation_source: source,
    market_valuation_confidence: confidence,
    market_valuation_updated_at: now,
    market_comparable_count: comparableCount,
    valuation_source: source,
    valuation_confidence: confidence,
    valuation_notes: notes,
    valuation_updated_at: now,
  };
}

export function calculateCigarValue(cigar) {
  if (!cigar) {
    return {
      remainingSticks: 0,
      basisSticks: 0,
      purchasePerStick: null,
      perStickCostBasis: null,
      remainingCostBasis: null,
      estimatedUnitValue: null,
      estimatedTotalValue: null,
      replacementCostEstimate: null,
      confidenceScore: 'low',
      source: 'missing',
      sourceLabel: 'Missing valuation',
      isMissing: true,
      isStale: false,
      needsReview: true,
      valuationUpdatedAt: null,
    };
  }

  const remainingSticks = getRemainingSticks(cigar);
  const basisSticks = getBasisSticks(cigar, remainingSticks);
  const purchasePerStickRaw = getPurchasePerStick(cigar, basisSticks);
  const perStickCostBasis = roundCurrency(purchasePerStickRaw);
  const remainingCostBasis = roundCurrency(
    perStickCostBasis != null && remainingSticks > 0 ? perStickCostBasis * remainingSticks : null
  );

  const manualOverrideEnabled = Boolean(cigar?.manual_valuation_enabled);
  const manualOverridePerStick = toNumber(cigar?.manual_valuation_override);
  const manualUnit = toNumber(cigar?.estimated_unit_value ?? cigar?.estimated_value);
  const manualTotal = toNumber(cigar?.estimated_total_value);
  const manualReplacement = toNumber(cigar?.replacement_cost_estimate);
  const marketUnit = toNumber(cigar?.market_estimated_unit_value);
  const marketTotal = toNumber(cigar?.market_estimated_total_value);
  const marketReplacement = toNumber(cigar?.market_replacement_cost_estimate);

  let estimatedUnitValue = null;
  let estimatedTotalValue = null;
  let replacementCostEstimate = null;
  let confidenceScore = 'low';
  let source = 'missing';

  if (manualOverrideEnabled && manualOverridePerStick && manualOverridePerStick > 0) {
    estimatedUnitValue = manualOverridePerStick;
    estimatedTotalValue = remainingSticks > 0 ? manualOverridePerStick * remainingSticks : null;
    replacementCostEstimate = basisSticks > 0 ? manualOverridePerStick * basisSticks : estimatedTotalValue;
    source = 'manual_override';
    confidenceScore = cigar?.valuation_confidence || 'high';
  } else if (manualUnit && manualUnit > 0) {
    estimatedUnitValue = manualUnit;
    estimatedTotalValue = manualTotal && manualTotal > 0 ? manualTotal : (remainingSticks > 0 ? manualUnit * remainingSticks : null);
    replacementCostEstimate = manualReplacement && manualReplacement > 0
      ? manualReplacement
      : (basisSticks > 0 ? manualUnit * basisSticks : estimatedTotalValue);
    source = 'manual_entry';
    confidenceScore = cigar?.valuation_confidence || 'high';
  } else if (manualTotal && manualTotal > 0) {
    estimatedTotalValue = manualTotal;
    estimatedUnitValue = remainingSticks > 0 ? manualTotal / remainingSticks : null;
    replacementCostEstimate = manualReplacement && manualReplacement > 0 ? manualReplacement : manualTotal;
    source = 'manual_entry';
    confidenceScore = cigar?.valuation_confidence || 'high';
  } else if ((marketUnit && marketUnit > 0) || (marketTotal && marketTotal > 0)) {
    estimatedUnitValue = marketUnit && marketUnit > 0
      ? marketUnit
      : (remainingSticks > 0 ? marketTotal / remainingSticks : null);
    estimatedTotalValue = marketTotal && marketTotal > 0
      ? marketTotal
      : (estimatedUnitValue != null && remainingSticks > 0 ? estimatedUnitValue * remainingSticks : null);
    replacementCostEstimate = marketReplacement && marketReplacement > 0
      ? marketReplacement
      : (estimatedUnitValue != null && basisSticks > 0 ? estimatedUnitValue * basisSticks : estimatedTotalValue);
    source = 'market_derived';
    confidenceScore = cigar?.market_valuation_confidence || 'low';
  } else if (perStickCostBasis && perStickCostBasis > 0 && remainingSticks > 0) {
    const guidedPerStick = perStickCostBasis * getGuidedMultiplier(cigar);
    estimatedUnitValue = guidedPerStick;
    estimatedTotalValue = guidedPerStick * remainingSticks;
    replacementCostEstimate = basisSticks > 0 ? guidedPerStick * basisSticks : estimatedTotalValue;
    source = 'guided_estimate';
    confidenceScore = 'medium';
  }

  estimatedUnitValue = roundCurrency(estimatedUnitValue);
  estimatedTotalValue = roundCurrency(estimatedTotalValue);
  const shouldUseManualReplacement = source === 'manual_entry' || source === 'manual_override';
  replacementCostEstimate = roundCurrency(
    shouldUseManualReplacement && manualReplacement && manualReplacement > 0
      ? manualReplacement
      : replacementCostEstimate
  );

  const valuationUpdatedAt = source === 'market_derived'
    ? (cigar?.market_valuation_updated_at || cigar?.valuation_updated_at || null)
    : (cigar?.valuation_updated_at || cigar?.market_valuation_updated_at || null);
  const updatedDate = valuationUpdatedAt ? new Date(valuationUpdatedAt) : null;
  const isStale = Boolean(
    updatedDate &&
      !Number.isNaN(updatedDate.getTime()) &&
      (Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24) > STALE_VALUATION_DAYS
  );
  const isMissing = !(estimatedUnitValue || estimatedTotalValue || replacementCostEstimate);
  const needsReview = isMissing || isStale || confidenceScore === 'low';

  const sourceLabelMap = {
    manual_override: 'Manual override',
    manual_entry: 'User entered',
    market_derived: 'Market derived',
    guided_estimate: 'Guided estimate',
    missing: 'Missing valuation',
  };

  return {
    remainingSticks,
    basisSticks,
    purchasePerStick: perStickCostBasis,
    perStickCostBasis,
    remainingCostBasis,
    estimatedUnitValue,
    estimatedTotalValue,
    replacementCostEstimate,
    confidenceScore,
    source,
    sourceLabel: sourceLabelMap[source] || sourceLabelMap.missing,
    isMissing,
    isStale,
    needsReview,
    valuationUpdatedAt,
  };
}
