/**
 * CuratorResultsBoard — Optimize Board
 *
 * Surface 1: Main operations dashboard.
 *
 * Layout:
 *   Row 1: module filter chips  +  refresh button
 *   Row 2: 4 summary cards (Open Fixes, Review Needed, Shopping Candidates, Specialization)
 *   Rows 3+: 4 collapsible grouped sections
 *     — Data & Metadata
 *     — Utilization & Rotation
 *     — Purchase & Restock
 *     — Specialization & Strategy
 */

import React, { useState, useMemo, useCallback } from 'react';
import { RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import CuratorRecommendationGroup from './CuratorRecommendationGroup';
import { CATEGORY, ACTION_TYPE, MODULE_KEY } from '@/lib/curator/recommendationSchema.js';

// ─── Board section groups ─────────────────────────────────────────────────────

const BOARD_SECTION_GROUPS = [
  { id: 'metadata',       label: 'Record Optimization',       categories: [CATEGORY.METADATA, CATEGORY.RECORD_OPTIMIZATION] },
  { id: 'utilization',    label: 'Collection Optimization',   categories: [CATEGORY.UTILIZATION, CATEGORY.BALANCE, CATEGORY.COLLECTION_OPTIMIZATION] },
  { id: 'purchase',       label: 'Purchase & Restock',        categories: [CATEGORY.PURCHASE, CATEGORY.CIGAR_DISCOVERY] },
  { id: 'specialization', label: 'Specialization & Strategy', categories: [CATEGORY.SPECIALIZATION, CATEGORY.PAIRING] },
  { id: 'grow_expand',    label: 'Grow & Expand',             categories: [CATEGORY.GROW_EXPAND] },
];

// ─── Module filter options ────────────────────────────────────────────────────

const MODULE_FILTERS = [
  { key: 'all',              label: 'All' },
  { key: MODULE_KEY.PIPE,    label: 'Pipe' },
  { key: MODULE_KEY.TOBACCO, label: 'Tobacco' },
  { key: MODULE_KEY.WHISKEY, label: 'Whiskey' },
  { key: MODULE_KEY.CIGAR,   label: 'Cigar' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildBoardSections(sections, moduleFilter) {
  return BOARD_SECTION_GROUPS.map((group) => {
    const matchingSections = sections.filter((s) => group.categories.includes(s.category));
    let recs = matchingSections.flatMap((s) => s.recommendations || []);
    if (moduleFilter !== 'all') {
      recs = recs.filter((r) => r.moduleKey === moduleFilter || r.moduleKey === MODULE_KEY.MULTI);
    }
    return { ...group, recommendations: recs };
  }).filter((g) => g.recommendations.length > 0);
}

function computeSummary(sections) {
  const allRecs = sections.flatMap((s) => s.recommendations || []);
  return {
    openFixes:      allRecs.filter((r) => r.actionType === ACTION_TYPE.AUTO_FIX).length,
    reviewNeeded:   allRecs.filter((r) => r.actionType === ACTION_TYPE.REVIEW_REQUIRED).length,
    shoppingItems:  allRecs
      .filter((r) => r.actionType === ACTION_TYPE.SHOPPING_LIST_ACTION)
      .reduce((sum, r) => sum + (r.items?.length || 0), 0),
    specCandidates: allRecs
      .filter((r) => r.category === CATEGORY.SPECIALIZATION)
      .reduce((sum, r) => sum + (r.items?.filter((i) => i.hasLogData)?.length || 0), 0),
  };
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({ value, label, color, subtext }) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1 min-w-0"
      style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}25` }}
    >
      <span
        className="text-2xl font-bold tabular-nums leading-none"
        style={{ color }}
      >
        {value}
      </span>
      <span className="text-xs font-semibold leading-tight" style={{ color: 'rgba(224,216,200,0.75)' }}>
        {label}
      </span>
      {subtext && (
        <span className="text-[10px] leading-tight" style={{ color: 'rgba(224,216,200,0.35)' }}>
          {subtext}
        </span>
      )}
    </div>
  );
}

// ─── Collapsible board section ────────────────────────────────────────────────

function BoardSection({ group, onAction, onOpenSpecialization, onOpenPurchase }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center gap-2 py-1 group"
        aria-expanded={!collapsed}
      >
        <span
          className="text-[11px] font-bold uppercase tracking-widest shrink-0"
          style={{ color: 'rgba(224,216,200,0.45)' }}
        >
          {group.label}
        </span>
        <div className="flex-1 h-px" style={{ background: 'rgba(140,105,65,0.15)' }} />
        <span
          className="text-[11px] px-2 py-0.5 rounded-full tabular-nums shrink-0"
          style={{ background: 'rgba(80,80,80,0.1)', color: 'rgba(224,216,200,0.4)', border: '1px solid rgba(100,100,100,0.18)' }}
        >
          {group.recommendations.length}
        </span>
        {collapsed
          ? <ChevronDown className="w-3 h-3 shrink-0" style={{ color: 'rgba(224,216,200,0.3)' }} />
          : <ChevronUp   className="w-3 h-3 shrink-0" style={{ color: 'rgba(224,216,200,0.3)' }} />}
      </button>

      {!collapsed && (
        <div className="space-y-2.5">
          {group.recommendations.map((rec) => (
            <CuratorRecommendationGroup
              key={rec.id}
              recommendation={rec}
              onAction={onAction}
              onOpenSpecialization={onOpenSpecialization}
              onOpenPurchase={onOpenPurchase}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ moduleFilter, onRefresh }) {
  return (
    <div className="py-16 text-center space-y-3">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mx-auto text-xl"
        style={{ background: 'rgba(74,124,92,0.1)', border: '1px solid rgba(74,124,92,0.2)' }}
      >
        ✓
      </div>
      <p className="text-sm font-semibold" style={{ color: 'rgba(224,216,200,0.7)' }}>
        {moduleFilter !== 'all'
          ? `No recommendations for ${moduleFilter} items`
          : 'No recommendations — collection looks good'}
      </p>
      <p className="text-xs max-w-xs mx-auto" style={{ color: 'rgba(224,216,200,0.4)' }}>
        {moduleFilter !== 'all'
          ? 'Try a different module filter or select All.'
          : 'Nothing to flag right now. Add more collection data for deeper analysis.'}
      </p>
      <button
        type="button"
        onClick={onRefresh}
        className="text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 mx-auto"
        style={{ background: 'rgba(74,124,92,0.12)', color: 'rgba(80,180,130,0.9)', border: '1px solid rgba(74,124,92,0.25)' }}
      >
        <RefreshCw className="w-3 h-3" />
        Refresh Analysis
      </button>
    </div>
  );
}

// ─── CuratorResultsBoard ─────────────────────────────────────────────────────

/**
 * @param {object}   props
 * @param {object[]} props.sections             - Grouped sections from recommendationGrouping
 * @param {Function} props.onAction             - (actionKey, rec, opts) => Promise
 * @param {Function} props.onOpenSpecialization - () => void
 * @param {Function} props.onOpenPurchase       - () => void
 * @param {Function} props.onRefresh            - () => void
 */
export default function CuratorResultsBoard({
  sections = [],
  onAction,
  onOpenSpecialization,
  onOpenPurchase,
  onRefresh,
}) {
  const [moduleFilter, setModuleFilter] = useState('all');

  const boardGroups = useMemo(
    () => buildBoardSections(sections, moduleFilter),
    [sections, moduleFilter]
  );

  const summary = useMemo(() => computeSummary(sections), [sections]);

  const handleRefresh = useCallback(() => onRefresh?.(), [onRefresh]);

  return (
    <div className="space-y-5">
      {/* Row 1: module filter chips + refresh */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-wrap gap-1.5">
          {MODULE_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setModuleFilter(key)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
              style={
                moduleFilter === key
                  ? { background: 'rgba(140,105,65,0.25)', color: '#F5F1E7', border: '1px solid rgba(140,105,65,0.4)' }
                  : { background: 'rgba(255,255,255,0.04)', color: 'rgba(224,216,200,0.5)', border: '1px solid rgba(140,105,65,0.12)' }
              }
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(224,216,200,0.45)', border: '1px solid rgba(140,105,65,0.12)' }}
          title="Refresh analysis"
        >
          <RefreshCw className="w-3 h-3" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Row 2: 4 summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard
          value={summary.openFixes}
          label="Open Fixes"
          color="rgba(80,180,130,0.9)"
          subtext="auto-fixable"
        />
        <SummaryCard
          value={summary.reviewNeeded}
          label="Review Needed"
          color="rgba(212,165,116,0.9)"
          subtext="require your input"
        />
        <SummaryCard
          value={summary.shoppingItems}
          label="Shopping Candidates"
          color="rgba(160,200,240,0.9)"
          subtext="ready to queue"
        />
        <SummaryCard
          value={summary.specCandidates}
          label="Specialization"
          color="rgba(200,155,100,0.9)"
          subtext="evidence-backed"
        />
      </div>

      {/* Rows 3+: grouped collapsible sections */}
      {boardGroups.length === 0 ? (
        <EmptyState moduleFilter={moduleFilter} onRefresh={handleRefresh} />
      ) : (
        <div className="space-y-5">
          {boardGroups.map((group) => (
            <BoardSection
              key={group.id}
              group={group}
              onAction={onAction}
              onOpenSpecialization={onOpenSpecialization}
              onOpenPurchase={onOpenPurchase}
            />
          ))}
        </div>
      )}
    </div>
  );
}
