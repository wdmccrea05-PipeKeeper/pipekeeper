/**
 * CuratorRecommendationGroup — action-first operational card
 */

import React, { useState } from 'react';
import {
  Check, Eye, Loader2, CheckCircle2,
  RotateCcw, CalendarClock, TrendingUp, HelpCircle,
  ChevronDown, ChevronUp, X,
} from 'lucide-react';
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

// ─── Inline Review Panel ──────────────────────────────────────────────────────

function InlineReviewPanel({ rec, onApply, onCancel }) {
  const [applying, setApplying] = useState(false);
  const allItems = rec.items || [];
  const itemsWithPayloads = allItems.filter((i) => i.proposedChange?.payload);

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
  const [showReview, setShowReview] = useState(false);

  const allItems = rec.items || [];
  const itemsWithPayloads = allItems.filter((i) => i.proposedChange?.payload && Object.keys(i.proposedChange.payload).length > 0);
  const hasPayloads = itemsWithPayloads.length > 0;
  const isAutoFix = rec.actionType === ACTION_TYPE.AUTO_FIX;

  const handleApplyFix = async () => {
    setApplying(true);
    try { await onAction('apply_fix', rec); }
    finally { setApplying(false); }
  };

  const handleApprove = async () => {
    await onAction('approve_changes', rec);
    setShowReview(false);
  };

  // No payloads and not an auto-fix: nothing to auto-apply or review inline.
  // Show only "Ask Curator" so the user has guidance without a broken empty panel.
  if (!hasPayloads && !isAutoFix) {
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
        {(isAutoFix || hasPayloads) && (
          <PrimaryBtn onClick={handleApplyFix} loading={applying} icon={Check} label="Fix All Automatically" />
        )}
        {hasPayloads && (
          <SecondaryBtn onClick={() => setShowReview((v) => !v)} icon={Eye} label="Review & Apply" />
        )}
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
  const hasPayloads = allItems.some((i) => i.proposedChange?.payload);

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
  const itemsWithPayloads = allItems.filter((i) => i.proposedChange?.payload && Object.keys(i.proposedChange.payload).length > 0);
  const hasPayloads = itemsWithPayloads.length > 0;

  const handleApprove = async () => {
    setApplying(true);
    try { await onAction('approve_changes', rec); setShowReview(false); }
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

  return (
    <>
      <PrimaryBtn onClick={() => onAction('apply_suggestion', rec)} icon={Check} label="Apply Suggestion" />
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
