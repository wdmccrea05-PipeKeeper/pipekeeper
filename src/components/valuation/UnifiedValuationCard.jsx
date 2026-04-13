/**
 * UnifiedValuationCard
 * 
 * Single canonical valuation card for Pipe, Tobacco Blend, and Bottle records.
 * Merges ValuationBreakdown + ValueStrategySection into one unified layout.
 * 
 * Props:
 *  item                 — raw item record
 *  itemType             — 'pipe' | 'tobacco' | 'bottle'
 *  moduleKey            — 'pipekeeper' | 'whiskeykeeper'
 *  valuationSnapshot    — output of buildValuationSnapshot()
 *  valueTrend           — 'up' | 'down' | 'flat' | 'unknown'
 *  valueSnapshots       — array of ItemValueSnapshot records
 *  priceObservations    — array of PriceObservation records
 *  onRunAppraisal       — callback for "Run Appraisal" button
 *  isRunningAppraisal   — bool, shows spinner on appraisal button
 *  appraisalContent     — optional JSX rendered below when appraisal is active
 *  onAddSnapshot        — open save-checkpoint modal
 *  onAddObservation     — open add-observation modal
 *  onEditValuation      — open edit-valuation-inputs modal
 *  onRefreshNow         — recompute snapshot now
 *  isRefreshing         — bool
 */

import React, { useState } from 'react';
import {
  TrendingUp, TrendingDown, Minus, ShieldCheck, Unlock, HelpCircle,
  PlusCircle, Eye, ChevronDown, ChevronUp, Lock, Zap, AlertTriangle,
  RefreshCw, Settings, MapPin, Globe, AlertCircle, Loader2, Sparkles,
} from 'lucide-react';
import { useCurrency } from '@/lib/currency/useCurrency';
import { useValuation } from '@/lib/valuation/useValuation';
import { computeGainLoss } from '@/lib/valuation/valuationEngine';
import { Button } from '@/components/ui/button';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(v) {
  if (!v) return '--';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '--';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function capitalize(str) {
  if (!str) return '--';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ConfidenceBadge({ level }) {
  const colors = {
    high:   { bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.3)',  text: '#4ade80' },
    medium: { bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)',  text: '#fbbf24' },
    low:    { bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)', text: '#f87171' },
  };
  const c = colors[level] || colors.low;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
      {capitalize(level)}
    </span>
  );
}

function TrendChip({ trend }) {
  const cfg = {
    up:      { icon: TrendingUp,   color: '#4ade80', label: 'Trending Up'   },
    down:    { icon: TrendingDown, color: '#f87171', label: 'Trending Down' },
    flat:    { icon: Minus,        color: '#fbbf24', label: 'Stable'        },
    unknown: { icon: HelpCircle,   color: '#9ca3af', label: 'Unknown'       },
  }[trend] || { icon: HelpCircle, color: '#9ca3af', label: '--' };
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: cfg.color }}>
      <Icon className="w-4 h-4" />{cfg.label}
    </span>
  );
}

const RECOMMENDATION_CONFIG = {
  hold:            { icon: ShieldCheck, bg: 'rgba(239,68,68,0.07)',    border: 'rgba(239,68,68,0.28)',    iconColor: '#fca5a5', textColor: '#fca5a5', label: 'Hold',                  sublabel: 'Strategic value — preserve this item' },
  open:            { icon: Unlock,      bg: 'rgba(16,185,129,0.07)',   border: 'rgba(16,185,129,0.28)',   iconColor: '#6ee7b7', textColor: '#6ee7b7', label: 'Safe to Open',          sublabel: 'Low replacement risk — enjoy freely' },
  open_if_duplicate:{ icon: Zap,        bg: 'rgba(251,191,36,0.07)',   border: 'rgba(251,191,36,0.28)',   iconColor: '#fbbf24', textColor: '#fbbf24', label: 'Open if Duplicate',     sublabel: 'You have a backup — opening is low risk' },
  either:          { icon: HelpCircle,  bg: 'rgba(180,140,75,0.07)',   border: 'rgba(180,140,75,0.22)',   iconColor: '#D4A574', textColor: '#D4A574', label: 'Your Call',             sublabel: 'Mixed signals — personal preference applies' },
  use:             { icon: Unlock,      bg: 'rgba(16,185,129,0.07)',   border: 'rgba(16,185,129,0.28)',   iconColor: '#6ee7b7', textColor: '#6ee7b7', label: 'Use Freely',            sublabel: 'Available and replaceable — enjoy your pipe' },
  rotate:          { icon: HelpCircle,  bg: 'rgba(180,140,75,0.07)',   border: 'rgba(180,140,75,0.22)',   iconColor: '#D4A574', textColor: '#D4A574', label: 'Include in Rotation',   sublabel: 'Moderately rare — smoke thoughtfully and maintain well' },
  preserve:        { icon: ShieldCheck, bg: 'rgba(239,68,68,0.07)',    border: 'rgba(239,68,68,0.28)',    iconColor: '#fca5a5', textColor: '#fca5a5', label: 'Preserve — Limit Use',  sublabel: 'Rare or vintage pipe — minimize use to protect collector value' },
  insure:          { icon: ShieldCheck, bg: 'rgba(139,92,246,0.07)',   border: 'rgba(139,92,246,0.28)',   iconColor: '#c4b5fd', textColor: '#c4b5fd', label: 'Preserve & Insure',     sublabel: 'Extremely rare and irreplaceable — formal coverage recommended' },
  smoke_now:       { icon: Unlock,      bg: 'rgba(16,185,129,0.07)',   border: 'rgba(16,185,129,0.28)',   iconColor: '#6ee7b7', textColor: '#6ee7b7', label: 'Smoke Now',             sublabel: 'Widely available — enjoy at your own pace' },
  smoke_later:     { icon: HelpCircle,  bg: 'rgba(180,140,75,0.07)',   border: 'rgba(180,140,75,0.22)',   iconColor: '#D4A574', textColor: '#D4A574', label: 'Save for Later',        sublabel: 'Limited availability — save for special occasions' },
  cellar:          { icon: ShieldCheck, bg: 'rgba(59,130,246,0.07)',   border: 'rgba(59,130,246,0.28)',   iconColor: '#93C5FD', textColor: '#93C5FD', label: 'Cellar for Aging',      sublabel: 'Age remaining stock for enhanced flavor' },
  hold_for_trade:  { icon: Zap,         bg: 'rgba(239,68,68,0.07)',    border: 'rgba(239,68,68,0.28)',    iconColor: '#fca5a5', textColor: '#fca5a5', label: 'Hold for Trade',        sublabel: 'Scarce blend — secondary value may appreciate' },
};

function RecommendationBlock({ holdRecommendation, rationale }) {
  const cfg = RECOMMENDATION_CONFIG[holdRecommendation] || RECOMMENDATION_CONFIG.either;
  const Icon = cfg.icon;
  return (
    <div className="rounded-xl p-4" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(0,0,0,0.2)' }}>
          <Icon className="w-4 h-4" style={{ color: cfg.iconColor }} />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#D8C7A6]/60">Strategy</p>
          <p className="text-sm font-bold" style={{ color: cfg.textColor }}>{cfg.label}</p>
        </div>
      </div>
      <p className="text-xs text-[#E0D8C8]/65 mb-2">{cfg.sublabel}</p>
      {rationale?.length > 0 && (
        <ul className="space-y-1">
          {rationale.map((r, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-[5px] w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'rgba(180,140,75,0.55)' }} />
              <span className="text-xs text-[#E0D8C8]/80">{r}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReplacementDots({ level }) {
  const LEVELS = ['very_easy', 'easy', 'moderate', 'hard', 'very_hard'];
  const LABELS = { very_easy: 'Very Easy to Replace', easy: 'Easy to Replace', moderate: 'Moderately Difficult', hard: 'Hard to Replace', very_hard: 'Very Hard / Rare' };
  const COLORS = { very_easy: '#4ade80', easy: '#86efac', moderate: '#fbbf24', hard: '#fb923c', very_hard: '#f87171' };
  const activeIdx = LEVELS.indexOf(level);
  const filledCount = activeIdx === -1 ? 1 : activeIdx + 1;
  const color = COLORS[level] || COLORS.easy;
  return (
    <div className="space-y-1.5 mt-1">
      <div className="flex items-center gap-1.5">
        {LEVELS.map((_, i) => (
          <div key={i} className="flex-1 h-2 rounded-full"
            style={{ background: i < filledCount ? color : 'rgba(255,255,255,0.06)', boxShadow: i < filledCount ? `0 0 6px ${color}55` : 'none' }} />
        ))}
      </div>
      <p className="text-sm font-semibold" style={{ color }}>{LABELS[level] || '--'}</p>
    </div>
  );
}

function SnapshotList({ snapshots, formatFn }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? snapshots : snapshots.slice(0, 3);
  if (!snapshots.length) return (
    <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(180,140,75,0.1)' }}>
      <p className="text-xs text-[#D8C7A6]/50">No checkpoints yet</p>
      <p className="text-xs text-[#D8C7A6]/40 mt-1">Save a checkpoint to start tracking value history</p>
    </div>
  );
  return (
    <div className="space-y-1.5">
      {shown.map((s, i) => (
        <div key={s.id || i} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-xs"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.1)' }}>
          <span className="text-[#D8C7A6]/65 shrink-0">{formatDate(s.snapshot_date)}</span>
          <span className="font-semibold text-[#F5F1E7]">{s.computed_current_value > 0 ? formatFn(s.computed_current_value) : '--'}</span>
          <span className="text-[#D8C7A6]/45 truncate">{s.source || s.price_type || '--'}</span>
          {s.value_confidence && <ConfidenceBadge level={s.value_confidence} />}
        </div>
      ))}
      {snapshots.length > 3 && (
        <button type="button" onClick={() => setExpanded(e => !e)} className="flex items-center gap-1 text-xs text-[#D4A574]/75 hover:text-[#D4A574] mt-1">
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Show less' : `Show ${snapshots.length - 3} more`}
        </button>
      )}
    </div>
  );
}

function ObservationList({ observations, formatFn }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? observations : observations.slice(0, 3);
  if (!observations.length) return (
    <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(59,130,246,0.12)' }}>
      <p className="text-xs text-[#D8C7A6]/50">No observations yet</p>
      <p className="text-xs text-[#D8C7A6]/40 mt-1">Add observations to track real-world market prices</p>
    </div>
  );
  return (
    <div className="space-y-1.5">
      {shown.map((o, i) => (
        <div key={o.id || i} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-xs"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(59,130,246,0.12)' }}>
          <span className="text-[#D8C7A6]/65 shrink-0">{formatDate(o.observed_date)}</span>
          <span className="font-semibold text-[#F5F1E7]">{o.observed_price > 0 ? formatFn(o.observed_price) : '--'}</span>
          <span className="text-[#93C5FD]/70 truncate">{o.source_name || '--'}</span>
          <span className="text-[#D8C7A6]/45 uppercase tracking-wide shrink-0">{o.price_type || '--'}</span>
        </div>
      ))}
      {observations.length > 3 && (
        <button type="button" onClick={() => setExpanded(e => !e)} className="flex items-center gap-1 text-xs text-[#93C5FD]/75 hover:text-[#93C5FD] mt-1">
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Show less' : `Show ${observations.length - 3} more`}
        </button>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function UnifiedValuationCard({
  item,
  itemType,
  moduleKey = 'pipekeeper',
  valuationSnapshot,
  valueTrend,
  valueSnapshots = [],
  priceObservations = [],
  onRunAppraisal,
  isRunningAppraisal = false,
  appraisalContent = null,
  onAddSnapshot,
  onAddObservation,
  onEditValuation,
  onRefreshNow,
  isRefreshing = false,
}) {
  const [showSettings, setShowSettings] = useState(false);
  const { formatFromBase } = useCurrency();

  // Valuation breakdown data (You Paid, Local Value, Global Benchmark, Gain/Loss)
  const { valuation, formatValue } = useValuation(item, itemType);

  if (!valuationSnapshot) return null;

  const { rarityScore, replacementDifficulty, holdRecommendation, rationale } = valuationSnapshot;

  // Resolve displayed current value
  const latestSavedSnap = valueSnapshots[0];
  const currentValue = valuationSnapshot.currentValue > 0
    ? valuationSnapshot.currentValue
    : (latestSavedSnap?.computed_current_value > 0 ? latestSavedSnap.computed_current_value : 0);
  const source = valuationSnapshot.currentValue > 0
    ? valuationSnapshot.source
    : (latestSavedSnap?.computed_current_value > 0 ? (latestSavedSnap.source || 'Snapshot') : valuationSnapshot.source);
  const confidence = valuationSnapshot.currentValue > 0
    ? valuationSnapshot.confidence
    : (latestSavedSnap?.value_confidence || valuationSnapshot.confidence);

  // Breakdown data
  const breakdown = valuation;
  const gainLoss = breakdown ? computeGainLoss(breakdown.costBasis, breakdown.globalBenchmark) : null;
  const TrendIcon = gainLoss?.direction === 'up' ? TrendingUp : gainLoss?.direction === 'down' ? TrendingDown : Minus;
  const trendColor = gainLoss?.direction === 'up' ? '#4ade80' : gainLoss?.direction === 'down' ? '#f87171' : 'rgba(224,216,200,0.45)';

  return (
    <div className="rounded-2xl overflow-hidden min-w-0"
      style={{ background: 'linear-gradient(145deg, rgba(34,24,16,0.97), rgba(22,15,10,1))', border: '1px solid rgba(180,140,75,0.22)' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-[rgba(180,140,75,0.12)]">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(180,140,75,0.12)', border: '1px solid rgba(180,140,75,0.22)' }}>
              <TrendingUp className="w-4 h-4 text-[#B48C4B]" />
            </div>
            <p className="text-sm font-bold text-[#D4A574] uppercase tracking-[0.12em]">Value &amp; Appraisal</p>
          </div>

          {/* Run Appraisal — prominent */}
          {onRunAppraisal && (
            <Button
              onClick={onRunAppraisal}
              disabled={isRunningAppraisal}
              style={{
                background: isRunningAppraisal
                  ? 'rgba(180,140,75,0.2)'
                  : 'linear-gradient(135deg, rgba(180,140,75,0.95), rgba(150,110,55,1))',
                border: '1px solid rgba(180,140,75,0.5)',
                color: isRunningAppraisal ? '#D4A574' : '#1A120D',
                fontWeight: 700,
              }}
              size="sm"
            >
              {isRunningAppraisal
                ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Running…</>
                : <><Sparkles className="w-3.5 h-3.5 mr-1.5" />Run Appraisal</>
              }
            </Button>
          )}
        </div>

        {/* Action buttons row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button type="button" onClick={onAddSnapshot}
            className="flex items-center justify-center gap-1.5 text-xs px-2.5 py-2 rounded-lg font-medium transition-colors min-h-[36px]"
            style={{ background: 'rgba(180,140,75,0.15)', color: '#D4A574', border: '1px solid rgba(180,140,75,0.28)' }}
            title="Save today's value as a history checkpoint">
            <PlusCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Save Checkpoint</span>
          </button>
          <button type="button" onClick={onAddObservation}
            className="flex items-center justify-center gap-1.5 text-xs px-2.5 py-2 rounded-lg font-medium transition-colors min-h-[36px]"
            style={{ background: 'rgba(59,130,246,0.12)', color: '#93C5FD', border: '1px solid rgba(59,130,246,0.25)' }}
            title="Add a real-world market price observation">
            <Eye className="w-3.5 h-3.5 shrink-0" />
            <span>Add Observation</span>
          </button>
          {onEditValuation && (
            <button type="button" onClick={onEditValuation}
              className="flex items-center justify-center gap-1.5 text-xs px-2.5 py-2 rounded-lg font-medium transition-colors min-h-[36px]"
              style={{ background: 'rgba(251,191,36,0.10)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.22)' }}
              title="Edit valuation inputs">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Edit Inputs</span>
            </button>
          )}
          {onRefreshNow && (
            <button type="button" onClick={onRefreshNow} disabled={isRefreshing}
              className="flex items-center justify-center gap-1.5 text-xs px-2.5 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 min-h-[36px]"
              style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.28)' }}
              title="Recompute and save a new value snapshot now">
              <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing…' : 'Refresh'}</span>
            </button>
          )}
          <button type="button"
            className="flex items-center justify-center gap-1.5 text-xs px-2.5 py-2 rounded-lg font-medium transition-colors min-h-[36px]"
            style={{ background: 'rgba(180,140,75,0.08)', color: 'rgba(212,165,116,0.65)', border: '1px solid rgba(180,140,75,0.18)' }}
            onClick={() => setShowSettings(!showSettings)} title="Valuation settings">
            <Settings className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">

        {/* Appraisal content (e.g. ValueLookup) injected here */}
        {appraisalContent}

        {/* ── Current Value + Trend ─────────────────────────────────────── */}
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.12em] text-[#D8C7A6]/60 mb-1">Current Value</p>
            <p className="text-3xl font-bold text-[#F5F1E7] tabular-nums">
              {currentValue > 0 ? formatFromBase(currentValue) : '--'}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="text-xs text-[#D8C7A6]/65">{source}</span>
              <ConfidenceBadge level={confidence} />
            </div>
            {latestSavedSnap && (
              <p className="text-xs text-[#D8C7A6]/45 mt-1">Last checkpoint: {formatDate(latestSavedSnap.snapshot_date)}</p>
            )}
          </div>
          <div className="shrink-0 rounded-xl px-4 py-3 text-center min-w-[110px]"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.14)' }}>
            <p className="text-xs uppercase tracking-[0.12em] text-[#D8C7A6]/60 mb-2">Trend</p>
            <TrendChip trend={valueTrend || valuationSnapshot.trend} />
          </div>
        </div>

        {/* ── Valuation Breakdown rows (You Paid, Local, Global, Gain/Loss) ── */}
        {breakdown && (breakdown.costBasis?.value > 0 || breakdown.localMarketValue?.valueUSD > 0 || breakdown.globalBenchmark?.value > 0) && (
          <div className="rounded-xl p-4 space-y-1.5"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(120,90,65,0.25)' }}>
            <p className="text-xs uppercase tracking-[0.12em] text-[#D8C7A6]/60 mb-2.5 font-semibold">Valuation Breakdown</p>

            {breakdown.costBasis?.value > 0 && (
              <div className="flex items-center justify-between gap-2 py-1 border-b border-[rgba(255,255,255,0.04)]">
                <span className="text-xs text-[#D8C7A6]/65">You Paid</span>
                <span className="text-sm font-semibold text-[#E0D8C8]/90">{formatValue(breakdown.costBasis.value)}</span>
              </div>
            )}
            {breakdown.localMarketValue?.valueUSD > 0 && (
              <div className="flex items-center justify-between gap-2 py-1 border-b border-[rgba(255,255,255,0.04)]">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#D4A574]/60" />
                  <span className="text-xs text-[#D8C7A6]/65">
                    Local Value{breakdown.localMarketValue.country ? ` (${breakdown.localMarketValue.country})` : ''}
                  </span>
                </div>
                <span className="text-sm font-semibold" style={{ color: '#D4A574' }}>{formatValue(breakdown.localMarketValue.valueUSD)}</span>
              </div>
            )}
            {breakdown.globalBenchmark?.value > 0 && (
              <div className="flex items-center justify-between gap-2 py-1 border-b border-[rgba(255,255,255,0.04)]">
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#D4A574]/60" />
                  <span className="text-xs text-[#D8C7A6]/65">Global Benchmark</span>
                </div>
                <span className="text-sm font-semibold text-[#E0D8C8]/90">{formatValue(breakdown.globalBenchmark.value)}</span>
              </div>
            )}
            {gainLoss && (
              <div className="flex items-center justify-between gap-2 py-1">
                <div className="flex items-center gap-1.5">
                  <TrendIcon className="w-3.5 h-3.5 shrink-0" style={{ color: trendColor }} />
                  <span className="text-xs text-[#D8C7A6]/65">Gain / Loss</span>
                </div>
                <span className="text-sm font-semibold" style={{ color: trendColor }}>
                  {gainLoss.direction === 'up' ? '+' : ''}{gainLoss.pct.toFixed(1)}%
                  {' '}({formatValue(Math.abs(gainLoss.delta))})
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Strategy ─────────────────────────────────────────────────────── */}
        <RecommendationBlock holdRecommendation={holdRecommendation} rationale={rationale} />

        {/* ── Replacement Difficulty ───────────────────────────────────────── */}
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.14)' }}>
          <p className="text-xs uppercase tracking-[0.12em] text-[#D8C7A6]/60 mb-2 font-semibold">Replacement Difficulty</p>
          <ReplacementDots level={replacementDifficulty} />
        </div>

        {/* ── Value History ─────────────────────────────────────────────────── */}
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-[#D8C7A6]/60 mb-2.5">Value History</p>
          <SnapshotList snapshots={valueSnapshots} formatFn={formatFromBase} />
        </div>

        {/* ── Market Observations ──────────────────────────────────────────── */}
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-[#93C5FD]/60 mb-2.5">Market Observations</p>
          <ObservationList observations={priceObservations} formatFn={formatFromBase} />
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-2 pt-1 border-t border-[rgba(120,90,65,0.18)]">
          <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" style={{ color: 'rgba(224,216,200,0.25)' }} />
          <p className="text-xs" style={{ color: 'rgba(224,216,200,0.35)' }}>
            Estimated values based on available reference signals. Not a guarantee of actual market price.
          </p>
        </div>
      </div>
    </div>
  );
}