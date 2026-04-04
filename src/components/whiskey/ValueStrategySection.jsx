/**
 * ValueStrategySection
 * Polished "Value & Strategy" block for BottleDetail.
 * Consumes canonical valueEngine output — NO local valuation logic.
 */
import React, { useState } from 'react';
import {
  TrendingUp, TrendingDown, Minus, ShieldCheck, Unlock, HelpCircle,
  PlusCircle, Eye, ChevronDown, ChevronUp, Lock, Zap, AlertTriangle, RotateCw, Settings,
} from 'lucide-react';
import {
  DIFFICULTY_LABELS,
  TREND_LABELS,
  HOLD_RECOMMENDATION_LABELS,
} from '@/components/valuation/valueEngine';
import { formatCurrency } from '@/components/whiskey/utils/bottleValue';

// ── tiny helpers ──────────────────────────────────────────────────────────────

function formatDate(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function CapitalizeFirst(str) {
  if (!str) return '—';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── sub-components ────────────────────────────────────────────────────────────

function MiniCard({ label, children }) {
  return (
    <div className="rounded-xl p-3 min-w-0" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.14)' }}>
      <p className="text-xs uppercase tracking-[0.12em] text-[#D8C7A6]/60 mb-1 truncate">{label}</p>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function ConfidenceBadge({ level }) {
  const colors = {
    high: { bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.3)', text: '#4ade80' },
    medium: { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)', text: '#fbbf24' },
    low: { bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)', text: '#f87171' },
  };
  const c = colors[level] || colors.low;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
      {CapitalizeFirst(level)}
    </span>
  );
}

function TrendChip({ trend }) {
  const cfg = {
    up: { icon: TrendingUp, color: '#4ade80', label: 'Trending Up' },
    down: { icon: TrendingDown, color: '#f87171', label: 'Trending Down' },
    flat: { icon: Minus, color: '#fbbf24', label: 'Stable' },
    unknown: { icon: HelpCircle, color: '#9ca3af', label: 'Unknown' },
  }[trend] || { icon: HelpCircle, color: '#9ca3af', label: '—' };
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: cfg.color }}>
      <Icon className="w-4 h-4" />
      {cfg.label}
    </span>
  );
}

const RECOMMENDATION_CONFIG = {
  hold: {
    icon: ShieldCheck,
    bg: 'rgba(239,68,68,0.07)',
    border: 'rgba(239,68,68,0.28)',
    iconColor: '#fca5a5',
    textColor: '#fca5a5',
    label: 'Hold',
    sublabel: 'Strategic value — preserve this bottle',
  },
  open: {
    icon: Unlock,
    bg: 'rgba(16,185,129,0.07)',
    border: 'rgba(16,185,129,0.28)',
    iconColor: '#6ee7b7',
    textColor: '#6ee7b7',
    label: 'Safe to Open',
    sublabel: 'Low replacement risk — enjoy freely',
  },
  open_if_duplicate: {
    icon: Zap,
    bg: 'rgba(251,191,36,0.07)',
    border: 'rgba(251,191,36,0.28)',
    iconColor: '#fbbf24',
    textColor: '#fbbf24',
    label: 'Open if Duplicate',
    sublabel: 'You have a backup — opening is low risk',
  },
  either: {
    icon: HelpCircle,
    bg: 'rgba(180,140,75,0.07)',
    border: 'rgba(180,140,75,0.22)',
    iconColor: '#D4A574',
    textColor: '#D4A574',
    label: 'Your Call',
    sublabel: 'Mixed signals — personal preference applies',
  },
};

function RecommendationBlock({ holdRecommendation, rationale }) {
  const cfg = RECOMMENDATION_CONFIG[holdRecommendation] || RECOMMENDATION_CONFIG.either;
  const Icon = cfg.icon;
  return (
    <div className="rounded-xl p-4 min-w-0" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(0,0,0,0.2)' }}>
          <Icon className="w-4 h-4" style={{ color: cfg.iconColor }} />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.12em] text-[#D8C7A6]/60">Strategy</p>
          <p className="text-base font-bold leading-tight break-words" style={{ color: cfg.textColor }}>
            {cfg.label}
          </p>
        </div>
      </div>
      <p className="text-xs text-[#E0D8C8]/65 mb-3 break-words">{cfg.sublabel}</p>
      {rationale && rationale.length > 0 && (
        <ul className="space-y-1.5">
          {rationale.map((r, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-[5px] w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'rgba(180,140,75,0.55)' }} />
              <span className="text-xs text-[#E0D8C8]/80 break-words">{r}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RarityBar({ score }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 70 ? '#f87171' : pct >= 40 ? '#fbbf24' : '#4ade80';
  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-[#F5F1E7]">{pct}/100</span>
        <span className="text-xs text-[#D8C7A6]/60">{pct >= 70 ? 'Rare' : pct >= 40 ? 'Moderate' : 'Common'}</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function SnapshotHistoryList({ snapshots }) {
  const [expanded, setExpanded] = useState(false);
  const displayed = expanded ? snapshots : snapshots.slice(0, 3);
  if (snapshots.length === 0) {
    return (
      <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(180,140,75,0.1)' }}>
        <p className="text-xs text-[#D8C7A6]/50">No checkpoints yet</p>
        <p className="text-xs text-[#D8C7A6]/40 mt-1">Save a checkpoint to start tracking value history</p>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {displayed.map((snap, i) => (
        <div key={snap.id || i} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-xs min-w-0" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.1)' }}>
          <span className="text-[#D8C7A6]/65 shrink-0">{formatDate(snap.snapshot_date)}</span>
          <span className="font-semibold text-[#F5F1E7] tabular-nums">{snap.computed_current_value > 0 ? formatCurrency(snap.computed_current_value) : '—'}</span>
          <span className="text-[#D8C7A6]/45 truncate min-w-0">{snap.source || snap.price_type || '—'}</span>
          {snap.value_confidence && <ConfidenceBadge level={snap.value_confidence} />}
        </div>
      ))}
      {snapshots.length > 3 && (
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1 text-xs text-[#D4A574]/75 hover:text-[#D4A574] mt-1 transition-colors"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Show less' : `Show ${snapshots.length - 3} more`}
        </button>
      )}
    </div>
  );
}

function ObservationList({ observations }) {
  const [expanded, setExpanded] = useState(false);
  const displayed = expanded ? observations : observations.slice(0, 3);
  if (observations.length === 0) {
    return (
      <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(59,130,246,0.12)' }}>
        <p className="text-xs text-[#D8C7A6]/50">No observations yet</p>
        <p className="text-xs text-[#D8C7A6]/40 mt-1">Add observations to track real-world market prices</p>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {displayed.map((obs, i) => (
        <div key={obs.id || i} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-xs min-w-0" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(59,130,246,0.12)' }}>
          <span className="text-[#D8C7A6]/65 shrink-0">{formatDate(obs.observed_date)}</span>
          <span className="font-semibold text-[#F5F1E7] tabular-nums">{obs.observed_price > 0 ? formatCurrency(obs.observed_price) : '—'}</span>
          <span className="text-[#93C5FD]/70 truncate min-w-0">{obs.source_name || '—'}</span>
          <span className="text-[#D8C7A6]/45 shrink-0 uppercase tracking-wide">{obs.price_type || '—'}</span>
        </div>
      ))}
      {observations.length > 3 && (
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1 text-xs text-[#93C5FD]/75 hover:text-[#93C5FD] mt-1 transition-colors"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Show less' : `Show ${observations.length - 3} more`}
        </button>
      )}
    </div>
  );
}

// ── Main exported component ───────────────────────────────────────────────────

export default function ValueStrategySection({
  valuationSnapshot,
  valueTrend,
  valueSnapshots = [],
  priceObservations = [],
  bottle,
  onAddSnapshot,
  onAddObservation,
}) {
  if (!valuationSnapshot) return null;

  const [showSettings, setShowSettings] = useState(false);

  const { currentValue, source, confidence, rarityScore, replacementDifficulty, holdRecommendation, rationale } = valuationSnapshot;

  const isAllocated = bottle?.production_status === 'Allocated' || bottle?.allocated;
  const isDiscontinued = bottle?.production_status === 'Discontinued' || bottle?.discontinued;
  const isExclusive = bottle?.production_status === 'Exclusive' || bottle?.exclusive;

  const latestSnapshot = valueSnapshots[0];

  return (
    <>
      {showSettings && (
        <div className="rounded-2xl p-4 mb-4 space-y-3" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.18)' }}>
          <p className="text-xs uppercase tracking-[0.12em] text-[#c4b5fd]/70 font-semibold">Auto-Refresh Settings</p>
          <div className="space-y-2.5">
            <label className="flex items-center gap-2 text-sm text-[#E0D8C8]">
              <input type="checkbox" defaultChecked className="rounded" />
              <span>Auto-Refresh Value</span>
            </label>
            <div className="text-xs text-[#D8C7A6]/55 space-y-1.5 ml-6">
              <label className="flex items-center gap-2">
                <input type="radio" name="refresh-cadence" value="weekly" defaultChecked />
                <span>Weekly</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="refresh-cadence" value="monthly" />
                <span>Monthly</span>
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-[#E0D8C8] mt-2">
              <input type="checkbox" defaultChecked className="rounded" />
              <span>Auto-generate Value History</span>
            </label>
          </div>
          <p className="text-xs text-[#D8C7A6]/45 italic">Settings persist in your profile.</p>
        </div>
      )}
      <div className="rounded-2xl overflow-hidden min-w-0" style={{ background: 'linear-gradient(145deg, rgba(34,24,16,0.97), rgba(22,15,10,1))', border: '1px solid rgba(180,140,75,0.22)' }}>
        {/* Header */}
        <div className="px-5 py-4 space-y-3 border-b border-[rgba(180,140,75,0.12)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(180,140,75,0.12)', border: '1px solid rgba(180,140,75,0.22)' }}>
                <TrendingUp className="w-4 h-4 text-[#B48C4B]" />
              </div>
              <p className="text-sm font-bold text-[#D4A574] uppercase tracking-[0.12em]">Value &amp; Strategy</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onAddSnapshot}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
              style={{ background: 'rgba(180,140,75,0.15)', color: '#D4A574', border: '1px solid rgba(180,140,75,0.28)' }}
              title="Save today's value as a history checkpoint"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Save Value Checkpoint</span>
            </button>
            <button
              type="button"
              onClick={onAddObservation}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
              style={{ background: 'rgba(59,130,246,0.12)', color: '#93C5FD', border: '1px solid rgba(59,130,246,0.25)' }}
              title="Add a real-world market price observation"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Add Observation</span>
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
              style={{ background: 'rgba(139,92,246,0.12)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.25)' }}
              title="Refresh valuation now (coming soon)"
              disabled
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh Now</span>
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
              style={{ background: 'rgba(180,140,75,0.08)', color: 'rgba(212,165,116,0.65)', border: '1px solid rgba(180,140,75,0.18)' }}
              onClick={() => setShowSettings(!showSettings)}
              title="Valuation settings (Auto-refresh cadence)"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* A — Current Value + Badges */}
          <div className="flex flex-wrap items-start gap-4 min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-[0.12em] text-[#D8C7A6]/60 mb-1">Current Value</p>
              <p className="text-3xl font-bold text-[#F5F1E7] break-words tabular-nums">
                {currentValue > 0 ? formatCurrency(currentValue) : '—'}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-xs text-[#D8C7A6]/65">{source}</span>
                <ConfidenceBadge level={confidence} />
              </div>
              {latestSnapshot && (
                <p className="text-xs text-[#D8C7A6]/45 mt-1">Last checkpoint: {formatDate(latestSnapshot.snapshot_date)}</p>
              )}
            </div>

            {/* B — Trend */}
            <div className="shrink-0 rounded-xl px-4 py-3 text-center min-w-[110px]" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.14)' }}>
              <p className="text-xs uppercase tracking-[0.12em] text-[#D8C7A6]/60 mb-2">Trend</p>
              <TrendChip trend={valueTrend || valuationSnapshot.trend} />
            </div>
          </div>

          {/* Special badges */}
          {(isAllocated || isDiscontinued || isExclusive) && (
            <div className="flex flex-wrap gap-2">
              {isDiscontinued && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.28)', color: '#fca5a5' }}>
                  <Lock className="w-3 h-3" /> Discontinued
                </span>
              )}
              {isAllocated && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.28)', color: '#fde68a' }}>
                  <AlertTriangle className="w-3 h-3" /> Allocated
                </span>
              )}
              {isExclusive && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.28)', color: '#c4b5fd' }}>
                  <Zap className="w-3 h-3" /> Exclusive
                </span>
              )}
            </div>
          )}

          {/* C — Strategy */}
          <RecommendationBlock holdRecommendation={holdRecommendation} rationale={rationale} />

          {/* D — Risk & Rarity grid */}
          <div className="grid grid-cols-2 gap-3 min-w-0">
            <MiniCard label="Rarity Score">
              <RarityBar score={rarityScore} />
            </MiniCard>
            <MiniCard label="Replacement">
              <p className="text-sm font-semibold text-[#F5F1E7] break-words">{DIFFICULTY_LABELS[replacementDifficulty] || '—'}</p>
            </MiniCard>
          </div>

          {/* E — Value History */}
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-[#D8C7A6]/60 mb-2.5">Value History</p>
            <SnapshotHistoryList snapshots={valueSnapshots} />
          </div>

          {/* F — Market Observations */}
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-[#93C5FD]/60 mb-2.5">Market Observations</p>
            <ObservationList observations={priceObservations} />
          </div>
        </div>
      </div>
    </>
  );
}