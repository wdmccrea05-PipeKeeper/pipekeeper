/**
 * CuratorRecommendationGroup — action-first operational card
 */

import React, { useState } from 'react';
import {
  Check, Eye, Loader2, CheckCircle2,
  RotateCcw, CalendarClock, TrendingUp, HelpCircle,
  X,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { trackedInvokeLLM } from '@/lib/integrationTelemetry';
import { ACTION_TYPE, PRIORITY_STYLES, MODULE_KEY, CATEGORY } from '@/lib/curator/recommendationSchema.js';
import CuratorItemPreviewList from './CuratorItemPreviewList';

// ─── Badge definitions ────────────────────────────────────────────────────────

const ACTION_TYPE_BADGE = {
  [ACTION_TYPE.AUTO_FIX]:             { bg: 'rgba(74,124,92,0.18)',  text: 'rgba(80,180,130,1)',   label: 'Auto Fix' },
  [ACTION_TYPE.ADVISORY]:             { bg: 'rgba(74,124,156,0.18)', text: 'rgba(120,170,220,1)',  label: 'Advisory' },
  [ACTION_TYPE.REVIEW_REQUIRED]:      { bg: 'rgba(180,100,50,0.18)', text: 'rgba(220,140,90,1)',   label: 'Review' },
  [ACTION_TYPE.MULTI_PATH]:           { bg: 'rgba(139,94,58,0.18)',  text: 'rgba(200,155,100,1)',  label: 'Strategy' },
  [ACTION_TYPE.SHOPPING_LIST_ACTION]: { bg: 'rgba(74,100,156,0.18)', text: 'rgba(160,200,240,1)',  label: 'Shopping' },
};

const MODULE_LABEL = {
  [MODULE_KEY.PIPE]:    { text: 'rgba(200,155,100,0.9)',  label: 'Pipe' },
  [MODULE_KEY.TOBACCO]: { text: 'rgba(100,180,130,0.9)',  label: 'Tobacco' },
  [MODULE_KEY.WHISKEY]: { text: 'rgba(160,200,240,0.9)',  label: 'Whiskey' },
  [MODULE_KEY.CIGAR]:   { text: 'rgba(220,160,120,0.9)',  label: 'Cigar' },
  [MODULE_KEY.MULTI]:   { text: 'rgba(180,180,180,0.55)', label: 'Multi' },
};

// ─── Button primitives ────────────────────────────────────────────────────────

function PrimaryBtn({ onClick, disabled, loading, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="inline-flex items-center gap-2 font-semibold transition-all disabled:opacity-50"
      style={{ background: '#C6A15B', color: '#0B0B0C', height: '40px', padding: '0 16px', borderRadius: '12px', fontSize: '14px', border: 'none' }}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : Icon ? <Icon className="w-4 h-4" /> : null}
      {loading ? 'Applying…' : label}
    </button>
  );
}

function SecondaryBtn({ onClick, disabled, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 font-semibold transition-all disabled:opacity-50"
      style={{ background: 'transparent', color: '#F5F5F7', height: '40px', padding: '0 16px', borderRadius: '12px', fontSize: '14px', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      {Icon ? <Icon className="w-4 h-4" /> : null}
      {label}
    </button>
  );
}

function TertiaryBtn({ onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 transition-all"
      style={{ color: '#A1A1AA', background: 'transparent', border: 'none', fontSize: '14px', padding: '0 8px', height: '40px' }}
    >
      {Icon ? <Icon className="w-4 h-4" /> : null}
      {label}
    </button>
  );
}

function DoneIndicator({ label }) {
  return (
    <span className="flex items-center gap-1.5 text-sm" style={{ color: 'rgba(80,180,130,0.9)', fontWeight: 600 }}>
      <CheckCircle2 className="w-4 h-4" />
      {label}
    </span>
  );
}

// ─── Shared payload helpers ───────────────────────────────────────────────────

/** True when an item carries a non-empty proposedChange payload. */
function hasNonEmptyPayload(item) {
  return !!(item.proposedChange?.payload && Object.keys(item.proposedChange.payload).length > 0);
}

/** Build the navigation path for a single item record — always to detail page, never module list. */
function singleItemPath(item) {
  const rt = String(item?.recordType || '').toLowerCase();
  const id  = item?.recordId || item?.id;
  if (!id) return null;
  if (rt === 'bottle' || rt === 'whiskey') return `/BottleDetail?id=${encodeURIComponent(id)}`;
  if (rt === 'blend'  || rt === 'tobacco') return `/TobaccoDetail?id=${encodeURIComponent(id)}`;
  if (rt === 'pipe')                       return `/PipeDetail?id=${encodeURIComponent(id)}`;
  return null;
}

// ─── Inline Review Panel ──────────────────────────────────────────────────────

function InlineReviewPanel({ rec, onApply, onCancel }) {
  const [applying, setApplying] = useState(false);
  const allItems = rec.items || [];
  const itemsWithPayloads = allItems.filter(hasNonEmptyPayload);

  const handleApply = async () => {
    setApplying(true);
    try { await onApply(); } finally { setApplying(false); }
  };

  if (!itemsWithPayloads.length) {
    return (
      <div
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px', marginTop: '12px' }}
      >
        <p style={{ color: '#A1A1AA', fontSize: '14px' }}>No proposed changes to review for these items.</p>
        <div className="flex gap-2 mt-3">
          <TertiaryBtn onClick={onCancel} icon={X} label="Cancel" />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px', marginTop: '12px' }}
    >
      <p style={{ color: '#F5F5F7', fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Proposed Changes</p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr>
              <th style={{ color: '#C6A15B', textAlign: 'left', padding: '4px 8px 8px 0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Field</th>
              <th style={{ color: '#C6A15B', textAlign: 'left', padding: '4px 8px 8px 8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Current</th>
              <th style={{ color: '#C6A15B', textAlign: 'left', padding: '4px 0 8px 8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Proposed</th>
            </tr>
          </thead>
          <tbody>
            {itemsWithPayloads.map((item) => {
              const payload = item.proposedChange.payload;
              return Object.entries(payload).map(([fieldKey, proposedVal]) => (
                <tr key={`${item.recordId || item.id}-${fieldKey}`} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '6px 8px 6px 0', color: '#A1A1AA', verticalAlign: 'top' }}>
                    {item.itemName || item.recordName || '—'} / {fieldKey}
                  </td>
                  <td style={{ padding: '6px 8px', color: '#71717A', verticalAlign: 'top' }}>
                    {String(item[fieldKey] ?? 'Not set')}
                  </td>
                  <td style={{ padding: '6px 0 6px 8px', color: '#F5F5F7', verticalAlign: 'top' }}>
                    {String(proposedVal)}
                  </td>
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 mt-4 flex-wrap">
        <PrimaryBtn onClick={handleApply} loading={applying} icon={Check} label="Apply Changes" />
        <TertiaryBtn onClick={onCancel} icon={X} label="Cancel" />
      </div>
    </div>
  );
}

// ─── Action rows by type / category ──────────────────────────────────────────

function RecordOptimizationActions({ rec, onAction }) {
  const [applying, setApplying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  // Map of itemId -> { age: number } for looked-up results
  const [searchResults, setSearchResults] = useState({});
  const [committingAll, setCommittingAll] = useState(false);
  const [allDone, setAllDone] = useState(false);

  const actionableItems = (rec.items || []).filter(
    (item) => item?.proposedChange?.payload && Object.keys(item.proposedChange.payload).length > 0
  );

  const hasAutoFix = rec.actionType === ACTION_TYPE.AUTO_FIX && actionableItems.length > 0;
  const hasReviewableDiffs = rec.actionType === ACTION_TYPE.REVIEW_REQUIRED && actionableItems.length > 0;
  const hasNoDiffs = actionableItems.length === 0;

  const handleApplyFix = async () => {
    setApplying(true);
    try { await onAction('apply_fix', rec); }
    finally { setApplying(false); }
  };

  const handleCommitAll = async () => {
    const entries = Object.entries(searchResults);
    if (!entries.length) return;
    setCommittingAll(true);
    try {
      await Promise.all(entries.map(([id, result]) =>
        base44.entities.Bottle.update(id, { age: result.age })
      ));
      setAllDone(true);
    } catch (err) {
      console.error('[Curator] commit all failed', err);
    } finally {
      setCommittingAll(false);
    }
  };

  // Per-item row: name + action based on confidence (Apply Fix / Review Fix / Open Record / Auto-lookup age)
  const ItemRow = ({ item }) => {
    const [itemApplying, setItemApplying] = useState(false);
    const [done, setDone] = useState(false);
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState(false);
    const confidence = item?.proposedChange?.confidence || 0;
    const hasPayload = hasNonEmptyPayload(item);
    const path = singleItemPath(item);
    const itemId = item.recordId || item.id;

    // Trigger age lookup for any item that is missing age — even if the engine proposed age=0 (NAS guess).
    // We always want a real web lookup to confirm or override the NAS assumption.
    const missingAge = item.missingFields?.includes('age') || 
      (hasPayload && item.proposedChange?.payload?.age === 0);
    const searchResult = searchResults[itemId] || null;

    React.useEffect(() => {
      if (!missingAge) return;
      let cancelled = false;
      setSearching(true);
      const name = item.itemName || item.recordName || '';
      trackedInvokeLLM({
        prompt: `Search online for the official age statement for the whiskey "${name}". Check the manufacturer's website, major retailers (Total Wine, Master of Malt, Whisky Exchange), and whisky databases (Whiskybase, LCBO).

Return a JSON object with:
- "age": number of years (integer), or 0 if it is definitively a No Age Statement (NAS) product
- "is_nas": true if NAS, false if it has a stated age
- "confidence": "high" | "medium" | "low"
- "source": brief description of where you found this (e.g. "Talisker official site: 10 year old")

Important: Many whiskies DO have age statements — e.g. Talisker Skye is NAS but Talisker 10 is 10 years. Be accurate.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            age: { type: 'number' },
            is_nas: { type: 'boolean' },
            confidence: { type: 'string' },
            source: { type: 'string' },
          },
        },
      }, { feature: 'curator.recommendation', module: 'shared' }).then((res) => {
        if (cancelled) return;
        if (res?.age != null) {
          setSearchResults(prev => ({ ...prev, [itemId]: { age: res.age, is_nas: res.is_nas, confidence: res.confidence, source: res.source } }));
        } else {
          setSearchError(true);
        }
      }).catch(() => {
        if (!cancelled) setSearchError(true);
      }).finally(() => {
        if (!cancelled) setSearching(false);
      });
      return () => { cancelled = true; };
    }, [missingAge, itemId, item.itemName, item.recordName]);

    const proposedSummary = hasPayload
      ? item.issueType === 'reclassification'
        ? Object.values(item.proposedChange.payload).join(' · ')
        : Object.entries(item.proposedChange.payload).map(([k, v]) => `${k}: ${String(v)}`).join(' · ')
      : null;

    const ageLabel = searchResult != null
      ? (searchResult.is_nas || searchResult.age === 0 ? 'No Age Statement (NAS)' : `${searchResult.age} yr`)
      : null;
    const ageSource = searchResult?.source || null;
    const ageConfidence = searchResult?.confidence || null;

    const handleApplyItem = async () => {
      setItemApplying(true);
      try { await onAction('apply_fix', rec, { itemId }); setDone(true); }
      finally { setItemApplying(false); }
    };

    const handleApplySearchResult = async () => {
      if (!searchResult) return;
      setItemApplying(true);
      try {
        await base44.entities.Bottle.update(itemId, { age: searchResult.age });
        setDone(true);
        setSearchResults(prev => { const n = { ...prev }; delete n[itemId]; return n; });
      } catch (err) {
        console.error('[Curator] apply age failed', err);
      } finally {
        setItemApplying(false);
      }
    };

    return (
      <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate" style={{ color: '#F5F5F7' }}>
              {item.itemName || item.recordName || '—'}
            </div>
            {item.issueType === 'reclassification' ? (
              <div className="text-xs" style={{ color: '#71717A' }}>
                Currently: <span style={{ color: '#A1A1AA' }}>{item.currentClassification || '—'}</span>
              </div>
            ) : item.missingFields?.length > 0 || missingAge ? (
              <div className="text-xs flex flex-col gap-1" style={{ color: '#71717A' }}>
                <span>Missing: age</span>
                {ageLabel && !done && (
                  <div className="flex flex-col gap-0.5">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold inline-flex items-center gap-1" style={{ background: 'rgba(198,161,91,0.15)', color: '#C6A15B', border: '1px solid rgba(198,161,91,0.3)', width: 'fit-content' }}>
                      → {ageLabel}
                      {ageConfidence && (
                        <span style={{ color: ageConfidence === 'high' ? 'rgba(80,180,130,0.9)' : ageConfidence === 'medium' ? '#C6A15B' : '#A1A1AA', fontSize: '10px', fontWeight: 400 }}>
                          ({ageConfidence})
                        </span>
                      )}
                    </span>
                    {ageSource && (
                      <span className="text-xs italic" style={{ color: '#52524e', fontSize: '11px' }}>
                        {ageSource}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : null}
            {proposedSummary && !done && (
              <div className="text-xs mt-0.5" style={{ color: '#C6A15B' }}>→ {proposedSummary}</div>
            )}
          </div>
          <div className="shrink-0 flex items-center gap-1.5">
            {done || allDone ? (
              <DoneIndicator label="Fixed" />
            ) : searching ? (
              <span className="px-3 h-8 inline-flex items-center gap-1.5 text-xs" style={{ color: '#71717A' }}>
                <Loader2 className="w-3 h-3 animate-spin" /> Looking up…
              </span>
            ) : searchResult ? (
              <button
                type="button"
                onClick={handleApplySearchResult}
                disabled={itemApplying}
                className="px-3 h-8 rounded-lg text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                style={{ background: '#4a7c5c', color: '#e0f5ea', border: 'none' }}
              >
                {itemApplying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                {itemApplying ? 'Saving…' : (searchResult.is_nas || searchResult.age === 0) ? 'Confirm: NAS' : `Confirm: ${searchResult.age} yr`}
              </button>
            ) : hasPayload && confidence >= 0.85 ? (
              <button
                type="button"
                onClick={handleApplyItem}
                disabled={itemApplying}
                className="px-3 h-8 rounded-lg text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                style={{ background: '#4a7c5c', color: '#e0f5ea', border: 'none' }}
              >
                {itemApplying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                {itemApplying ? 'Fixing…' : 'Apply Fix'}
              </button>
            ) : hasPayload && confidence >= 0.60 ? (
              <button
                type="button"
                onClick={() => onAction('approve_changes', rec, { reviewedItems: [item] })}
                className="px-3 h-8 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                style={{ background: 'rgba(180,100,50,0.2)', color: 'rgba(220,140,90,1)', border: '1px solid rgba(180,100,50,0.35)' }}
              >
                <Eye className="w-3 h-3" />
                Review Fix
              </button>
            ) : path && !searching && !searchError ? (
              <a
                href={path}
                className="px-3 h-8 rounded-lg text-xs font-semibold inline-flex items-center"
                style={{ border: '1px solid rgba(255,255,255,0.12)', color: '#F5F5F7', textDecoration: 'none' }}
              >
                Open Record
              </a>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  const readyCount = Object.keys(searchResults).length;

  if (hasNoDiffs) {
    const items = rec.items || [];
    return (
      <div className="space-y-3">
        {items.length > 0 && (
          <div
            className="rounded-xl p-3 space-y-1"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {items.slice(0, 8).map((item) => (
              <ItemRow key={item.recordId || item.id} item={item} />
            ))}
            {items.length > 8 && (
              <div className="text-xs px-3 py-1" style={{ color: '#71717A' }}>
                +{items.length - 8} more
              </div>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {readyCount >= 2 && !allDone && (
            <button
              type="button"
              onClick={handleCommitAll}
              disabled={committingAll}
              className="inline-flex items-center gap-2 font-semibold transition-all disabled:opacity-50"
              style={{ background: '#C6A15B', color: '#0B0B0C', height: '40px', padding: '0 16px', borderRadius: '12px', fontSize: '14px', border: 'none' }}
            >
              {committingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {committingAll ? 'Applying…' : `Commit All (${readyCount})`}
            </button>
          )}
          {allDone && <DoneIndicator label={`${readyCount} records updated`} />}
          <TertiaryBtn onClick={() => onAction('view_details', rec)} icon={Eye} label="Open All Records" />
          <TertiaryBtn onClick={() => onAction('ask_curator', rec)} icon={HelpCircle} label="Ask Curator" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {hasAutoFix && (
          <PrimaryBtn onClick={handleApplyFix} loading={applying} icon={Check} label="Fix All Automatically" />
        )}
        {hasReviewableDiffs && (
          <PrimaryBtn onClick={() => setExpanded((v) => !v)} icon={Eye} label="Review & Apply" />
        )}
        <TertiaryBtn onClick={() => onAction('ask_curator', rec)} icon={HelpCircle} label="Ask Curator" />
      </div>
      {expanded && hasReviewableDiffs && (
        <div className="mt-5 rounded-[16px] p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(140,105,65,0.16)' }}>
          <div className="space-y-4">
            {actionableItems.map((item) => (
              <div key={item.recordId} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="text-sm font-medium" style={{ color: '#F5F5F7' }}>{item.recordName}</div>
                  {singleItemPath(item) && (
                    <a
                      href={singleItemPath(item)}
                      className="px-3 h-7 rounded-lg text-xs font-semibold inline-flex items-center"
                      style={{ border: '1px solid rgba(255,255,255,0.12)', color: '#A1A1AA', textDecoration: 'none' }}
                    >
                      Open
                    </a>
                  )}
                </div>
                {Object.entries(item.proposedChange.payload).map(([field, proposedValue]) => {
                  // Resolve the current value from the item record.
                  // The item carries the raw entity fields using the same snake_case keys
                  // that appear in the proposedChange payload, so direct lookup is correct.
                  const currentValue = Object.prototype.hasOwnProperty.call(item, field)
                    ? item[field]
                    : item.proposedChange?.currentValues?.[field];
                  return (
                    <div key={`${item.recordId}-${field}`} className="flex items-center gap-3 text-sm" style={{ color: '#A1A1AA' }}>
                      <span className="w-28 shrink-0">{field}</span>
                      <span className="flex-1 truncate" style={{ color: '#71717A' }}>
                        {currentValue != null && currentValue !== '' ? String(currentValue) : 'Not set'}
                      </span>
                      <span>→</span>
                      <span className="flex-1 truncate" style={{ color: '#F5F5F7' }}>{String(proposedValue)}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-5">
            <button
              type="button"
              onClick={() => onAction?.('approve_changes', rec, { reviewedItems: actionableItems })}
              className="inline-flex items-center gap-2 px-5 h-12 rounded-xl font-medium"
              style={{ background: '#C6A15B', color: '#0B0B0C' }}
            >
              Apply Changes
            </button>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="inline-flex items-center gap-2 px-5 h-12 rounded-xl font-medium"
              style={{ border: '1px solid rgba(255,255,255,0.12)', color: '#F5F5F7' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const COLLECTION_OPT_ROTATION_GOALS = new Set([
  'underused_blends', 'never_smoked_blends', 'underused_pipes',
]);

function CollectionOptActions({ rec, onAction, onOpenGrowExpand }) {
  const [done, setDone] = useState(false);

  if (done) return <DoneIndicator label="Added to Rotation" />;

  if (rec.goal === 'tobacco_type_imbalance') {
    return (
      <>
        <PrimaryBtn onClick={() => onOpenGrowExpand?.()} icon={TrendingUp} label="Explore Gaps" />
        <TertiaryBtn onClick={() => onAction('ask_curator', rec)} icon={HelpCircle} label="Ask Curator" />
      </>
    );
  }

  if (COLLECTION_OPT_ROTATION_GOALS.has(rec.goal)) {
    return (
      <>
        <PrimaryBtn onClick={() => { onAction('add_to_rotation', rec); setDone(true); }} icon={RotateCcw} label="Add to Rotation" />
        <SecondaryBtn onClick={() => { onAction('mark_for_session', rec); setDone(true); }} icon={CalendarClock} label="Mark for Session" />
        <TertiaryBtn onClick={() => onAction('ask_curator', rec)} icon={HelpCircle} label="Ask Curator" />
      </>
    );
  }

  return (
    <>
      <PrimaryBtn onClick={() => onAction('apply_suggestion', rec)} icon={Check} label="Apply Suggestion" />
      <SecondaryBtn onClick={() => { onAction('acknowledge', rec); setDone(true); }} icon={Check} label="Mark Reviewed" />
      <TertiaryBtn onClick={() => onAction('ask_curator', rec)} icon={HelpCircle} label="Ask Curator" />
    </>
  );
}

function AutoFixActions({ rec, onAction }) {
  const [applying, setApplying] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const allItems = rec.items || [];
  const hasPayloads = allItems.some(hasNonEmptyPayload);

  const handleApplyFix = async () => {
    setApplying(true);
    try { await onAction('apply_fix', rec); }
    finally { setApplying(false); }
  };

  const handleApprove = async () => {
    await onAction('approve_changes', rec);
    setShowReview(false);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <PrimaryBtn onClick={handleApplyFix} loading={applying} icon={Check} label="Fix All Automatically" />
        <SecondaryBtn onClick={() => setShowReview((v) => !v)} icon={Eye} label="Review & Apply" />
        <TertiaryBtn onClick={() => onAction('ask_curator', rec)} icon={HelpCircle} label="Ask Curator" />
      </div>
      {showReview && hasPayloads && (
        <InlineReviewPanel
          rec={rec}
          onApply={handleApprove}
          onCancel={() => setShowReview(false)}
        />
      )}
    </>
  );
}

function ReviewRequiredActions({ rec, onAction }) {
  const [applying, setApplying] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const allItems = rec.items || [];
  const hasPayloads = allItems.some(hasNonEmptyPayload);
  const itemsWithPayloads = allItems.filter(hasNonEmptyPayload);

  const handleApprove = async () => {
    setApplying(true);
    try {
      await onAction('approve_changes', rec, { reviewedItems: itemsWithPayloads });
      setShowReview(false);
    }
    finally { setApplying(false); }
  };

  // No payloads — nothing to review inline; direct user to open records instead.
  if (!hasPayloads) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <TertiaryBtn onClick={() => onAction('view_details', rec)} icon={Eye} label="Open Records" />
        <TertiaryBtn onClick={() => onAction('ask_curator', rec)} icon={HelpCircle} label="Ask Curator" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <PrimaryBtn onClick={() => setShowReview((v) => !v)} icon={Eye} label="Review & Apply" />
        <SecondaryBtn onClick={handleApprove} disabled={applying} icon={Check} label="Approve Changes" />
        <TertiaryBtn onClick={() => onAction('ask_curator', rec)} icon={HelpCircle} label="Ask Curator" />
      </div>
      {showReview && (
        <InlineReviewPanel
          rec={rec}
          onApply={handleApprove}
          onCancel={() => setShowReview(false)}
        />
      )}
    </>
  );
}

function AdvisoryActions({ rec, onAction, onOpenGrowExpand }) {
  const [done, setDone] = useState(false);

  if (COLLECTION_OPT_ROTATION_GOALS.has(rec.goal) || rec.goal === 'tobacco_type_imbalance') {
    return <CollectionOptActions rec={rec} onAction={onAction} onOpenGrowExpand={onOpenGrowExpand} />;
  }

  if (done) return <DoneIndicator label="Acknowledged" />;

  const itemsWithPayloads = (rec.items || []).filter(hasNonEmptyPayload);

  return (
    <>
      <PrimaryBtn
        onClick={() => onAction('approve_changes', rec, { reviewedItems: itemsWithPayloads.length ? itemsWithPayloads : rec.items || [] })}
        icon={Check}
        label="Apply Suggestion"
      />
      <SecondaryBtn onClick={() => { onAction('acknowledge', rec); setDone(true); }} icon={Check} label="Mark Reviewed" />
      <TertiaryBtn onClick={() => onAction('ask_curator', rec)} icon={HelpCircle} label="Ask Curator" />
    </>
  );
}

function ActionRow({ rec, onAction, onOpenGrowExpand }) {
  const isRecordOpt = rec.category === CATEGORY.RECORD_OPTIMIZATION || rec.category === CATEGORY.METADATA;

  if (isRecordOpt) {
    return <RecordOptimizationActions rec={rec} onAction={onAction} />;
  }

  switch (rec.actionType) {
    case ACTION_TYPE.AUTO_FIX:
      return <AutoFixActions rec={rec} onAction={onAction} />;
    case ACTION_TYPE.REVIEW_REQUIRED:
      return <ReviewRequiredActions rec={rec} onAction={onAction} />;
    case ACTION_TYPE.ADVISORY:
      return <AdvisoryActions rec={rec} onAction={onAction} onOpenGrowExpand={onOpenGrowExpand} />;
    default:
      return <AdvisoryActions rec={rec} onAction={onAction} onOpenGrowExpand={onOpenGrowExpand} />;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * @param {{ rec?: object, recommendation?: object, onAction: Function, onOpenGrowExpand?: Function }} props
 * Accepts both `rec` and `recommendation` for backward compatibility.
 */
export default function CuratorRecommendationGroup({ rec: recProp, recommendation, onAction, onOpenGrowExpand }) {
  const rec = recProp ?? recommendation;
  if (!rec) return null;

  const actionBadge  = ACTION_TYPE_BADGE[rec.actionType] || ACTION_TYPE_BADGE[ACTION_TYPE.ADVISORY];
  const moduleMeta   = MODULE_LABEL[rec.moduleKey];
  const priorityMeta = PRIORITY_STYLES[rec.priority] || PRIORITY_STYLES.medium;
  const items        = rec.items || [];
  const summary      = rec.summary || rec.whyItMatters || '';
  const explanation  = rec.whyItMatters && rec.whyItMatters !== summary ? rec.whyItMatters : null;

  return (
    <div
      style={{
        background: 'linear-gradient(145deg, #17171A 0%, #111113 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
        borderRadius: '18px',
        padding: '24px',
      }}
    >
      {/* 1. Header chips row */}
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Action type badge */}
          <span
            style={{ background: actionBadge.bg, color: actionBadge.text, fontSize: '13px', fontWeight: 600, padding: '3px 10px', borderRadius: '999px' }}
          >
            {actionBadge.label}
          </span>
          {/* Module badge */}
          {moduleMeta && (
            <span
              style={{ color: moduleMeta.text, fontSize: '13px', fontWeight: 600, padding: '3px 10px', borderRadius: '999px', background: 'rgba(255,255,255,0.05)' }}
            >
              {moduleMeta.label}
            </span>
          )}
          {/* Priority badge */}
          <span
            style={{ background: priorityMeta.bg, color: priorityMeta.text, border: `1px solid ${priorityMeta.border}`, fontSize: '12px', fontWeight: 600, padding: '2px 9px', borderRadius: '999px' }}
          >
            {priorityMeta.label}
          </span>
        </div>
        {/* Item count */}
        {items.length > 0 && (
          <span
            style={{ color: '#A1A1AA', fontSize: '13px', fontWeight: 600, background: 'rgba(255,255,255,0.05)', padding: '3px 10px', borderRadius: '999px' }}
          >
            {items.length} item{items.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* 2. Title */}
      <p style={{ color: '#F5F5F7', fontSize: '18px', fontWeight: 600, lineHeight: 1.3, margin: '0 0 8px 0' }}>
        {rec.title}
      </p>

      {/* 3. Impact statement (1 line) */}
      {summary && (
        <p style={{ color: '#F5F5F7', fontSize: '16px', lineHeight: 1.6, margin: '0 0 6px 0' }}>
          {summary}
        </p>
      )}

      {/* 4. Explanation (max 2 lines) */}
      {explanation && (
        <p
          style={{ color: '#A1A1AA', fontSize: '16px', lineHeight: 1.6, margin: '0 0 12px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        >
          {explanation}
        </p>
      )}

      {/* 5. Item chips preview */}
      {items.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <CuratorItemPreviewList items={items} maxPreview={5} />
        </div>
      )}

      {/* 6. Actions row */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
        <ActionRow rec={rec} onAction={onAction} onOpenGrowExpand={onOpenGrowExpand} />
      </div>
    </div>
  );
}