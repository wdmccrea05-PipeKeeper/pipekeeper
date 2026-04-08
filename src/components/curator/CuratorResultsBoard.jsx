/**
 * CuratorResultsBoard — Record Optimization surface
 */

import React, { useState, useMemo, useCallback } from 'react';
import { RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import CuratorRecommendationGroup from './CuratorRecommendationGroup';
import { CATEGORY, ACTION_TYPE, MODULE_KEY } from '@/lib/curator/recommendationSchema.js';

const BOARD_SECTION_GROUPS = [
  { id: 'record_opt', label: 'Collection Health', categories: [CATEGORY.RECORD_OPTIMIZATION, CATEGORY.METADATA] },
];

const MODULE_FILTERS = [
  { key: 'all',              label: 'All' },
  { key: MODULE_KEY.PIPE,    label: 'Pipe' },
  { key: MODULE_KEY.TOBACCO, label: 'Tobacco' },
  { key: MODULE_KEY.WHISKEY, label: 'Whiskey' },
  { key: MODULE_KEY.CIGAR,   label: 'Cigar' },
];

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
    openFixes:    allRecs.filter((r) => r.actionType === ACTION_TYPE.AUTO_FIX).length,
    reviewNeeded: allRecs.filter((r) => r.actionType === ACTION_TYPE.REVIEW_REQUIRED).length,
    totalRecords: allRecs.reduce((sum, r) => sum + (r.items?.length || 0), 0),
  };
}

function SummaryCard({ value, label, color, subtext }) {
  return (
    <div
      className="flex flex-col gap-2 min-w-0"
      style={{
        background: 'linear-gradient(145deg, #17171A 0%, #111113 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '18px',
        padding: '24px',
      }}
    >
      <span className="tabular-nums leading-none" style={{ color, fontSize: '32px', fontWeight: 700 }}>
        {value}
      </span>
      <span style={{ color: '#F5F5F7', fontSize: '16px', fontWeight: 600 }}>{label}</span>
      {subtext && <span style={{ color: '#71717A', fontSize: '13px' }}>{subtext}</span>}
    </div>
  );
}

function BoardSection({ group, onAction, onOpenSpecialization, onOpenPurchase }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center gap-2 py-1"
        aria-expanded={!collapsed}
      >
        <span className="text-[11px] font-bold uppercase tracking-widest shrink-0" style={{ color: 'rgba(224,216,200,0.45)' }}>
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
              rec={rec}
              onAction={onAction}
              onOpenGrowExpand={onOpenSpecialization}
            />
          ))}
        </div>
      )}
    </div>
  );
}

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
      {/* Module filter chips + refresh */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-wrap gap-1.5">
          {MODULE_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setModuleFilter(key)}
              className="font-semibold transition-all"
              style={{
                fontSize: '13px',
                padding: '6px 14px',
                borderRadius: '999px',
                ...(moduleFilter === key
                  ? { background: '#C6A15B', color: '#0B0B0C', border: 'none' }
                  : { background: 'transparent', color: '#A1A1AA', border: '1px solid rgba(255,255,255,0.1)' })
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 font-semibold transition-all"
          style={{ background: 'transparent', color: '#A1A1AA', border: '1px solid rgba(255,255,255,0.1)', fontSize: '13px', padding: '6px 14px', borderRadius: '12px' }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* 3 summary tiles — derived from sections prop */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard value={summary.openFixes}    label="Auto-Fixable"   color="rgba(80,180,130,0.9)"  subtext="apply in one click" />
        <SummaryCard value={summary.reviewNeeded} label="Review Needed"  color="rgba(212,165,116,0.9)" subtext="require your input" />
        <SummaryCard value={summary.totalRecords} label="Total Records"  color="rgba(160,200,240,0.9)" subtext="across all issues" />
      </div>

      {boardGroups.length === 0 ? (
        <EmptyState moduleFilter={moduleFilter} onRefresh={handleRefresh} />
      ) : (
        <div className="space-y-8">
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
