/**
 * CuratorOptimizePanel
 *
 * Renders the "Optimize Your Collection" view.
 *
 * RENDERING PATH:
 *   1. Calls executeCuratorAction({ actionType: 'optimize_collection', context })
 *   2. Receives { groups } from the executor (already deduplicated + grouped)
 *   3. Renders each group via CuratorRecommendationGroup
 *
 * APPLY FIX:
 *   - Calls applyCuratorRecommendation(item) directly (no navigation)
 *   - Removes the applied item from local state immediately (refreshState)
 *
 * Old per-item card rendering path (SectionGroup / RecommendationCard) has been removed.
 */

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { CheckCircle2, MessageCircle, X, Loader2, AlertTriangle } from 'lucide-react';
import { executeCuratorAction } from './curatorActionExecutor';
import { applyCuratorRecommendation } from './curatorActionApply';
import CuratorRecommendationGroup from './CuratorRecommendationGroup';

// ─── Module filter pills ──────────────────────────────────────────────────────

const MODULE_PILLS = [
  { key: 'all', label: 'All' },
  { key: 'pipe', label: 'Pipe' },
  { key: 'tobacco', label: 'Tobacco' },
  { key: 'cigar', label: 'Cigar' },
  { key: 'whiskey', label: 'Whiskey' },
];

// ─── Module key helper ────────────────────────────────────────────────────────

function itemMatchesModule(item, moduleKey) {
  if (moduleKey === 'all') return true;
  const rt = (item.recordType || '').toLowerCase();
  switch (moduleKey) {
    case 'pipe':    return rt === 'pipe';
    case 'tobacco': return rt === 'blend' || rt === 'tobacco';
    case 'cigar':   return rt === 'cigar';
    case 'whiskey': return rt === 'bottle' || rt === 'whiskey';
    default:        return true;
  }
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
  const [rawGroups, setRawGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [applyError, setApplyError] = useState(null);
  const [activeModule, setActiveModule] = useState('all');
  const triggerElementRef = useRef(null);

  // Build the collection context that the executor needs
  const context = useMemo(() => ({
    pipes,
    blends,
    cigars,
    bottles,
    smokingLogs: smokeLogs,
    tastingLogs,
    cigarSessions,
    wantListItems,
  }), [
    pipes, blends, cigars, bottles,
    smokeLogs, tastingLogs, cigarSessions, wantListItems,
  ]);

  // Capture focus trigger on mount
  useEffect(() => {
    triggerElementRef.current = document.activeElement;
  }, []);

  // Run the executor once per mount. The optimize call is expensive (LLM) and is
  // triggered by user intent (opening the panel), so a single run on mount is correct.
  // Collection data is captured via the context ref at call time.
  const contextRef = useRef(context);
  contextRef.current = context;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    executeCuratorAction({ actionType: 'optimize_collection', context: contextRef.current, requestId: `opt_${Date.now()}` })
      .then((result) => {
        if (cancelled) return;
        setRawGroups(
          (result?.groups || []).map((g) => ({
            ...g,
            itemCount: g.items?.length ?? 0,
          }))
        );
        setIsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[CuratorOptimizePanel] executor failed:', err);
        setError(err?.message || 'Failed to load recommendations.');
        setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — intentionally runs once per mount

  // Filter groups by active module
  const filteredGroups = useMemo(() => {
    if (activeModule === 'all') return rawGroups;
    return rawGroups
      .map((g) => {
        const items = (g.items || []).filter((item) => itemMatchesModule(item, activeModule));
        return { ...g, items, itemCount: items.length };
      })
      .filter((g) => g.items.length > 0);
  }, [rawGroups, activeModule]);

  const totalItems = filteredGroups.reduce((sum, g) => sum + (g.items?.length ?? 0), 0);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleClose() {
    if (onClose) {
      onClose();
      if (triggerElementRef.current?.focus) {
        requestAnimationFrame(() => triggerElementRef.current.focus());
      }
    }
  }

  /**
   * executeFix: apply the recommendation directly via the apply handler.
   * persist: applyCuratorRecommendation already persists to the DB.
   * refreshState: remove the item from local groups so the UI updates instantly.
   */
  async function handleAcceptItem(item) {
    setApplyError(null);
    try {
      await applyCuratorRecommendation(item);
      // refreshState — remove the applied item from all groups only after successful persist
      setRawGroups((prev) =>
        prev
          .map((g) => ({
            ...g,
            items: (g.items || []).filter((i) => i.id !== item.id),
            itemCount: Math.max(0, (g.itemCount ?? 0) - 1),
          }))
          .filter((g) => (g.items?.length ?? 0) > 0)
      );
    } catch (err) {
      console.error('[CuratorOptimizePanel] apply failed:', err);
      setApplyError(err?.message || 'Could not apply the fix. Please try again.');
    }
  }

  function handleClarifyItem(item) {
    if (!onAskCurator) return;
    const prompt =
      item._clarifyPrompt ||
      `Tell me more about: "${item.title || item.itemName}". ${item.issue || ''} What should I prioritize?`;
    onAskCurator(prompt);
    if (onClose) onClose();
  }

  async function handleApplyAllInGroup(group, items) {
    for (const item of items) {
      try {
        await handleAcceptItem(item);
      } catch (err) {
        console.error('[CuratorOptimizePanel] bulk apply failed for item:', item?.id, err);
      }
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, rgba(32,22,14,0.99), rgba(20,14,9,0.99))',
        border: '1px solid rgba(140,105,65,0.22)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      {/* ── Sticky Header ─────────────────────────────────────────────── */}
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
            <p className="text-sm mt-1" style={{ color: 'rgba(224,216,200,0.6)' }}>
              Structured improvement across data, health, rotation, acquisitions, and strategy
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

      {/* ── Summary Bar ───────────────────────────────────────────────── */}
      {!isLoading && totalItems > 0 && (
        <div
          className="px-5 py-4 grid grid-cols-2 gap-3"
          style={{ borderBottom: '1px solid rgba(140,105,65,0.12)' }}
        >
          {[
            { label: 'Optimizations', value: totalItems, color: 'rgba(224,216,200,0.8)' },
            { label: 'Categories', value: filteredGroups.length, color: 'rgba(180,140,75,0.85)' },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="text-center py-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(140,105,65,0.1)' }}
            >
              <div
                className="text-2xl sm:text-3xl font-bold mb-1"
                style={{ color, fontFamily: "'Georgia', serif" }}
              >
                {value}
              </div>
              <div className="text-[10px] sm:text-xs font-medium" style={{ color: 'rgba(224,216,200,0.5)' }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Content ───────────────────────────────────────────────────── */}
      <div className="px-5 py-5 space-y-3">
        {/* Apply-fix error banner */}
        {applyError && (
          <div
            className="rounded-xl px-4 py-3 flex items-center justify-between gap-3"
            style={{ background: 'rgba(180,50,50,0.12)', border: '1px solid rgba(200,80,80,0.3)' }}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: 'rgba(220,100,80,0.9)' }} />
              <p className="text-xs" style={{ color: 'rgba(240,200,190,0.9)' }}>{applyError}</p>
            </div>
            <button
              type="button"
              onClick={() => setApplyError(null)}
              className="text-xs shrink-0 hover:opacity-80"
              style={{ color: 'rgba(200,150,140,0.7)' }}
            >
              Dismiss
            </button>
          </div>
        )}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2
              className="w-8 h-8 animate-spin"
              style={{ color: 'rgba(180,140,75,0.7)' }}
            />
            <p className="text-sm" style={{ color: 'rgba(224,216,200,0.5)' }}>
              Analyzing your collection…
            </p>
          </div>
        ) : error ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{
              background: 'rgba(180,50,50,0.06)',
              border: '1px solid rgba(180,80,80,0.2)',
            }}
          >
            <AlertTriangle className="w-8 h-8 mx-auto mb-3" style={{ color: 'rgba(200,100,80,0.8)' }} />
            <p className="text-sm font-semibold mb-1" style={{ color: '#F5F1E7' }}>
              Could not load recommendations
            </p>
            <p className="text-xs" style={{ color: 'rgba(224,216,200,0.5)' }}>
              {error}
            </p>
          </div>
        ) : totalItems === 0 ? (
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
          filteredGroups.map((group) => (
            <CuratorRecommendationGroup
              key={group.groupKey}
              group={group}
              workflowId="optimize_collection"
              onAcceptItem={handleAcceptItem}
              onClarifyItem={handleClarifyItem}
              onApplyAllInGroup={handleApplyAllInGroup}
            />
          ))
        )}
      </div>
    </div>
  );
}
