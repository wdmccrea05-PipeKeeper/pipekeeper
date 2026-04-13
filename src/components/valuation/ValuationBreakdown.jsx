/**
 * ValuationBreakdown.jsx
 *
 * Multi-layer valuation card for detail pages.
 * Displays:
 *   - You Paid (personal cost basis)
 *   - Current Local Value
 *   - Global Benchmark
 *   - Confidence
 *   - Gain / Loss trend
 *   - Replacement Difficulty
 *   - Strategy Recommendation
 *
 * Integrates with the live currency system via useValuation().
 */

import React, { useState } from 'react';
import {
  TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp,
  AlertCircle, MapPin, Globe, Zap,
} from 'lucide-react';
import { useValuation } from '@/lib/valuation/useValuation';
import { computeGainLoss } from '@/lib/valuation/valuationEngine';

// ---------------------------------------------------------------------------
// Confidence badge
// ---------------------------------------------------------------------------

const CONF_STYLES = {
  high:   { color: '#4ade80', bg: 'rgba(74,222,128,0.10)', border: 'rgba(74,222,128,0.30)', label: 'High Confidence'   },
  medium: { color: '#fbbf24', bg: 'rgba(251,191,36,0.10)', border: 'rgba(251,191,36,0.30)', label: 'Medium Confidence' },
  low:    { color: '#f87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.30)', label: 'Low Confidence'  },
};

function ConfBadge({ label }) {
  const style = CONF_STYLES[label] || CONF_STYLES.low;
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}
    >
      {style.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Difficulty bar
// ---------------------------------------------------------------------------

function DifficultyBar({ score, label, color }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, background: color || '#fbbf24' }}
        />
      </div>
      <span className="text-xs font-medium shrink-0" style={{ color: color || '#fbbf24' }}>
        {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Strategy chip
// ---------------------------------------------------------------------------

const STRATEGY_STYLES = {
  'Hold':            { color: '#4ade80', bg: 'rgba(74,222,128,0.12)'  },
  'Open Now':        { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
  'Buy Backup':      { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)'  },
  'Trade Candidate': { color: '#fb923c', bg: 'rgba(251,146,60,0.12)'  },
  'Your Call':       { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
};

function StrategyChip({ recommendation }) {
  const s = STRATEGY_STYLES[recommendation] || STRATEGY_STYLES['Your Call'];
  return (
    <span
      className="text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}33` }}
    >
      {recommendation}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Value row
// ---------------------------------------------------------------------------

function ValueRow({ icon: Icon, label, formattedValue, sub, highlight }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        {Icon && <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: 'rgba(180,140,75,0.7)' }} />}
        <span className="text-xs" style={{ color: 'rgba(224,216,200,0.65)' }}>{label}</span>
        {sub && <span className="text-[10px] ml-1" style={{ color: 'rgba(224,216,200,0.35)' }}>{sub}</span>}
      </div>
      <span
        className="text-sm font-semibold shrink-0"
        style={{ color: highlight ? '#D4A574' : 'rgba(224,216,200,0.90)' }}
      >
        {formattedValue}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * @param {Object}   item      - Raw item record
 * @param {'bottle'|'blend'|'tobacco'|'pipe'} itemType
 * @param {boolean}  [compact] - Minimal single-line display
 */
export default function ValuationBreakdown({ item, itemType, compact = false }) {
  const { valuation, formatValue } = useValuation(item, itemType);
  const [expanded, setExpanded] = useState(false);

  if (!valuation) return null;

  const { costBasis, localMarketValue, globalBenchmark, replacementDifficulty, strategy, confidence } = valuation;

  // We need at least one value to show anything
  if (!costBasis && !globalBenchmark && !localMarketValue) return null;

  const gainLoss = computeGainLoss(costBasis, globalBenchmark);

  // ── Compact mode ─────────────────────────────────────────────────────────────
  if (compact) {
    const displayValue = localMarketValue?.value || globalBenchmark?.value || costBasis?.value;
    if (!displayValue) return null;
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold" style={{ color: '#D4A574' }}>
          {formatValue(displayValue)}
        </span>
        <ConfBadge label={confidence?.label} />
      </div>
    );
  }

  // ── Full mode ─────────────────────────────────────────────────────────────────

  const TrendIcon = gainLoss?.direction === 'up' ? TrendingUp
                  : gainLoss?.direction === 'down' ? TrendingDown
                  : Minus;
  const trendColor = gainLoss?.direction === 'up' ? '#4ade80'
                   : gainLoss?.direction === 'down' ? '#f87171'
                   : 'rgba(224,216,200,0.45)';

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        background: 'linear-gradient(135deg, rgba(42,30,20,0.70), rgba(35,24,16,0.85))',
        border: '1px solid rgba(120,90,65,0.30)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" style={{ color: 'rgba(180,140,75,0.8)' }} />
          <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'rgba(180,140,75,0.8)' }}>
            Valuation
          </span>
        </div>
        <div className="flex items-center gap-2">
          {confidence && <ConfBadge label={confidence.label} />}
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-xs flex items-center gap-1 transition-colors"
            style={{ color: 'rgba(224,216,200,0.45)' }}
          >
            Details
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Primary values */}
      <div className="space-y-0.5 divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        {costBasis?.value > 0 && (
          <ValueRow
            icon={null}
            label="You Paid"
            formattedValue={formatValue(costBasis.value)}
            sub={costBasis.date ? `· ${new Date(costBasis.date).getFullYear()}` : undefined}
          />
        )}

        {localMarketValue?.value > 0 && (
          <ValueRow
            icon={MapPin}
            label={`Local Value${localMarketValue.country ? ` (${localMarketValue.country})` : ''}`}
            formattedValue={formatValue(localMarketValue.value)}
            highlight
          />
        )}

        {globalBenchmark?.value > 0 && (
          <ValueRow
            icon={Globe}
            label="Global Benchmark"
            formattedValue={formatValue(globalBenchmark.value)}
          />
        )}

        {gainLoss && (
          <div className="flex items-center justify-between gap-2 py-1.5">
            <div className="flex items-center gap-2">
              <TrendIcon className="w-3.5 h-3.5 shrink-0" style={{ color: trendColor }} />
              <span className="text-xs" style={{ color: 'rgba(224,216,200,0.65)' }}>Gain / Loss</span>
            </div>
            <span className="text-sm font-semibold shrink-0" style={{ color: trendColor }}>
              {gainLoss.direction === 'up' ? '+' : ''}{gainLoss.pct.toFixed(1)}%
              {' '}({formatValue(Math.abs(gainLoss.delta))})
            </span>
          </div>
        )}
      </div>

      {/* Replacement difficulty */}
      {replacementDifficulty && (
        <div className="space-y-1.5 pt-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'rgba(224,216,200,0.55)' }}>Replacement Difficulty</span>
            <span className="text-xs" style={{ color: 'rgba(224,216,200,0.35)' }}>{replacementDifficulty.score}/100</span>
          </div>
          <DifficultyBar
            score={replacementDifficulty.score}
            label={replacementDifficulty.label}
            color={replacementDifficulty.color}
          />
        </div>
      )}

      {/* Strategy */}
      {strategy?.recommendation && (
        <div className="flex items-start gap-2 pt-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <Zap className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'rgba(180,140,75,0.7)' }} />
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'rgba(224,216,200,0.55)' }}>Strategy</span>
              <StrategyChip recommendation={strategy.recommendation} />
            </div>
            {expanded && strategy.reason && (
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(224,216,200,0.60)' }}>
                {strategy.reason}
              </p>
            )}
            {expanded && strategy.bullets?.length > 0 && (
              <ul className="space-y-1 pt-1">
                {strategy.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: 'rgba(180,140,75,0.5)' }} />
                    <span className="text-xs" style={{ color: 'rgba(224,216,200,0.55)' }}>{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="flex items-start gap-2 pt-1 border-t" style={{ borderColor: 'rgba(120,90,65,0.18)' }}>
        <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" style={{ color: 'rgba(224,216,200,0.25)' }} />
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(224,216,200,0.35)' }}>
          Estimated values based on available reference signals. Not a guarantee of actual market price.
        </p>
      </div>
    </div>
  );
}
