/**
 * ValueStrategySection
 * Polished "Value & Strategy" block for any item type.
 * Consumes canonical valueEngine output — NO local valuation logic.
 */
import React, { useState } from 'react';
import {
  TrendingUp, TrendingDown, Minus, ShieldCheck, Unlock, HelpCircle,
  PlusCircle, Eye, ChevronDown, ChevronUp, Lock, Zap, AlertTriangle, RefreshCw, Settings,
} from 'lucide-react';
import { useCurrency } from '@/lib/currency/useCurrency';
import { useTranslation } from '@/components/i18n/safeTranslation';

// -- tiny helpers ---------------------------------------------------------------

function formatDate(v) {
  if (!v) return '--';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '--';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function CapitalizeFirst(str) {
  if (!str) return '--';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// -- sub-components -------------------------------------------------------------

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
  }[trend] || { icon: HelpCircle, color: '#9ca3af', label: '--' };
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: cfg.color }}>
      <Icon className="w-4 h-4" />
      {cfg.label}
    </span>
  );
}

const RECOMMENDATION_CONFIG = {
  // Whiskey
  hold: {
    icon: ShieldCheck,
    bg: 'rgba(239,68,68,0.07)',
    border: 'rgba(239,68,68,0.28)',
    iconColor: '#fca5a5',
    textColor: '#fca5a5',
    label: 'Hold',
    sublabel: 'Strategic value -- preserve this item',
  },
  open: {
    icon: Unlock,
    bg: 'rgba(16,185,129,0.07)',
    border: 'rgba(16,185,129,0.28)',
    iconColor: '#6ee7b7',
    textColor: '#6ee7b7',
    label: 'Safe to Open',
    sublabel: 'Low replacement risk -- enjoy freely',
  },
  open_if_duplicate: {
    icon: Zap,
    bg: 'rgba(251,191,36,0.07)',
    border: 'rgba(251,191,36,0.28)',
    iconColor: '#fbbf24',
    textColor: '#fbbf24',
    label: 'Open if Duplicate',
    sublabel: 'You have a backup -- opening is low risk',
  },
  either: {
    icon: HelpCircle,
    bg: 'rgba(180,140,75,0.07)',
    border: 'rgba(180,140,75,0.22)',
    iconColor: '#D4A574',
    textColor: '#D4A574',
    label: 'Your Call',
    sublabel: 'Mixed signals -- personal preference applies',
  },
  // Pipes
  use: {
    icon: Unlock,
    bg: 'rgba(16,185,129,0.07)',
    border: 'rgba(16,185,129,0.28)',
    iconColor: '#6ee7b7',
    textColor: '#6ee7b7',
    label: 'Use Freely',
    sublabel: 'Available and replaceable -- enjoy your pipe',
  },
  rotate: {
    icon: HelpCircle,
    bg: 'rgba(180,140,75,0.07)',
    border: 'rgba(180,140,75,0.22)',
    iconColor: '#D4A574',
    textColor: '#D4A574',
    label: 'Include in Rotation',
    sublabel: 'Moderately rare -- smoke thoughtfully and maintain well',
  },
  preserve: {
    icon: ShieldCheck,
    bg: 'rgba(239,68,68,0.07)',
    border: 'rgba(239,68,68,0.28)',
    iconColor: '#fca5a5',
    textColor: '#fca5a5',
    label: 'Preserve -- Limit Use',
    sublabel: 'Rare or vintage pipe -- minimize use to protect collector value',
  },
  insure: {
    icon: ShieldCheck,
    bg: 'rgba(139,92,246,0.07)',
    border: 'rgba(139,92,246,0.28)',
    iconColor: '#c4b5fd',
    textColor: '#c4b5fd',
    label: 'Preserve & Insure',
    sublabel: 'Extremely rare and irreplaceable -- formal coverage recommended',
  },
  // Tobacco
  smoke_now: {
    icon: Unlock,
    bg: 'rgba(16,185,129,0.07)',
    border: 'rgba(16,185,129,0.28)',
    iconColor: '#6ee7b7',
    textColor: '#6ee7b7',
    label: 'Smoke Now',
    sublabel: 'Widely available -- enjoy at your own pace',
  },
  smoke_later: {
    icon: HelpCircle,
    bg: 'rgba(180,140,75,0.07)',
    border: 'rgba(180,140,75,0.22)',
    iconColor: '#D4A574',
    textColor: '#D4A574',
    label: 'Save for Later',
    sublabel: 'Limited availability -- save for special occasions',
  },
  cellar: {
    icon: ShieldCheck,
    bg: 'rgba(59,130,246,0.07)',
    border: 'rgba(59,130,246,0.28)',
    iconColor: '#93C5FD',
    textColor: '#93C5FD',
    label: 'Cellar for Aging',
    sublabel: 'Age remaining stock for enhanced flavor',
  },
  hold_for_trade: {
    icon: Zap,
    bg: 'rgba(239,68,68,0.07)',
    border: 'rgba(239,68,68,0.28)',
    iconColor: '#fca5a5',
    textColor: '#fca5a5',
    label: 'Hold for Trade',
    sublabel: 'Scarce blend -- secondary value may appreciate',
  },
};

function RecommendationBlock({ holdRecommendation, rationale, moduleKey, itemType }) {
  const { t } = useTranslation();
  const cfg = RECOMMENDATION_CONFIG[holdRecommendation] || RECOMMENDATION_CONFIG.either;
  const Icon = cfg.icon;
  return (
    <div className="rounded-xl p-4 min-w-0" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(0,0,0,0.2)' }}>
          <Icon className="w-4 h-4" style={{ color: cfg.iconColor }} />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.12em] text-[#D8C7A6]/60">{t("auto.components_whiskey_ValueStrategySection.strategy_22l3dk")}</p>
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

function ReplacementDifficultyDots({ level }) {
  const LEVELS = ['very_easy', 'easy', 'moderate', 'hard', 'very_hard'];
  const LEVEL_LABELS = {
    very_easy: 'Very Easy to Replace',
    easy:      'Easy to Replace',
    moderate:  'Moderately Difficult',
    hard:      'Hard to Replace',
    very_hard: 'Very Hard / Rare',
  };
  const LEVEL_COLORS = {
    very_easy: '#4ade80',
    easy:      '#86efac',
    moderate:  '#fbbf24',
    hard:      '#fb923c',
    very_hard: '#f87171',
  };

  const activeIdx  = LEVELS.indexOf(level);
  const filledCount = activeIdx === -1 ? 1 : activeIdx + 1;
  const activeColor = LEVEL_COLORS[level] || LEVEL_COLORS.easy;
  const label       = LEVEL_LABELS[level] || '--';

  return (
    <div className="mt-1.5 space-y-2">
      <div className="flex items-center gap-1.5">
        {LEVELS.map((_, i) => (
          <div
            key={i}
            className="flex-1 h-2 rounded-full transition-all"
            style={{
              background: i < filledCount ? activeColor : 'rgba(255,255,255,0.06)',
              boxShadow: i < filledCount ? `0 0 6px ${activeColor}55` : 'none',
            }}
          />
        ))}
      </div>
      <p className="text-sm font-semibold" style={{ color: activeColor }}>
        {label}
      </p>
    </div>
  );
}

function SnapshotHistoryList({ snapshots, formatFn }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const displayed = expanded ? snapshots : snapshots.slice(0, 3);
  if (snapshots.length === 0) {
    return (
      <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(180,140,75,0.1)' }}>
        <p className="text-xs text-[#D8C7A6]/50">{t("auto.components_whiskey_ValueStrategySection.no_checkpoints_yet_1agy6r")}</p>
        <p className="text-xs text-[#D8C7A6]/40 mt-1">{t("auto.components_whiskey_ValueStrategySection.save_a_checkpoint_to_start_tracking_1p36ac")}</p>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {displayed.map((snap, i) => (
        <div key={snap.id || i} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-xs min-w-0" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.1)' }}>
          <span className="text-[#D8C7A6]/65 shrink-0">{formatDate(snap.snapshot_date)}</span>
          <span className="font-semibold text-[#F5F1E7] tabular-nums">{snap.computed_current_value > 0 ? formatFn(snap.computed_current_value) : '--'}</span>
          <span className="text-[#D8C7A6]/45 truncate min-w-0">{snap.source || snap.price_type || '--'}</span>
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

function ObservationList({ observations, formatFn }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const displayed = expanded ? observations : observations.slice(0, 3);
  if (observations.length === 0) {
    return (
      <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(59,130,246,0.12)' }}>
        <p className="text-xs text-[#D8C7A6]/50">{t("auto.components_whiskey_ValueStrategySection.no_observations_yet_lhwdw3")}</p>
        <p className="text-xs text-[#D8C7A6]/40 mt-1">{t("auto.components_whiskey_ValueStrategySection.add_observations_to_track_real_world_d35n2g")}</p>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {displayed.map((obs, i) => (
        <div key={obs.id || i} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-xs min-w-0" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(59,130,246,0.12)' }}>
          <span className="text-[#D8C7A6]/65 shrink-0">{formatDate(obs.observed_date)}</span>
          <span className="font-semibold text-[#F5F1E7] tabular-nums">{obs.observed_price > 0 ? formatFn(obs.observed_price) : '--'}</span>
          <span className="text-[#93C5FD]/70 truncate min-w-0">{obs.source_name || '--'}</span>
          <span className="text-[#D8C7A6]/45 shrink-0 uppercase tracking-wide">{obs.price_type || '--'}</span>
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

// -- Main exported component ----------------------------------------------------

/**
 * ValueStrategySection -- universal "Value & Strategy" block.
 * Works for bottles (whiskeykeeper), pipes, and tobacco blends (pipekeeper).
 *
 * Props:
 *  valuationSnapshot  -- output of buildValuationSnapshot()
 *  valueTrend         -- 'up' | 'down' | 'flat' | 'unknown'
 *  valueSnapshots     -- array of ItemValueSnapshot records for this item
 *  priceObservations  -- array of PriceObservation records for this item
 *  item               -- the raw item record (replaces old `bottle` prop)
 *  bottle             -- alias for item; kept for backward compatibility
 *  moduleKey          -- 'pipekeeper' | 'whiskeykeeper' | ...
 *  itemType           -- 'pipe' | 'tobacco' | 'bottle' | ...
 *  onAddSnapshot      -- callback to open save-checkpoint modal
 *  onAddObservation   -- callback to open add-observation modal
 *  onEditValuation    -- callback to open edit-valuation-inputs modal (optional)
 *  onRefreshNow       -- callback to recompute and save a new snapshot immediately (optional)
 *  isRefreshing       -- true while a refresh is in progress (shows spinner)
 */
export default function ValueStrategySection({
  valuationSnapshot,
  valueTrend,
  valueSnapshots = [],
  priceObservations = [],
  item,
  bottle,           // backward compat alias
  moduleKey = 'whiskeykeeper',
  itemType = 'bottle',
  onAddSnapshot,
  onAddObservation,
  onEditValuation,
  onRefreshNow,
  isRefreshing = false,
}) {
  const { t } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);
  const { formatFromBase } = useCurrency();

  if (!valuationSnapshot) return null;

  const resolvedItem = item || bottle;

  const { rarityScore, replacementDifficulty, holdRecommendation, rationale } = valuationSnapshot;

  // Resolve displayed value: fall back to latest saved snapshot when direct fields are empty
  const latestSavedSnap = valueSnapshots[0];
  const currentValue = valuationSnapshot.currentValue > 0
    ? valuationSnapshot.currentValue
    : (latestSavedSnap && latestSavedSnap.computed_current_value > 0 ? latestSavedSnap.computed_current_value : 0);
  const source = valuationSnapshot.currentValue > 0
    ? valuationSnapshot.source
    : (latestSavedSnap && latestSavedSnap.computed_current_value > 0 ? (latestSavedSnap.source || 'Snapshot') : valuationSnapshot.source);
  const confidence = valuationSnapshot.currentValue > 0
    ? valuationSnapshot.confidence
    : (latestSavedSnap && latestSavedSnap.value_confidence ? latestSavedSnap.value_confidence : valuationSnapshot.confidence);

  // Determine status badges to show based on item type and data
  const isAllocated = !!(resolvedItem?.production_status === 'Allocated' || resolvedItem?.allocated);
  const isDiscontinued = !!(resolvedItem?.production_status === 'Discontinued' || resolvedItem?.discontinued);
  const isExclusive = !!(resolvedItem?.production_status === 'Exclusive' || resolvedItem?.exclusive);
  // Pipe / tobacco specific badges
  const isOneOfAKind = !!(resolvedItem?.one_of_a_kind || resolvedItem?.is_one_of_a_kind);
  const isMakerDeceased = !!(resolvedItem?.maker_deceased || (resolvedItem?.maker_status || '').toLowerCase().includes('deceased'));
  const isMakerRetired = !!(resolvedItem?.maker_retired || (resolvedItem?.maker_status || '').toLowerCase().includes('retired') || (resolvedItem?.maker_status || '').toLowerCase().includes('no longer'));
  const isSeasonal = !!(resolvedItem?.seasonal || resolvedItem?.is_seasonal || (resolvedItem?.production_status || '').toLowerCase().includes('seasonal'));

  const latestSnapshot = valueSnapshots[0];

  return (
    <>
      {showSettings && (
        <div className="rounded-2xl p-4 mb-4 space-y-3" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.18)' }}>
          <p className="text-xs uppercase tracking-[0.12em] text-[#c4b5fd]/70 font-semibold">{t("auto.components_whiskey_ValueStrategySection.auto_refresh_settings_ei1d63")}</p>
          <div className="space-y-2.5">
            <label className="flex items-center gap-2 text-sm text-[#E0D8C8]">
              <input type="checkbox" defaultChecked className="rounded" />
              <span>{t("auto.components_whiskey_ValueStrategySection.auto_refresh_value_23jn07")}</span>
            </label>
            <div className="text-xs text-[#D8C7A6]/55 space-y-1.5 ml-6">
              <label className="flex items-center gap-2">
                <input type="radio" name="refresh-cadence" value="weekly" defaultChecked />
                <span>{t("auto.components_whiskey_ValueStrategySection.weekly_1ojaae")}</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="refresh-cadence" value="monthly" />
                <span>{t("auto.components_whiskey_ValueStrategySection.monthly_ez3fqo")}</span>
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-[#E0D8C8] mt-2">
              <input type="checkbox" defaultChecked className="rounded" />
              <span>{t("auto.components_whiskey_ValueStrategySection.auto_generate_value_history_1lavip")}</span>
            </label>
          </div>
          <p className="text-xs text-[#D8C7A6]/45 italic">{t("auto.components_whiskey_ValueStrategySection.settings_persist_in_your_profile_dldjb9")}</p>
        </div>
      )}
      <div className="rounded-2xl overflow-hidden min-w-0" style={{ background: 'linear-gradient(145deg, rgba(34,24,16,0.97), rgba(22,15,10,1))', border: '1px solid rgba(180,140,75,0.22)' }}>
        {/* Header */}
        <div className="px-5 py-4 space-y-3 border-b border-[rgba(180,140,75,0.12)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(180,140,75,0.12)', border: '1px solid rgba(180,140,75,0.22)' }}>
              <TrendingUp className="w-4 h-4 text-[#B48C4B]" />
            </div>
            <p className="text-sm font-bold text-[#D4A574] uppercase tracking-[0.12em]">{t("auto.components_whiskey_ValueStrategySection.value_and_strategy_1bnfwi")}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 auto-rows-max">
            <button
              type="button"
              onClick={onAddSnapshot}
              className="flex items-center justify-center gap-1.5 text-xs px-2.5 py-2 rounded-lg font-medium transition-colors min-h-[36px] whitespace-nowrap"
              style={{ background: 'rgba(180,140,75,0.15)', color: '#D4A574', border: '1px solid rgba(180,140,75,0.28)' }}
              title={t("auto.components_whiskey_ValueStrategySection.save_today_s_value_as_a_1g46ng")}
            >
              <PlusCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline">{t("auto.components_whiskey_ValueStrategySection.save_checkpoint_1tg0r4")}</span>
            </button>
            <button
              type="button"
              onClick={onAddObservation}
              className="flex items-center justify-center gap-1.5 text-xs px-2.5 py-2 rounded-lg font-medium transition-colors min-h-[36px] whitespace-nowrap"
              style={{ background: 'rgba(59,130,246,0.12)', color: '#93C5FD', border: '1px solid rgba(59,130,246,0.25)' }}
              title={t("auto.components_whiskey_ValueStrategySection.add_a_real_world_market_price_42jirv")}
            >
              <Eye className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline">{t("auto.components_whiskey_ValueStrategySection.add_observation_1v7odn")}</span>
            </button>
            {onEditValuation && (
              <button
                type="button"
                onClick={onEditValuation}
                className="flex items-center justify-center gap-1.5 text-xs px-2.5 py-2 rounded-lg font-medium transition-colors min-h-[36px] whitespace-nowrap"
                style={{ background: 'rgba(251,191,36,0.10)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.22)' }}
                title={t("auto.components_whiskey_ValueStrategySection.edit_valuation_inputs_1jab0w")}
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden xs:inline">{t("auto.components_whiskey_ValueStrategySection.edit_inputs_166519")}</span>
              </button>
            )}
            {onRefreshNow && (
              <button
                type="button"
                onClick={onRefreshNow}
                disabled={isRefreshing}
                className="flex items-center justify-center gap-1.5 text-xs px-2.5 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 min-h-[36px] whitespace-nowrap"
                style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.28)' }}
                title={t("auto.components_whiskey_ValueStrategySection.recompute_and_save_a_new_value_1kboiu")}
              >
                <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden xs:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            )}
            <button
              type="button"
              className="flex items-center justify-center gap-1.5 text-xs px-2.5 py-2 rounded-lg font-medium transition-colors min-h-[36px]"
              style={{ background: 'rgba(180,140,75,0.08)', color: 'rgba(212,165,116,0.65)', border: '1px solid rgba(180,140,75,0.18)' }}
              onClick={() => setShowSettings(!showSettings)}
              title={t("auto.components_whiskey_ValueStrategySection.valuation_settings_1x8lnz")}
            >
              <Settings className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* A -- Current Value + Badges */}
          <div className="flex flex-wrap items-start gap-4 min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-[0.12em] text-[#D8C7A6]/60 mb-1">{t("auto.components_whiskey_ValueStrategySection.current_value_ugkd51")}</p>
              <p className="text-3xl font-bold text-[#F5F1E7] break-words tabular-nums">
                {currentValue > 0 ? formatFromBase(currentValue) : '--'}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-xs text-[#D8C7A6]/65">{source}</span>
                <ConfidenceBadge level={confidence} />
              </div>
              {latestSnapshot && (
                <p className="text-xs text-[#D8C7A6]/45 mt-1">{t("auto.components_whiskey_ValueStrategySection.last_checkpoint_1djz7w")} {formatDate(latestSnapshot.snapshot_date)}</p>
              )}
            </div>

            {/* B -- Trend */}
            <div className="shrink-0 rounded-xl px-4 py-3 text-center min-w-[110px]" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.14)' }}>
              <p className="text-xs uppercase tracking-[0.12em] text-[#D8C7A6]/60 mb-2">{t("auto.components_whiskey_ValueStrategySection.trend_3xoqn6")}</p>
              <TrendChip trend={valueTrend || valuationSnapshot.trend} />
            </div>
          </div>

          {/* Special badges */}
          {(isAllocated || isDiscontinued || isExclusive || isOneOfAKind || isMakerDeceased || isMakerRetired || isSeasonal) && (
            <div className="flex flex-wrap gap-2">
              {isDiscontinued && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.28)', color: '#fca5a5' }}>
                  <Lock className="w-3 h-3" /> {t("auto.components_whiskey_ValueStrategySection.discontinued_10hh6x")}
                </span>
              )}
              {isAllocated && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.28)', color: '#fde68a' }}>
                  <AlertTriangle className="w-3 h-3" /> {t("auto.components_whiskey_ValueStrategySection.allocated_1e9tua")}
                </span>
              )}
              {isExclusive && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.28)', color: '#c4b5fd' }}>
                  <Zap className="w-3 h-3" /> {t("auto.components_whiskey_ValueStrategySection.exclusive_1q2st6")}
                </span>
              )}
              {isOneOfAKind && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.28)', color: '#6ee7b7' }}>
                  <ShieldCheck className="w-3 h-3" /> {t("auto.components_whiskey_ValueStrategySection.one_of_a_kind_gcqqub")}
                </span>
              )}
              {isMakerDeceased && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.28)', color: '#fca5a5' }}>
                  <Lock className="w-3 h-3" /> {t("auto.components_whiskey_ValueStrategySection.maker_deceased_v0k7sz")}
                </span>
              )}
              {isMakerRetired && !isMakerDeceased && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.28)', color: '#fde68a' }}>
                  <AlertTriangle className="w-3 h-3" /> {t("auto.components_whiskey_ValueStrategySection.maker_retired_e0otic")}
                </span>
              )}
              {isSeasonal && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(180,140,75,0.1)', border: '1px solid rgba(180,140,75,0.28)', color: '#D4A574' }}>
                  <Zap className="w-3 h-3" /> {t("auto.components_whiskey_ValueStrategySection.seasonal_q71x4r")}
                </span>
              )}
            </div>
          )}

          {/* C -- Strategy */}
          <RecommendationBlock holdRecommendation={holdRecommendation} rationale={rationale} moduleKey={moduleKey} itemType={itemType} />

          {/* D -- Replacement Difficulty */}
          <div className="rounded-xl p-4 min-w-0" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.14)' }}>
            <p className="text-xs uppercase tracking-[0.12em] text-[#D8C7A6]/60 mb-2 font-semibold">{t("auto.components_whiskey_ValueStrategySection.replacement_difficulty_i84seg")}</p>
            <ReplacementDifficultyDots level={replacementDifficulty} />
          </div>

          {/* E -- Value History */}
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-[#D8C7A6]/60 mb-2.5">{t("auto.components_whiskey_ValueStrategySection.value_history_1q69dj")}</p>
            <SnapshotHistoryList snapshots={valueSnapshots} formatFn={formatFromBase} />
          </div>

          {/* F -- Market Observations */}
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-[#93C5FD]/60 mb-2.5">{t("auto.components_whiskey_ValueStrategySection.market_observations_1n20gr")}</p>
            <ObservationList observations={priceObservations} formatFn={formatFromBase} />
          </div>
        </div>
      </div>
    </>
  );
}