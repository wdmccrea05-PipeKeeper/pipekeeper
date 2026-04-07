/**
 * CuratorSpecializationReview — Collection Optimization
 *
 * Surface 2: Broader collection optimization.
 *
 * Sections:
 *   1. Utilization & Rotation — underused blends, pipes
 *   2. Collection Balance     — blend type distribution, gaps
 *   3. Pipe Specialization    — per-pipe specialization workflow
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Search, X, Check, CheckCircle2, HelpCircle,
  Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { applyPipeSpecialization } from '@/lib/curator/recommendationActions.js';
import CuratorRecommendationGroup from './CuratorRecommendationGroup';

// ─── Confidence styles ────────────────────────────────────────────────────────

const CONFIDENCE_STYLE = {
  high:   { bg: 'rgba(46,125,92,0.18)',  text: 'rgba(80,180,130,1)',  label: 'High' },
  medium: { bg: 'rgba(180,140,75,0.18)', text: 'rgba(212,165,116,1)', label: 'Medium' },
  low:    { bg: 'rgba(139,58,58,0.18)',  text: 'rgba(210,120,120,1)', label: 'Low' },
};

function ConfidenceBadge({ confidence }) {
  const s = CONFIDENCE_STYLE[confidence] || CONFIDENCE_STYLE.medium;
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide"
      style={{ background: s.bg, color: s.text }}
    >
      {s.label} confidence
    </span>
  );
}

// ─── Evidence builders ────────────────────────────────────────────────────────

function buildIssueStatement(pipe) {
  const specNow = pipe.currentSpec ? `Currently specialized as "${pipe.currentSpec}".` : 'Currently unspecialized.';
  if (!pipe.hasLogData || !pipe.suggestedSpec) return specNow;
  const pct = pipe.dominanceRatio != null ? Math.round(pipe.dominanceRatio * 100) : null;
  const pctStr = pct != null ? ` — ${pct}% of sessions` : '';
  return `${specNow} Session history shows dominant use with ${pipe.suggestedSpec} blends${pctStr}.`;
}

function buildWhyBullets(pipe) {
  const bullets = [];
  if (pipe.sessionCount > 0 && pipe.totalSessions > 0) {
    const pct = Math.round((pipe.sessionCount / pipe.totalSessions) * 100);
    bullets.push(`${pipe.sessionCount} of ${pipe.totalSessions} sessions were ${pipe.suggestedSpec || 'this type'} (${pct}%)`);
  }
  if (pipe.topBlends?.length > 0) {
    bullets.push(`Top blends: ${pipe.topBlends.slice(0, 2).join(', ')}`);
  }
  if (pipe.dominanceRatio != null && pipe.dominanceRatio >= 0.6) {
    bullets.push(`Strong dominance — ${Math.round(pipe.dominanceRatio * 100)}% session share`);
  } else if (pipe.allTypes?.length > 1) {
    const second = pipe.allTypes[1];
    bullets.push(`Secondary type: ${second.type} (${second.count} session${second.count !== 1 ? 's' : ''})`);
  }
  return bullets.length > 0 ? bullets : ['Based on recorded session history'];
}

// ─── Single pipe review panel ─────────────────────────────────────────────────

function PipeReviewPanel({ pipe, isSelected, onToggleSelect, onAccepted, onRejected, onAskCurator }) {
  const [applying, setApplying]     = useState(false);
  const [status, setStatus]         = useState(null); // null | 'accepted' | 'rejected'
  const [customSpec, setCustomSpec] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [expanded, setExpanded]     = useState(false);
  const [error, setError]           = useState(null);

  const issueStatement = useMemo(() => buildIssueStatement(pipe), [pipe]);
  const whyBullets     = useMemo(() => buildWhyBullets(pipe), [pipe]);

  const handleAccept = useCallback(async () => {
    const spec = (showCustom && customSpec.trim()) ? customSpec.trim() : pipe.suggestedSpec;
    if (!spec) return;
    setApplying(true);
    setError(null);
    try {
      await applyPipeSpecialization(pipe.recordId || pipe.id, spec);
      setStatus('accepted');
      onAccepted?.(pipe.id, spec);
    } catch (err) {
      setError(err?.message || 'Failed to apply specialization.');
    } finally {
      setApplying(false);
    }
  }, [pipe, showCustom, customSpec, onAccepted]);

  const handleReject = useCallback(() => {
    setStatus('rejected');
    onRejected?.(pipe.id);
  }, [pipe.id, onRejected]);

  // Accepted state
  if (status === 'accepted') {
    const appliedSpec = (showCustom && customSpec.trim()) ? customSpec.trim() : pipe.suggestedSpec;
    return (
      <div
        className="rounded-xl p-4 flex items-center gap-3"
        style={{ background: 'rgba(74,124,92,0.07)', border: '1px solid rgba(74,124,92,0.22)' }}
      >
        <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'rgba(80,180,130,0.8)' }} />
        <span className="text-sm font-semibold" style={{ color: '#F5F1E7' }}>{pipe.recordName}</span>
        <span className="text-xs ml-1" style={{ color: 'rgba(80,180,130,0.8)' }}>
          → {appliedSpec}
        </span>
      </div>
    );
  }

  // Rejected state
  if (status === 'rejected') {
    return (
      <div
        className="rounded-xl p-3 flex items-center gap-3 opacity-50"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(140,105,65,0.1)' }}
      >
        <X className="w-4 h-4 shrink-0" style={{ color: 'rgba(224,216,200,0.35)' }} />
        <span className="text-sm" style={{ color: 'rgba(224,216,200,0.45)' }}>
          {pipe.recordName} — skipped
        </span>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(140,105,65,0.18)' }}
    >
      {/* Panel header */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect?.(pipe.id)}
          className="mt-1 w-3.5 h-3.5 rounded accent-amber-600 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: '#F5F1E7' }}>
                {pipe.recordName}
                {pipe.maker && (
                  <span className="text-xs font-normal ml-1.5" style={{ color: 'rgba(224,216,200,0.4)' }}>
                    by {pipe.maker}
                  </span>
                )}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-[11px]" style={{ color: 'rgba(224,216,200,0.45)' }}>
                  {pipe.currentSpec
                    ? <><strong style={{ color: 'rgba(224,216,200,0.65)' }}>{pipe.currentSpec}</strong></>
                    : <span style={{ color: 'rgba(224,216,200,0.3)' }}>None</span>}
                </span>
                <span style={{ color: 'rgba(140,105,65,0.4)' }}>→</span>
                <span className="text-[11px] font-semibold" style={{ color: 'rgba(200,155,100,0.9)' }}>
                  {pipe.suggestedSpec || '—'}
                </span>
              </div>
            </div>
            <ConfidenceBadge confidence={pipe.confidence} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 p-1 rounded transition-colors"
          style={{ color: 'rgba(224,216,200,0.3)' }}
          aria-label={expanded ? 'Collapse detail' : 'Expand detail'}
        >
          {expanded
            ? <ChevronUp className="w-3.5 h-3.5" />
            : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expandable 2-col detail */}
      {expanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 border-t" style={{ borderColor: 'rgba(140,105,65,0.12)' }}>
          {/* Left: Issue + Suggested + Evidence */}
          <div className="space-y-3 pt-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(224,216,200,0.3)' }}>
                Issue
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(224,216,200,0.7)' }}>
                {issueStatement}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(224,216,200,0.3)' }}>
                Suggested
              </p>
              <p className="text-xs font-semibold" style={{ color: 'rgba(200,155,100,0.9)' }}>
                {pipe.suggestedSpec ? `${pipe.suggestedSpec} specialist` : '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(224,216,200,0.3)' }}>
                Evidence
              </p>
              <ul className="space-y-1">
                {whyBullets.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs" style={{ color: 'rgba(224,216,200,0.65)' }}>
                    <span
                      className="mt-1.5 w-1 h-1 rounded-full shrink-0"
                      style={{ background: 'rgba(140,105,65,0.6)' }}
                    />
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right: Blend family bars + related blends */}
          <div className="space-y-3 pt-3">
            {pipe.allTypes?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(224,216,200,0.3)' }}>
                  Top Blend Families
                </p>
                <div className="space-y-1.5">
                  {pipe.allTypes.slice(0, 4).map(({ type, count }) => {
                    const pct = pipe.totalSessions > 0 ? Math.round((count / pipe.totalSessions) * 100) : 0;
                    return (
                      <div key={type} className="flex items-center gap-2">
                        <div
                          className="flex-1 h-1.5 rounded-full overflow-hidden"
                          style={{ background: 'rgba(255,255,255,0.06)' }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: 'rgba(140,105,65,0.5)' }}
                          />
                        </div>
                        <span
                          className="text-[10px] w-28 truncate shrink-0"
                          style={{ color: 'rgba(224,216,200,0.6)' }}
                        >
                          {type}
                        </span>
                        <span
                          className="text-[10px] tabular-nums shrink-0 w-8 text-right"
                          style={{ color: 'rgba(224,216,200,0.35)' }}
                        >
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {pipe.topBlends?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(224,216,200,0.3)' }}>
                  Related Blends
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {pipe.topBlends.map((blend) => (
                    <span
                      key={blend}
                      className="text-[10px] px-2 py-0.5 rounded-md"
                      style={{
                        background: 'rgba(74,124,92,0.1)',
                        color: 'rgba(100,180,130,0.8)',
                        border: '1px solid rgba(74,124,92,0.2)',
                      }}
                    >
                      {blend}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom spec input */}
      {showCustom && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={customSpec}
            onChange={(e) => setCustomSpec(e.target.value)}
            placeholder="Enter custom specialization…"
            className="flex-1 text-xs rounded-lg px-3 py-1.5 outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#F5F1E7', border: '1px solid rgba(140,105,65,0.25)' }}
          />
          <button
            type="button"
            onClick={() => { setShowCustom(false); setCustomSpec(''); }}
            className="text-xs px-2 py-1 rounded"
            style={{ color: 'rgba(224,216,200,0.4)' }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <p
          className="text-xs px-2 py-1 rounded"
          style={{ background: 'rgba(139,58,58,0.15)', color: 'rgba(220,140,140,1)' }}
        >
          {error}
        </p>
      )}

      {/* Action footer */}
      <div className="flex items-center gap-2 flex-wrap pt-0.5">
        <button
          type="button"
          onClick={handleAccept}
          disabled={applying}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
          style={{ background: 'rgba(74,124,92,0.25)', color: 'rgba(80,180,130,1)', border: '1px solid rgba(74,124,92,0.4)' }}
        >
          {applying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          Accept
          {pipe.suggestedSpec && !showCustom && (
            <span className="opacity-60 ml-0.5 font-normal">— {pipe.suggestedSpec}</span>
          )}
        </button>
        <button
          type="button"
          onClick={handleReject}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(224,216,200,0.6)', border: '1px solid rgba(140,105,65,0.2)' }}
        >
          <X className="w-3 h-3" />
          Reject
        </button>
        <button
          type="button"
          onClick={() => setShowCustom((v) => !v)}
          className="text-xs px-2.5 py-1.5 rounded-lg transition-all"
          style={{ color: 'rgba(224,216,200,0.4)', background: 'transparent' }}
        >
          {showCustom ? 'Use Suggestion' : 'Custom Spec'}
        </button>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="ml-auto text-xs px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1"
          style={{ color: 'rgba(224,216,200,0.3)', background: 'transparent' }}
        >
          <HelpCircle className="w-3 h-3" />
          {expanded ? 'Hide detail' : 'View evidence'}
        </button>
        {onAskCurator && (
          <button
            type="button"
            onClick={() => onAskCurator(pipe)}
            className="text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all"
            style={{ background: 'rgba(74,124,156,0.1)', color: 'rgba(120,170,220,0.8)', border: '1px solid rgba(74,124,156,0.2)' }}
          >
            <HelpCircle className="w-3 h-3" />
            Ask Curator
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Collection Optimization Sections ─────────────────────────────────────────
// Renders BALANCE and UTILIZATION recommendations with collapsible section headers.
// Uses goal-based filtering to avoid duplicate display (all coll-opt recs share the
// same category value, so category-based filtering would show the same recs twice).

const UTILIZATION_GOALS = new Set(['underused_blends', 'never_smoked_blends', 'underused_pipes']);
const BALANCE_GOALS     = new Set(['tobacco_type_imbalance']);

// Goals handled by PipeReviewPanel — exclude from CollectionOptSections to avoid duplication
const SPECIALIZATION_GOALS = new Set(['specialization_candidates']);

const COLL_OPT_SECTION_MAP = [
  {
    key:        'utilization',
    label:      'Utilization & Rotation',
    goalFilter: (r) => UTILIZATION_GOALS.has(r.goal),
  },
  {
    key:        'balance',
    label:      'Collection Balance & Gaps',
    goalFilter: (r) => BALANCE_GOALS.has(r.goal),
  },
];

function CollOptSection({ label, recommendations, onAction }) {
  const [collapsed, setCollapsed] = useState(false);

  if (!recommendations.length) return null;

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
          {label}
        </span>
        <div className="flex-1 h-px" style={{ background: 'rgba(140,105,65,0.15)' }} />
        <span
          className="text-[11px] px-2 py-0.5 rounded-full tabular-nums shrink-0"
          style={{ background: 'rgba(80,80,80,0.1)', color: 'rgba(224,216,200,0.4)', border: '1px solid rgba(100,100,100,0.18)' }}
        >
          {recommendations.length}
        </span>
        {collapsed
          ? <ChevronDown className="w-3 h-3 shrink-0" style={{ color: 'rgba(224,216,200,0.3)' }} />
          : <ChevronUp   className="w-3 h-3 shrink-0" style={{ color: 'rgba(224,216,200,0.3)' }} />}
      </button>
      {!collapsed && (
        <div className="space-y-2.5">
          {recommendations.map((rec) => (
            <CuratorRecommendationGroup
              key={rec.id}
              recommendation={rec}
              onAction={onAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CollectionOptSections({ sections, onAction }) {
  // Flatten all recommendations from all collection-opt sections
  const allRecs = sections.flatMap((s) => s.recommendations || []);

  return (
    <div className="space-y-5">
      {COLL_OPT_SECTION_MAP.map(({ key, label, goalFilter }) => {
        // Filter by goal to avoid duplicates and exclude specialization (shown in PipeReviewPanel)
        const recs = allRecs.filter(
          (r) => goalFilter(r) && !SPECIALIZATION_GOALS.has(r.goal)
        );
        return (
          <CollOptSection
            key={key}
            label={label}
            recommendations={recs}
            onAction={onAction}
          />
        );
      })}
    </div>
  );
}

// ─── CuratorSpecializationReview (Collection Optimization) ────────────────────

/**
 * @param {object}   props
 * @param {object[]} props.specRecs          - Specialization recommendation objects from the engine
 * @param {object[]} props.collectionSections - Broader collection optimization sections (balance + utilization)
 * @param {Function} props.onAction          - (actionKey, rec, opts) => Promise — for collection sections
 * @param {Function} props.onDone            - () => void — navigate back to board
 * @param {Function} [props.onAskCurator]    - (pipe) => void — switch to chat with specialization context
 */
export default function CuratorSpecializationReview({
  specRecs = [],
  collectionSections = [],
  onAction,
  onDone,
  onAskCurator,
}) {
  // ─── Collection optimization sections (BALANCE + UTILIZATION) ────────────────
  const hasCollectionSections = collectionSections.some((s) => s.recommendations?.length > 0);
  // Extract pipe items with actual evidence
  const allPipeItems = useMemo(
    () => specRecs.flatMap((r) => r.items || []).filter((i) => i.hasLogData && i.suggestedSpec),
    [specRecs]
  );

  // Pipes without evidence (advisory only)
  const noDataItems = useMemo(
    () => specRecs.flatMap((r) => r.items || []).filter((i) => !i.hasLogData),
    [specRecs]
  );

  const [search, setSearch]           = useState('');
  const [confFilter, setConfFilter]   = useState('all');
  const [blendFilter, setBlendFilter] = useState('all');
  const [selected, setSelected]       = useState(new Set());
  const [acceptedCount, setAccepted]  = useState(0);
  const [rejectedCount, setRejected]  = useState(0);

  // Unique suggested spec values for the blend family filter
  const uniqueSpecs = useMemo(
    () => ['all', ...new Set(allPipeItems.map((i) => i.suggestedSpec).filter(Boolean))],
    [allPipeItems]
  );

  // Filtered visible items
  const filteredItems = useMemo(() => allPipeItems.filter((pipe) => {
    if (search && !pipe.recordName?.toLowerCase().includes(search.toLowerCase())) return false;
    if (confFilter !== 'all' && pipe.confidence !== confFilter) return false;
    if (blendFilter !== 'all' && pipe.suggestedSpec !== blendFilter) return false;
    return true;
  }), [allPipeItems, search, confFilter, blendFilter]);

  // Summary counts
  const highCount   = allPipeItems.filter((i) => i.confidence === 'high').length;
  const mediumCount = allPipeItems.filter((i) => i.confidence === 'medium').length;

  const toggleSelect = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleAccepted = useCallback((id) => {
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
    setAccepted((c) => c + 1);
  }, []);

  const handleRejected = useCallback((id) => {
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
    setRejected((c) => c + 1);
  }, []);

  const selectedItems = useMemo(
    () => filteredItems.filter((i) => selected.has(i.id)),
    [filteredItems, selected]
  );

  const handleBulkAccept = useCallback(async () => {
    for (const pipe of selectedItems) {
      try {
        await applyPipeSpecialization(pipe.recordId || pipe.id, pipe.suggestedSpec);
        handleAccepted(pipe.id);
      } catch (_) { /* continue */ }
    }
  }, [selectedItems, handleAccepted]);

  const handleBulkReject = useCallback(() => {
    selectedItems.forEach((pipe) => handleRejected(pipe.id));
  }, [selectedItems, handleRejected]);

  // ─── Empty state ──────────────────────────────────────────────────────────

  if (allPipeItems.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold" style={{ color: '#F5F1E7' }}>Collection Optimization</h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.5)' }}>
            Rotation, balance, and pipe specialization suggestions
          </p>
        </div>

        {/* Collection sections even if no spec candidates */}
        {hasCollectionSections && (
          <CollectionOptSections sections={collectionSections} onAction={onAction} />
        )}

        <div className="py-8 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 mx-auto" style={{ color: 'rgba(74,124,92,0.35)' }} />
          <p className="text-sm font-semibold" style={{ color: 'rgba(224,216,200,0.6)' }}>
            No specialization candidates with session evidence
          </p>
          <p className="text-xs max-w-xs mx-auto" style={{ color: 'rgba(224,216,200,0.4)' }}>
            Log sessions with your pipes to build usage history. The Curator will suggest specializations once enough data exists.
          </p>
        </div>
        {noDataItems.length > 0 && (
          <div
            className="rounded-xl p-4"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(140,105,65,0.1)' }}
          >
            <p className="text-[11px] font-semibold mb-2" style={{ color: 'rgba(224,216,200,0.4)' }}>
              Pipes needing session data ({noDataItems.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {noDataItems.map((p) => (
                <span
                  key={p.id}
                  className="text-[10px] px-2 py-0.5 rounded-md"
                  style={{ background: 'rgba(80,80,80,0.1)', color: 'rgba(224,216,200,0.4)', border: '1px solid rgba(100,100,100,0.15)' }}
                >
                  {p.recordName}
                </span>
              ))}
            </div>
          </div>
        )}
        {onDone && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onDone}
              className="text-xs px-4 py-2 rounded-lg"
              style={{ background: 'rgba(140,105,65,0.12)', color: 'rgba(224,216,200,0.65)', border: '1px solid rgba(140,105,65,0.22)' }}
            >
              Back to Board
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── Full review surface ──────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <h2 className="text-base font-bold" style={{ color: '#F5F1E7' }}>
          Collection Optimization
        </h2>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.5)' }}>
          Rotation, balance, and pipe specialization — all in one place
        </p>
      </div>

      {/* Collection optimization sections — utilization & balance */}
      {hasCollectionSections && (
        <CollectionOptSections sections={collectionSections} onAction={onAction} />
      )}

      {/* Pipe Specialization section header */}
      <div className="flex items-center gap-2 pt-1">
        <span
          className="text-[11px] font-bold uppercase tracking-widest shrink-0"
          style={{ color: 'rgba(224,216,200,0.45)' }}
        >
          Pipe Specialization
        </span>
        <div className="flex-1 h-px" style={{ background: 'rgba(140,105,65,0.15)' }} />
        <span
          className="text-[11px] px-2 py-0.5 rounded-full tabular-nums shrink-0"
          style={{ background: 'rgba(80,80,80,0.1)', color: 'rgba(224,216,200,0.4)', border: '1px solid rgba(100,100,100,0.18)' }}
        >
          {allPipeItems.length}
        </span>
      </div>

      {/* Summary strip */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <span
          className="text-xs px-2.5 py-1 rounded-full font-semibold"
          style={{ background: 'rgba(140,105,65,0.15)', color: 'rgba(224,216,200,0.8)', border: '1px solid rgba(140,105,65,0.25)' }}
        >
          {allPipeItems.length} candidate{allPipeItems.length !== 1 ? 's' : ''}
        </span>
        {highCount > 0 && (
          <span
            className="text-xs px-2.5 py-1 rounded-full font-semibold"
            style={{ background: CONFIDENCE_STYLE.high.bg, color: CONFIDENCE_STYLE.high.text }}
          >
            {highCount} high confidence
          </span>
        )}
        {mediumCount > 0 && (
          <span
            className="text-xs px-2.5 py-1 rounded-full font-semibold"
            style={{ background: CONFIDENCE_STYLE.medium.bg, color: CONFIDENCE_STYLE.medium.text }}
          >
            {mediumCount} medium confidence
          </span>
        )}
        {(acceptedCount > 0 || rejectedCount > 0) && (
          <span className="text-xs" style={{ color: 'rgba(224,216,200,0.4)' }}>
            {acceptedCount > 0 && `${acceptedCount} accepted`}
            {acceptedCount > 0 && rejectedCount > 0 && ' · '}
            {rejectedCount > 0 && `${rejectedCount} skipped`}
          </span>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div
          className="flex items-center gap-2 flex-1 min-w-28 rounded-lg px-3 py-1.5"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(140,105,65,0.15)' }}
        >
          <Search className="w-3 h-3 shrink-0" style={{ color: 'rgba(224,216,200,0.3)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pipes…"
            className="flex-1 text-xs bg-transparent outline-none min-w-0"
            style={{ color: '#F5F1E7' }}
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} style={{ color: 'rgba(224,216,200,0.3)' }}>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Confidence filter */}
        <select
          value={confFilter}
          onChange={(e) => setConfFilter(e.target.value)}
          className="text-xs rounded-lg px-3 py-1.5 outline-none"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(224,216,200,0.7)', border: '1px solid rgba(140,105,65,0.15)' }}
        >
          <option value="all">All confidence</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* Blend family filter — only shown when multiple families exist */}
        {uniqueSpecs.length > 2 && (
          <select
            value={blendFilter}
            onChange={(e) => setBlendFilter(e.target.value)}
            className="text-xs rounded-lg px-3 py-1.5 outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(224,216,200,0.7)', border: '1px solid rgba(140,105,65,0.15)' }}
          >
            {uniqueSpecs.map((s) => (
              <option key={s} value={s}>{s === 'all' ? 'All blend types' : s}</option>
            ))}
          </select>
        )}

        {/* Bulk action area */}
        {selectedItems.length > 0 && (
          <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
            <span className="text-[11px]" style={{ color: 'rgba(224,216,200,0.5)' }}>
              {selectedItems.length} selected
            </span>
            <button
              type="button"
              onClick={handleBulkAccept}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-semibold"
              style={{ background: 'rgba(74,124,92,0.2)', color: 'rgba(80,180,130,1)', border: '1px solid rgba(74,124,92,0.35)' }}
            >
              <Check className="w-3 h-3" />
              Accept Selected
            </button>
            <button
              type="button"
              onClick={handleBulkReject}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-semibold"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(224,216,200,0.6)', border: '1px solid rgba(140,105,65,0.2)' }}
            >
              <X className="w-3 h-3" />
              Reject Selected
            </button>
          </div>
        )}
      </div>

      {/* No filter match */}
      {filteredItems.length === 0 && (
        <p className="text-sm text-center py-8" style={{ color: 'rgba(224,216,200,0.4)' }}>
          No pipes match the current filters.
        </p>
      )}

      {/* Pipe review panels */}
      <div className="space-y-2.5">
        {filteredItems.map((pipe) => (
          <PipeReviewPanel
            key={pipe.id}
            pipe={pipe}
            isSelected={selected.has(pipe.id)}
            onToggleSelect={toggleSelect}
            onAccepted={handleAccepted}
            onRejected={handleRejected}
            onAskCurator={onAskCurator}
          />
        ))}
      </div>

      {/* Pipes needing session data */}
      {noDataItems.length > 0 && (
        <div
          className="rounded-xl p-3"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(140,105,65,0.1)' }}
        >
          <p className="text-[11px] font-semibold mb-1.5" style={{ color: 'rgba(224,216,200,0.4)' }}>
            Pipes needing session data ({noDataItems.length}) — log sessions to generate suggestions
          </p>
          <div className="flex flex-wrap gap-1.5">
            {noDataItems.map((p) => (
              <span
                key={p.id}
                className="text-[10px] px-2 py-0.5 rounded-md"
                style={{ background: 'rgba(80,80,80,0.08)', color: 'rgba(224,216,200,0.35)', border: '1px solid rgba(100,100,100,0.12)' }}
              >
                {p.recordName}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Back to board */}
      {onDone && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onDone}
            className="text-xs px-4 py-2 rounded-lg"
            style={{ background: 'rgba(140,105,65,0.12)', color: 'rgba(224,216,200,0.65)', border: '1px solid rgba(140,105,65,0.22)' }}
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
