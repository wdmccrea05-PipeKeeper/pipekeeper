/**
 * CuratorOptimizePanel — NEW v2
 *
 * Renders the "Optimize Your Collection" view using structured local analysis.
 * NO LLM calls for recommendation generation.
 *
 * Sections (in order):
 *   1. Data & Metadata
 *   2. Collection Balance
 *   3. Utilization & Rotation
 *   4. Purchase & Restock
 *   5. Specialization & Strategy
 *   6. Pairing & Experience
 *
 * Each section shows compact grouped recommendation cards.
 * Actions mutate data directly — no navigation.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { CheckCircle2, MessageCircle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { generateRecommendations } from '@/lib/curator/recommendationEngine.js';
import { groupRecommendations, getGroupSummary } from '@/lib/curator/recommendationGrouping.js';
import { executeRecommendationAction } from '@/lib/curator/recommendationActions.js';
import { CATEGORY_LABELS } from '@/lib/curator/recommendationSchema.js';
import CuratorRecommendationGroup from './CuratorRecommendationGroup';

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ label, count, isExpanded, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-1 py-2 group"
    >
      <div className="flex items-center gap-2">
        <p
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: 'rgba(180,140,75,0.85)', letterSpacing: '0.1em' }}
        >
          {label}
        </p>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
          style={{ background: 'rgba(180,140,75,0.12)', color: 'rgba(180,140,75,0.7)' }}
        >
          {count}
        </span>
      </div>
      {isExpanded
        ? <ChevronUp className="w-3.5 h-3.5" style={{ color: 'rgba(180,140,75,0.5)' }} />
        : <ChevronDown className="w-3.5 h-3.5" style={{ color: 'rgba(180,140,75,0.5)' }} />
      }
    </button>
  );
}

// ─── Module filter pills ──────────────────────────────────────────────────────

const MODULE_PILLS = [
  { key: 'all',    label: 'All' },
  { key: 'pipe',   label: 'Pipe' },
  { key: 'tobacco',label: 'Tobacco' },
  { key: 'cigar',  label: 'Cigar' },
  { key: 'whiskey',label: 'Whiskey' },
];

function recMatchesModule(rec, moduleKey) {
  if (moduleKey === 'all') return true;
  const mk = (rec.moduleKey || '').toLowerCase();
  if (mk === 'multi') return true;
  return mk === moduleKey || mk.includes(moduleKey);
}

// ─── CuratorOptimizePanel ─────────────────────────────────────────────────────

export default function CuratorOptimizePanel({
  pipes = [],
  blends = [],
  cigars = [],
  bottles = [],
  smokeLogs = [],
  tastingLogs = [],
  cigarSessions = [],
  wantListItems = [],
  onClose,
  onAskCurator,
}) {
  const [activeModule, setActiveModule]       = useState('all');
  const [collapsedSections, setCollapsedSections] = useState(new Set());
  const [dismissedIds, setDismissedIds]       = useState(new Set());
  const [actionErrors, setActionErrors]       = useState({});
  const triggerRef = React.useRef(null);

  React.useEffect(() => {
    triggerRef.current = document.activeElement;
  }, []);

  // Generate recommendations from local structured analysis (no LLM)
  const context = useMemo(() => ({
    pipes,
    blends,
    cigars,
    bottles,
    smokingLogs: smokeLogs,
    tastingLogs,
    cigarSessions,
    wantListItems,
  }), [pipes, blends, cigars, bottles, smokeLogs, tastingLogs, cigarSessions, wantListItems]);

  const allRecommendations = useMemo(() => generateRecommendations(context), [context]);

  // Filter by module and dismissed
  const visibleRecommendations = useMemo(() => {
    return allRecommendations.filter(
      (rec) => !dismissedIds.has(rec.id) && recMatchesModule(rec, activeModule)
    );
  }, [allRecommendations, dismissedIds, activeModule]);

  const sections = useMemo(() => groupRecommendations(visibleRecommendations), [visibleRecommendations]);
  const summary  = useMemo(() => getGroupSummary(sections), [sections]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleClose() {
    if (onClose) {
      onClose();
      if (triggerRef.current?.focus) {
        requestAnimationFrame(() => triggerRef.current.focus());
      }
    }
  }

  function handleToggleSection(cat) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  const handleAction = useCallback(async (actionKey, recommendation, opts = {}) => {
    setActionErrors((prev) => { const n = { ...prev }; delete n[recommendation.id]; return n; });
    try {
      const result = await executeRecommendationAction(recommendation, actionKey, opts);
      if (result?.ok) {
        // Remove the resolved recommendation from view
        setDismissedIds((prev) => new Set([...prev, recommendation.id]));
      }
      return result;
    } catch (err) {
      setActionErrors((prev) => ({ ...prev, [recommendation.id]: err?.message || 'Action failed.' }));
      throw err;
    }
  }, []);

  const handleAskCurator = useCallback((promptText) => {
    if (onAskCurator) {
      onAskCurator(promptText);
      if (onClose) onClose();
    }
  }, [onAskCurator, onClose]);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, rgba(32,22,14,0.99), rgba(20,14,9,0.99))',
        border: '1px solid rgba(140,105,65,0.22)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      {/* ── Sticky header ─────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-10 px-5 pt-5 pb-4"
        style={{
          background: 'linear-gradient(160deg, rgba(32,22,14,0.99), rgba(20,14,9,0.98))',
          borderBottom: '1px solid rgba(140,105,65,0.15)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h1
              className="text-xl sm:text-2xl font-bold leading-tight"
              style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
            >
              Optimize Your Collection
            </h1>
            <p className="text-xs mt-1" style={{ color: 'rgba(224,216,200,0.5)' }}>
              Structured improvements across data, balance, rotation, restocking, and strategy
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={handleClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover:opacity-80 flex-shrink-0 text-xs font-medium"
              style={{
                background: 'rgba(120,90,65,0.15)',
                border: '1px solid rgba(120,90,65,0.25)',
                color: 'rgba(224,216,200,0.6)',
              }}
              aria-label="Switch to Curator chat"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Switch to Chat</span>
              <X className="w-3.5 h-3.5 sm:hidden" />
            </button>
          )}
        </div>

        {/* Module filter pills */}
        <div className="flex flex-wrap gap-2">
          {MODULE_PILLS.map((pill) => {
            const isActive = activeModule === pill.key;
            return (
              <button
                key={pill.key}
                type="button"
                onClick={() => setActiveModule(pill.key)}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: isActive ? 'rgba(163,92,92,0.28)' : 'rgba(255,255,255,0.05)',
                  border: isActive ? '1px solid rgba(163,92,92,0.55)' : '1px solid rgba(120,90,65,0.2)',
                  color: isActive ? '#F5F1E7' : 'rgba(224,216,200,0.5)',
                }}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Summary bar ───────────────────────────────────────────────── */}
      {summary.totalRecs > 0 && (
        <div
          className="px-5 py-3 flex gap-4"
          style={{ borderBottom: '1px solid rgba(140,105,65,0.12)' }}
        >
          <div className="text-center">
            <p className="text-xl font-bold" style={{ color: 'rgba(224,216,200,0.8)', fontFamily: "'Georgia', serif" }}>
              {summary.totalRecs}
            </p>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(224,216,200,0.4)' }}>
              Suggestions
            </p>
          </div>
          <div className="w-px" style={{ background: 'rgba(140,105,65,0.15)' }} />
          <div className="text-center">
            <p className="text-xl font-bold" style={{ color: 'rgba(180,140,75,0.85)', fontFamily: "'Georgia', serif" }}>
              {summary.sectionCount}
            </p>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(224,216,200,0.4)' }}>
              Categories
            </p>
          </div>
          {summary.totalItems > 0 && (
            <>
              <div className="w-px" style={{ background: 'rgba(140,105,65,0.15)' }} />
              <div className="text-center">
                <p className="text-xl font-bold" style={{ color: 'rgba(224,216,200,0.6)', fontFamily: "'Georgia', serif" }}>
                  {summary.totalItems}
                </p>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(224,216,200,0.4)' }}>
                  Items
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Content ───────────────────────────────────────────────────── */}
      <div className="px-5 py-4 space-y-5">
        {sections.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{
              background: 'linear-gradient(145deg, rgba(42,30,20,0.9), rgba(28,19,13,0.95))',
              border: '1px solid rgba(74,124,92,0.25)',
            }}
          >
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: '#4A7C59' }} />
            <p
              className="text-base font-semibold mb-1"
              style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
            >
              Collection Well Optimized
            </p>
            <p className="text-sm" style={{ color: 'rgba(224,216,200,0.55)' }}>
              No immediate actions needed for the selected filter.
            </p>
          </div>
        ) : (
          sections.map((section) => {
            const isCollapsed = collapsedSections.has(section.category);
            return (
              <div key={section.category}>
                {/* Section divider */}
                <div
                  className="mb-2.5"
                  style={{ borderBottom: '1px solid rgba(140,105,65,0.12)' }}
                >
                  <SectionHeader
                    label={section.label}
                    count={section.recommendations.length}
                    isExpanded={!isCollapsed}
                    onToggle={() => handleToggleSection(section.category)}
                  />
                </div>

                {!isCollapsed && (
                  <div className="space-y-2.5">
                    {section.recommendations.map((rec) => (
                      <CuratorRecommendationGroup
                        key={rec.id}
                        recommendation={rec}
                        onAction={handleAction}
                        onAskCurator={handleAskCurator}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
