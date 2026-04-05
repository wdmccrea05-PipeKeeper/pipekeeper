import React, { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, AlertCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/components/utils/localeFormatters';
import { buildValuationSnapshot, PIPE_PREMIUM_MAKERS } from '@/components/valuation/valueEngine';

/**
 * ValuationCredibility - Transparent valuation display with reference signals,
 * confidence level, and disclaimer. Used across PipeKeeper and WhiskeyKeeper.
 */

const CONFIDENCE_CONFIG = {
  High: {
    color: '#4ade80',
    bg: 'rgba(74, 222, 128, 0.1)',
    border: 'rgba(74, 222, 128, 0.3)',
    label: 'High Confidence',
  },
  Medium: {
    color: '#fbbf24',
    bg: 'rgba(251, 191, 36, 0.1)',
    border: 'rgba(251, 191, 36, 0.3)',
    label: 'Medium Confidence',
  },
  Low: {
    color: '#f87171',
    bg: 'rgba(248, 113, 113, 0.1)',
    border: 'rgba(248, 113, 113, 0.3)',
    label: 'Low Confidence',
  },
};

/**
 * Calculates a pipe valuation score from available pipe data.
 * Delegates to the shared valueEngine for all value, rarity, difficulty, and recommendation logic.
 * Returns { value, confidence, signals, lastUpdated, rarityScore, replacementDifficulty, holdRecommendation, rationale }
 */
export function computePipeValuation(pipe) {
  if (!pipe) return null;

  const snapshot = buildValuationSnapshot(pipe, 'pipekeeper');
  if (!snapshot) return null;

  // Build UI signal strings for display — use canonical PIPE_PREMIUM_MAKERS list
  const signals = [];
  const makerLower = (pipe.maker || '').toLowerCase();
  const isPremiumMaker = PIPE_PREMIUM_MAKERS.some(m => makerLower.includes(m));

  if (pipe.maker) signals.push(isPremiumMaker ? 'Premium brand index' : 'Brand baseline');
  if (pipe.bowl_material) signals.push(`Material: ${pipe.bowl_material}`);
  if (pipe.condition) signals.push(`Condition: ${pipe.condition}`);
  if (Number(pipe.purchase_price) > 0) signals.push('Purchase price reference');

  const yearNum = parseInt(pipe.year_made, 10);
  if (!isNaN(yearNum)) {
    if (yearNum < 1980) signals.push('Vintage era premium');
    else if (yearNum < 2000) signals.push('Collector-era age factor');
  }
  if (Number(pipe.estimated_value) > 0) signals.push('Manual valuation entry');

  const confMap = { high: 'High', medium: 'Medium', low: 'Low' };
  const confidence = confMap[snapshot.confidence] || 'Low';

  return {
    value: snapshot.currentValue,
    confidence,
    signals,
    lastUpdated: pipe.updated_date || pipe.created_date || null,
    isManual: !!(Number(pipe.estimated_value) > 0),
    rarityScore: snapshot.rarityScore,
    replacementDifficulty: snapshot.replacementDifficulty,
    holdRecommendation: snapshot.holdRecommendation,
    rationale: snapshot.rationale,
  };
}

/**
 * Calculates a tobacco blend valuation from available blend data.
 * Delegates to the shared valueEngine for all value, rarity, difficulty, and recommendation logic.
 * Returns { value, confidence, signals, totalOz, rarityScore, replacementDifficulty, recommendation, rationale }
 */
export function computeTobaccoValuation(blend) {
  if (!blend) return null;

  const snapshot = buildValuationSnapshot(blend, 'pipekeeper');
  if (!snapshot) return null;

  const totalOz =
    (Number(blend.tin_total_quantity_oz) || 0) +
    (Number(blend.bulk_total_quantity_oz) || 0) +
    (Number(blend.pouch_total_quantity_oz) || 0);

  const signals = [];
  if (Number(blend.manual_market_value) > 0) signals.push('Manual market value');
  if (Number(blend.ai_estimated_value) > 0) signals.push('AI-estimated value per oz');
  if (Number(blend.price_per_oz) > 0) signals.push(`Price per oz: $${Number(blend.price_per_oz).toFixed(2)}`);
  if (totalOz > 0) signals.push(`Total quantity: ${totalOz.toFixed(1)} oz`);
  if (blend.production_status) signals.push(`Production: ${blend.production_status}`);
  if (blend.aging_potential) signals.push(`Aging potential: ${blend.aging_potential}`);

  const confMap = { high: 'High', medium: 'Medium', low: 'Low' };
  const confidence = confMap[snapshot.confidence] || 'Low';

  return {
    value: snapshot.currentValue,
    confidence,
    signals,
    lastUpdated: blend.updated_date || blend.created_date || null,
    isManual: !!(Number(blend.manual_market_value) > 0),
    totalOz,
    rarityScore: snapshot.rarityScore,
    replacementDifficulty: snapshot.replacementDifficulty,
    recommendation: snapshot.holdRecommendation,
    rationale: snapshot.rationale,
  };
}

/**
 * Calculates a whiskey bottle valuation score from available bottle data.
 * Delegates to the shared valueEngine for canonical computation.
 */
export function computeBottleValuation(bottle) {
  if (!bottle) return null;

  const snapshot = buildValuationSnapshot(bottle, 'whiskeykeeper');
  if (!snapshot) return null;

  // Build legacy-compatible signal list for display
  const signals = [];

  if (Number(bottle.purchase_price) > 0) signals.push('Purchase price baseline');
  if (Number(bottle.retail_price) > 0) signals.push('Retail price reference');
  if (Number(bottle.aftermarket_price) > 0) signals.push('Aftermarket / secondary market data');
  if (Number(bottle.collector_value) > 0) signals.push('Collector value estimate');

  if (bottle.age && bottle.age >= 12) signals.push(`Age premium (${bottle.age} yr)`);
  if (bottle.type === 'Single Malt' || bottle.type === 'Single Grain') signals.push(`Type: ${bottle.type}`);
  if (bottle.abv && bottle.abv >= 55) signals.push('Cask-strength premium');
  if (bottle.fill_level && bottle.fill_level !== 'Full') signals.push(`Fill level: ${bottle.fill_level}`);

  const status = (bottle.production_status || '').toLowerCase();
  if (status === 'discontinued') signals.push('Discontinued production');
  if (status === 'limited edition' || status === 'allocated') signals.push('Limited / allocated release');

  // Confidence: normalize from engine output
  const confMap = { high: 'High', medium: 'Medium', low: 'Low' };
  const confidence = confMap[snapshot.confidence] || 'Low';

  return {
    value: snapshot.currentValue,
    confidence,
    signals,
    lastUpdated: bottle.updated_date || bottle.created_date || null,
    isManual: !!(bottle.manual_value_override && Number(bottle.manual_value_override) > 0),
    rarityScore: snapshot.rarityScore,
    replacementDifficulty: snapshot.replacementDifficulty,
    holdRecommendation: snapshot.holdRecommendation,
  };
}

export default function ValuationCredibility({ valuation, compact = false }) {
  const [expanded, setExpanded] = useState(false);

  if (!valuation || valuation.value === 0) return null;

  const conf = CONFIDENCE_CONFIG[valuation.confidence] || CONFIDENCE_CONFIG.Low;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold" style={{ color: '#D4A574' }}>
          {formatCurrency(valuation.value)}
        </span>
        <span
          className="text-xs px-1.5 py-0.5 rounded-full"
          style={{ background: conf.bg, color: conf.color, border: `1px solid ${conf.border}` }}
        >
          {valuation.confidence}
        </span>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg p-4 space-y-3"
      style={{
        background: 'linear-gradient(135deg, rgba(42, 30, 20, 0.7), rgba(35, 24, 16, 0.85))',
        border: '1px solid rgba(120, 90, 65, 0.3)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-4 h-4" style={{ color: 'rgba(180, 140, 75, 0.8)' }} />
          <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'rgba(180, 140, 75, 0.8)' }}>
            Estimated Value
          </span>
        </div>
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-xs flex items-center gap-1 transition-colors"
          style={{ color: 'rgba(224, 216, 200, 0.5)' }}
        >
          Reference signals
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Value + Confidence */}
      <div className="flex items-center gap-3">
        <span className="text-2xl font-bold" style={{ color: '#D4A574' }}>
          {formatCurrency(valuation.value)}
        </span>
        <span
          className="text-xs px-2 py-1 rounded-full font-medium"
          style={{ background: conf.bg, color: conf.color, border: `1px solid ${conf.border}` }}
        >
          {conf.label}
        </span>
      </div>

      {/* Expanded signals */}
      {expanded && (
        <div className="space-y-2 pt-1">
          <p className="text-xs" style={{ color: 'rgba(224, 216, 200, 0.6)' }}>Reference signals:</p>
          <ul className="space-y-1">
            {valuation.signals.map((sig, i) => (
              <li key={i} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'rgba(180, 140, 75, 0.6)' }} />
                <span className="text-xs" style={{ color: 'rgba(224, 216, 200, 0.75)' }}>{sig}</span>
              </li>
            ))}
          </ul>
          {valuation.lastUpdated && (
            <p className="text-xs" style={{ color: 'rgba(224, 216, 200, 0.4)' }}>
              Last updated: {formatDate(valuation.lastUpdated, 'medium')}
            </p>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <div className="flex items-start gap-2 pt-1 border-t" style={{ borderColor: 'rgba(120, 90, 65, 0.2)' }}>
        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: 'rgba(224, 216, 200, 0.3)' }} />
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(224, 216, 200, 0.4)' }}>
          Estimated market range based on available reference signals. Not a guarantee of actual sale price.
        </p>
      </div>
    </div>
  );
}