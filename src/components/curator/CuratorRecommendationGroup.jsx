/**
 * CuratorRecommendationGroup — compact operational card
 *
 * One card = one recommendation goal/cohort.
 *
 * Card structure:
 *   Header row: [type badge] [module label] [priority badge]  |  [item count]
 *   Title
 *   Why-it-matters line (1 line max)
 *   Item preview chips (top 3–5) + "+N more"
 *   Action row: ONE primary button + secondary + optional tertiary
 *
 * Action hierarchy (per spec):
 *   primary   — filled
 *   secondary — outline
 *   tertiary  — ghost text
 *
 * Action type mapping:
 *   auto_fix             → Apply Fix (primary)  | Review Details (secondary) | Ask Curator (tertiary)
 *   advisory             → View Items (primary)  | Acknowledge (secondary)    | Ask Curator (tertiary)
 *   review_required      → Review Details (secondary) | Approve Changes (primary)  | Ask Curator (tertiary)
 *   multi_path           → Treat Individually (primary) | Ask for More Info (secondary) | Acknowledge (tertiary)
 *   shopping_list_action → Add All to Shopping List (primary) | Review Items (secondary)
 */

import React, { useState } from 'react';
import {
  Check, Eye, ShoppingCart, SplitSquareVertical,
  HelpCircle, Loader2, CheckCircle2, ArrowRight,
  RotateCcw, CalendarClock, TrendingUp,
} from 'lucide-react';
import { ACTION_TYPE, PRIORITY_STYLES, MODULE_KEY } from '@/lib/curator/recommendationSchema.js';
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

// ─── Reusable button primitives ───────────────────────────────────────────────

function PrimaryBtn({ onClick, disabled, loading, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="inline-flex items-center gap-2 font-semibold transition-all disabled:opacity-50"
      style={{
        background: '#C6A15B',
        color: '#0B0B0C',
        height: '40px',
        padding: '0 16px',
        borderRadius: '12px',
        fontSize: '14px',
        border: 'none',
      }}
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
      style={{
        background: 'transparent',
        color: '#F5F5F7',
        height: '40px',
        padding: '0 16px',
        borderRadius: '12px',
        fontSize: '14px',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
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
      style={{
        color: '#A1A1AA',
        background: 'transparent',
        border: 'none',
        fontSize: '14px',
        padding: '0 8px',
        height: '40px',
      }}
    >
      {Icon ? <Icon className="w-4 h-4" /> : null}
      {label}
    </button>
  );
}

function DoneIndicator({ label }) {
  return (
    <span className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(80,180,130,0.9)' }}>
      <CheckCircle2 className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}

// ─── Action rows by type ──────────────────────────────────────────────────────

// Goals that belong to Collection Optimization and need specific operational actions
const COLLECTION_OPT_ROTATION_GOALS = new Set([
  'underused_blends', 'never_smoked_blends', 'underused_pipes',
]);

function AutoFixActions({ rec, onAction }) {
  const [applying, setApplying] = useState(false);
  const [done, setDone]         = useState(false);

  if (done) return <DoneIndicator label="Fix Applied" />;

  const handleApply = async () => {
    setApplying(true);
    try { await onAction('apply_fix', rec); setDone(true); }
    finally { setApplying(false); }
  };

  return (
    <>
      <PrimaryBtn onClick={handleApply} loading={applying} icon={Check} label="Fix Now" />
      <SecondaryBtn onClick={() => { onAction('mark_reviewed', rec); }} icon={Check} label="Mark Reviewed" />
      <TertiaryBtn onClick={() => onAction('ask_curator', rec)} icon={HelpCircle} label="Ask Curator" />
    </>
  );
}

// Collection Optimization: goal-specific operational actions
function CollectionOptActions({ rec, onAction, onOpenGrowExpand }) {
  const [done, setDone] = useState(false);

  if (done) return <DoneIndicator label="Added to Rotation" />;

  // Gap identification → send to Grow & Expand
  if (rec.goal === 'tobacco_type_imbalance') {
    return (
      <>
        <PrimaryBtn
          onClick={() => onOpenGrowExpand?.()}
          icon={TrendingUp}
          label="Explore Gaps"
        />
        <TertiaryBtn onClick={() => onAction('ask_curator', rec)} icon={HelpCircle} label="Ask Curator" />
      </>
    );
  }

  // Cellar blends / never-smoked blends
  if (rec.goal === 'underused_blends' || rec.goal === 'never_smoked_blends') {
    return (
      <>
        <PrimaryBtn
          onClick={() => { onAction('add_to_rotation', rec); setDone(true); }}
          icon={RotateCcw}
          label="Add to Rotation"
        />
        <SecondaryBtn
          onClick={() => { onAction('mark_for_session', rec); setDone(true); }}
          icon={CalendarClock}
          label="Mark for Session"
        />
        <TertiaryBtn onClick={() => onAction('ask_curator', rec)} icon={HelpCircle} label="Ask Curator" />
      </>
    );
  }

  // Underused pipes
  if (rec.goal === 'underused_pipes') {
    return (
      <>
        <PrimaryBtn
          onClick={() => { onAction('add_to_rotation', rec); setDone(true); }}
          icon={RotateCcw}
          label="Add to Rotation"
        />
        <SecondaryBtn
          onClick={() => { onAction('mark_for_session', rec); setDone(true); }}
          icon={CalendarClock}
          label="Mark for Session"
        />
        <TertiaryBtn onClick={() => onAction('ask_curator', rec)} icon={HelpCircle} label="Ask Curator" />
      </>
    );
  }

  // Generic fallback advisory
  return (
    <>
      <PrimaryBtn onClick={() => onAction('apply_suggestion', rec)} icon={Check} label="Apply Suggestion" />
      <SecondaryBtn
        onClick={() => { onAction('acknowledge', rec); setDone(true); }}
        icon={Check}
        label="Mark Reviewed"
      />
      <TertiaryBtn onClick={() => onAction('ask_curator', rec)} icon={HelpCircle} label="Ask Curator" />
    </>
  );
}

function AdvisoryActions({ rec, onAction, onOpenGrowExpand }) {
  const [done, setDone] = useState(false);

  // Route collection optimization goals to specific operational actions
  if (COLLECTION_OPT_ROTATION_GOALS.has(rec.goal) || rec.goal === 'tobacco_type_imbalance') {
    return (
      <CollectionOptActions rec={rec} onAction={onAction} onOpenGrowExpand={onOpenGrowExpand} />
    );
  }

  if (done) return <DoneIndicator label="Acknowledged" />;

  return (
    <>
      <PrimaryBtn onClick={() => onAction('apply_suggestion', rec)} icon={Check} label="Apply Suggestion" />
      <SecondaryBtn
        onClick={() => { onAction('acknowledge', rec); setDone(true); }}
        icon={Check}
        label="Mark Reviewed"
      />
      <TertiaryBtn onClick={() => onAction('ask_curator', rec)} icon={HelpCircle} label="Ask Curator" />
    </>
  );
}


function ReviewRequiredActions({ rec, onAction }) {
  const [applying, setApplying] = useState(false);
  const [done, setDone]         = useState(false);
  const [showReview, setShowReview] = useState(false);

  if (done) return <DoneIndicator label="Changes Applied" />;

  const allItems           = rec.items || [];
  const itemsWithProposals = allItems.filter((i) => i.proposedChange?.payload);
  const itemsNeedingEdit   = allItems.filter((i) => !i.proposedChange?.payload);
  const hasProposals       = itemsWithProposals.length > 0;
  const hasManualItems     = itemsNeedingEdit.length > 0;

  const handleApprove = async () => {
    setApplying(true);
    try { await onAction('approve_changes', rec); if (hasProposals) setDone(true); }
    finally { setApplying(false); }
  };

  return (
    <>
      {/* Primary: Approve Changes (when proposals exist) */}
      {hasProposals && (
        <PrimaryBtn
          onClick={handleApprove}
          loading={applying}
          icon={Check}
          label={`Approve ${itemsWithProposals.length > 1 ? `${itemsWithProposals.length} Changes` : 'Change'}`}
        />
      )}

      {/* Review Details always available */}
      <SecondaryBtn
        onClick={() => setShowReview((s) => !s)}
        icon={Eye}
        label={showReview ? 'Hide Details' : 'Review Details'}
        colorText="rgba(220,140,90,0.9)"
      />

      {/* Ask Curator as tertiary */}
      <TertiaryBtn onClick={() => onAction('ask_curator', rec)} icon={HelpCircle} label="Ask Curator" />

      {/* Inline review panel */}
      {showReview && (
        <div
          className="basis-full w-full mt-2 rounded-xl p-4 space-y-2"
          style={{ background: 'rgba(180,100,50,0.07)', border: '1px solid rgba(180,100,50,0.22)' }}
        >
          {/* Auto-approvable items */}
          {hasProposals && (
            <>
              <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(220,140,90,0.9)' }}>
                Curator-proposed changes — review and approve below
              </p>
              {itemsWithProposals.slice(0, 12).map((item) => (
                <div
                  key={item.recordId || item.id}
                  className="grid gap-1 pb-1.5"
                  style={{ gridTemplateColumns: '1fr auto', borderBottom: '1px solid rgba(140,105,65,0.08)' }}
                >
                  <span className="text-xs font-medium truncate" style={{ color: 'rgba(224,216,200,0.88)' }}>
                    {item.itemName || item.recordName}
                  </span>
                  <span className="text-xs font-semibold whitespace-nowrap" style={{ color: 'rgba(220,140,90,0.95)' }}>
                    {item.proposedChange.field}: <span style={{ color: 'rgba(80,180,130,0.95)' }}>{item.proposedChange.displayValue}</span>
                  </span>
                  {item.proposedChange?.reasoning && (
                    <span className="text-[10px] col-span-2" style={{ color: 'rgba(224,216,200,0.42)' }}>
                      {item.proposedChange.reasoning}
                    </span>
                  )}
                </div>
              ))}
              {itemsWithProposals.length > 12 && (
                <p className="text-[10px]" style={{ color: 'rgba(224,216,200,0.38)' }}>
                  +{itemsWithProposals.length - 12} more — all will be approved together
                </p>
              )}
            </>
          )}

          {/* Items needing manual input */}
          {hasManualItems && (
            <>
              {hasProposals && (
                <p className="text-xs font-semibold pt-2 mt-2" style={{ color: 'rgba(160,200,240,0.8)', borderTop: '1px solid rgba(140,105,65,0.12)' }}>
                  Also needs manual input ({itemsNeedingEdit.length})
                </p>
              )}
              {!hasProposals && (
                <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(220,140,90,0.9)' }}>
                  These records need values the Curator can't infer automatically
                </p>
              )}
              {itemsNeedingEdit.slice(0, 12).map((item) => {
                const fields = item.missingFields?.join(', ') || rec.actionPayload?.field || 'missing fields';
                return (
                  <div
                    key={item.recordId || item.id}
                    className="flex items-center justify-between gap-2 pb-1"
                    style={{ borderBottom: '1px solid rgba(140,105,65,0.08)' }}
                  >
                    <span className="text-xs font-medium truncate" style={{ color: 'rgba(224,216,200,0.88)' }}>
                      {item.itemName || item.recordName}
                    </span>
                    <span className="text-xs shrink-0" style={{ color: 'rgba(220,140,90,0.7)' }}>
                      {fields}
                    </span>
                  </div>
                );
              })}
              {itemsNeedingEdit.length > 12 && (
                <p className="text-[10px]" style={{ color: 'rgba(224,216,200,0.38)' }}>
                  +{itemsNeedingEdit.length - 12} more records need attention
                </p>
              )}
              <div
                className="flex items-center gap-2 pt-2 mt-1"
                style={{ borderTop: '1px solid rgba(140,105,65,0.1)' }}
              >
                <button
                  type="button"
                  onClick={() => onAction('ask_curator', rec)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={{ background: 'rgba(74,124,156,0.15)', color: 'rgba(120,170,220,0.9)', border: '1px solid rgba(74,124,156,0.28)' }}
                >
                  <HelpCircle className="w-3 h-3" />
                  Ask Curator for guidance
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

function MultiPathActions({ rec, onAction, onOpenSpecialization }) {
  const [done, setDone] = useState(false);

  if (done) return <DoneIndicator label="Acknowledged" />;

  const handleTreatIndividually = () => {
    onAction('treat_individually', rec);
    onOpenSpecialization?.();
  };

  return (
    <>
      <PrimaryBtn
        onClick={handleTreatIndividually}
        icon={SplitSquareVertical}
        label="Treat Individually"
      />
      <SecondaryBtn
        onClick={() => onAction('ask_curator', rec)}
        icon={HelpCircle}
        label="Ask for More Info"
      />
      <TertiaryBtn
        onClick={() => { onAction('acknowledge', rec); setDone(true); }}
        label="Mark Reviewed"
      />
    </>
  );
}

function ShoppingActions({ rec, onAction, onOpenPurchase }) {
  const [applying, setApplying] = useState(false);
  const [done, setDone]         = useState(false);

  if (done) return <DoneIndicator label="Added to Shopping List" />;

  const handleAddAll = async () => {
    setApplying(true);
    try { await onAction('add_to_shopping_list', rec); setDone(true); }
    finally { setApplying(false); }
  };

  return (
    <>
      <PrimaryBtn
        onClick={handleAddAll}
        loading={applying}
        icon={ShoppingCart}
        label="Add All to Shopping List"
      />
      <SecondaryBtn
        onClick={() => onOpenPurchase?.()}
        icon={ArrowRight}
        label="Review Items"
      />
    </>
  );
}

// ─── CuratorRecommendationGroup ───────────────────────────────────────────────

/**
 * @param {object}   props
 * @param {object}   props.recommendation       - Structured recommendation object
 * @param {Function} props.onAction             - (actionKey, rec, opts) => Promise
 * @param {Function} props.onOpenSpecialization - () => void  — navigate to Specialization Review
 * @param {Function} props.onOpenPurchase       - () => void  — navigate to Purchase & Restock
 * @param {Function} [props.onOpenGrowExpand]   - () => void  — navigate to Grow & Expand
 */
export default function CuratorRecommendationGroup({
  recommendation: rec,
  onAction,
  onOpenSpecialization,
  onOpenPurchase,
  onOpenGrowExpand,
}) {
  if (!rec) return null;

  const at        = rec.actionType;
  const typeBadge = ACTION_TYPE_BADGE[at];
  const modInfo   = MODULE_LABEL[rec.moduleKey];
  const priStyle  = PRIORITY_STYLES[rec.priority];
  const itemCount = rec.items?.length || 0;

  return (
    <div
      className="space-y-4"
      style={{
        background: 'linear-gradient(145deg, #17171A 0%, #111113 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
        borderRadius: '18px',
        padding: '24px',
      }}
    >
      {/* Header: badges + title + item count */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Badge row */}
          <div className="flex items-center flex-wrap gap-2 mb-3">
            {typeBadge && (
              <span
                className="font-semibold"
                style={{ background: typeBadge.bg, color: typeBadge.text, fontSize: '13px', padding: '2px 10px', borderRadius: '999px' }}
              >
                {typeBadge.label}
              </span>
            )}
            {modInfo && (
              <span style={{ color: modInfo.text, fontSize: '13px', fontWeight: 600 }}>
                {modInfo.label}
              </span>
            )}
            {priStyle && (
              <span
                style={{ background: priStyle.bg, color: priStyle.text, border: `1px solid ${priStyle.border}`, fontSize: '13px', fontWeight: 600, padding: '2px 10px', borderRadius: '999px' }}
              >
                {priStyle.label}
              </span>
            )}
          </div>
          {/* Title */}
          <p style={{ color: '#F5F5F7', fontSize: '18px', fontWeight: 600, lineHeight: 1.3, margin: 0 }}>
            {rec.title}
          </p>
          {/* Summary line */}
          {rec.summary && (
            <p style={{ color: '#A1A1AA', fontSize: '16px', lineHeight: 1.6, marginTop: '8px' }}>
              {rec.summary}
            </p>
          )}
        </div>
        {/* Item count */}
        {itemCount > 0 && (
          <span
            className="shrink-0 text-xs px-2.5 py-1 rounded-full tabular-nums self-start font-semibold"
            style={{ background: 'rgba(80,80,80,0.12)', color: 'rgba(224,216,200,0.5)', border: '1px solid rgba(100,100,100,0.2)' }}
          >
            {itemCount}
          </span>
        )}
      </div>

      {/* Why it matters */}
      {rec.whyItMatters && (
        <p style={{ color: '#A1A1AA', fontSize: '16px', lineHeight: 1.6 }}>
          {rec.whyItMatters}
        </p>
      )}

      {/* Item preview chips */}
      {itemCount > 0 && (
        <CuratorItemPreviewList items={rec.items} maxPreview={5} />
      )}

      {/* Action row */}
      <div
        className="flex flex-wrap items-center gap-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', marginTop: '8px' }}
      >
        {at === ACTION_TYPE.AUTO_FIX && (
          <AutoFixActions rec={rec} onAction={onAction} />
        )}
        {at === ACTION_TYPE.ADVISORY && (
          <AdvisoryActions rec={rec} onAction={onAction} onOpenGrowExpand={onOpenGrowExpand} />
        )}
        {at === ACTION_TYPE.REVIEW_REQUIRED && (
          <ReviewRequiredActions rec={rec} onAction={onAction} />
        )}
        {at === ACTION_TYPE.MULTI_PATH && (
          <MultiPathActions rec={rec} onAction={onAction} onOpenSpecialization={onOpenSpecialization} />
        )}
        {at === ACTION_TYPE.SHOPPING_LIST_ACTION && (
          <ShoppingActions rec={rec} onAction={onAction} onOpenPurchase={onOpenPurchase} />
        )}
      </div>
    </div>
  );
}