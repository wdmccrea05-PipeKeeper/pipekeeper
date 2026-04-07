/**
 * CuratorRecommendationGroup — NEW v2
 *
 * Renders a single structured recommendation as a compact grouped card.
 * One card = one goal/cohort, NOT one card per item.
 *
 * Card structure:
 *   [ACTION_TYPE badge] [PRIORITY badge]
 *   Title
 *   Why it matters line
 *   Item preview chips + "+N more"
 *   Action row (buttons depend on actionType)
 *
 * Action types → button sets:
 *   auto_fix:        [Apply Fix] [Review Details] [Ask Curator]
 *   advisory:        [Acknowledge] [View Items] [Ask Curator]
 *   review_required: [Review Details] [Approve Changes] [Ask Curator]
 *   multi_path:      [Acknowledge] [Ask for More Info] [Treat Individually]
 */

import React, { useState } from "react";
import { Check, Eye, HelpCircle, SplitSquareVertical, ChevronDown, ChevronUp, Loader2, CheckCircle2 } from "lucide-react";
import { ACTION_TYPE, ACTION_TYPE_LABELS, ACTION_TYPE_COLORS, PRIORITY_STYLES } from "@/lib/curator/recommendationSchema.js";
import CuratorItemPreviewList from "./CuratorItemPreviewList";
import CuratorPairingResults from "./CuratorPairingResults";
import CuratorSpecializationReview from "./CuratorSpecializationReview";

// ─── Action button sets ───────────────────────────────────────────────────────

function ActionButtons({ rec, onAction, applying }) {
  const at = rec.actionType;

  const btnBase = {
    className: "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50",
  };

  if (at === ACTION_TYPE.AUTO_FIX) {
    return (
      <>
        <button
          type="button"
          onClick={() => onAction('apply_fix', rec)}
          disabled={applying}
          {...btnBase}
          style={{ background: 'rgba(74,124,92,0.25)', color: 'rgba(80,180,130,1)', border: '1px solid rgba(74,124,92,0.4)' }}
        >
          {applying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          {applying ? 'Applying…' : 'Apply Fix'}
        </button>
        <button
          type="button"
          onClick={() => onAction('view_details', rec)}
          {...btnBase}
          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(224,216,200,0.6)', border: '1px solid rgba(140,105,65,0.2)' }}
        >
          <Eye className="w-3 h-3" />
          Review Details
        </button>
        <button
          type="button"
          onClick={() => onAction('ask_curator', rec)}
          {...btnBase}
          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(224,216,200,0.4)', border: '1px solid rgba(140,105,65,0.12)' }}
        >
          <HelpCircle className="w-3 h-3" />
          Ask Curator
        </button>
      </>
    );
  }

  if (at === ACTION_TYPE.ADVISORY) {
    return (
      <>
        <button
          type="button"
          onClick={() => onAction('acknowledge', rec)}
          {...btnBase}
          style={{ background: 'rgba(74,124,92,0.2)', color: 'rgba(100,180,130,0.9)', border: '1px solid rgba(74,124,92,0.35)' }}
        >
          <Check className="w-3 h-3" />
          Acknowledge
        </button>
        <button
          type="button"
          onClick={() => onAction('view_items', rec)}
          {...btnBase}
          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(224,216,200,0.6)', border: '1px solid rgba(140,105,65,0.2)' }}
        >
          <Eye className="w-3 h-3" />
          View Items
        </button>
        <button
          type="button"
          onClick={() => onAction('ask_curator', rec)}
          {...btnBase}
          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(224,216,200,0.4)', border: '1px solid rgba(140,105,65,0.12)' }}
        >
          <HelpCircle className="w-3 h-3" />
          Ask Curator
        </button>
      </>
    );
  }

  if (at === ACTION_TYPE.REVIEW_REQUIRED) {
    return (
      <>
        <button
          type="button"
          onClick={() => onAction('view_details', rec)}
          {...btnBase}
          style={{ background: 'rgba(180,100,50,0.2)', color: 'rgba(220,140,90,0.9)', border: '1px solid rgba(180,100,50,0.35)' }}
        >
          <Eye className="w-3 h-3" />
          Review Details
        </button>
        <button
          type="button"
          onClick={() => onAction('approve_changes', rec)}
          disabled={applying}
          {...btnBase}
          style={{ background: 'rgba(74,124,92,0.2)', color: 'rgba(100,180,130,0.9)', border: '1px solid rgba(74,124,92,0.35)' }}
        >
          {applying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          {applying ? 'Applying…' : 'Approve Changes'}
        </button>
        <button
          type="button"
          onClick={() => onAction('ask_curator', rec)}
          {...btnBase}
          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(224,216,200,0.4)', border: '1px solid rgba(140,105,65,0.12)' }}
        >
          <HelpCircle className="w-3 h-3" />
          Ask Curator
        </button>
      </>
    );
  }

  if (at === ACTION_TYPE.MULTI_PATH) {
    return (
      <>
        <button
          type="button"
          onClick={() => onAction('acknowledge', rec)}
          {...btnBase}
          style={{ background: 'rgba(74,124,92,0.2)', color: 'rgba(100,180,130,0.9)', border: '1px solid rgba(74,124,92,0.35)' }}
        >
          <Check className="w-3 h-3" />
          Acknowledge
        </button>
        <button
          type="button"
          onClick={() => onAction('treat_individually', rec)}
          {...btnBase}
          style={{ background: 'rgba(139,94,58,0.2)', color: 'rgba(200,155,100,0.9)', border: '1px solid rgba(139,94,58,0.35)' }}
        >
          <SplitSquareVertical className="w-3 h-3" />
          Treat Individually
        </button>
        <button
          type="button"
          onClick={() => onAction('ask_curator', rec)}
          {...btnBase}
          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(224,216,200,0.4)', border: '1px solid rgba(140,105,65,0.12)' }}
        >
          <HelpCircle className="w-3 h-3" />
          Ask for More Info
        </button>
      </>
    );
  }

  // Fallback
  return (
    <button
      type="button"
      onClick={() => onAction('acknowledge', rec)}
      {...btnBase}
      style={{ background: 'rgba(74,124,92,0.2)', color: 'rgba(100,180,130,0.9)', border: '1px solid rgba(74,124,92,0.35)' }}
    >
      <Check className="w-3 h-3" />
      Acknowledge
    </button>
  );
}

// ─── Success overlay ──────────────────────────────────────────────────────────

function SuccessOverlay({ message }) {
  return (
    <div className="flex items-center gap-2 py-2">
      <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: '#4A7C59' }} />
      <p className="text-sm" style={{ color: 'rgba(100,180,130,0.9)' }}>{message || 'Done.'}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * @param {object}   props
 * @param {object}   props.recommendation  - Structured recommendation object
 * @param {Function} props.onAction        - (actionKey, recommendation, opts?) => void
 * @param {Function} props.onAskCurator    - (promptText) => void
 */
export default function CuratorRecommendationGroup({ recommendation, onAction, onAskCurator }) {
  const [applying, setApplying] = useState(false);
  const [done, setDone] = useState(false);
  const [doneMessage, setDoneMessage] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [showSpecReview, setShowSpecReview] = useState(false);
  const [actionError, setActionError] = useState(null);

  const rec = recommendation;
  if (!rec) return null;

  const atColors = ACTION_TYPE_COLORS[rec.actionType] || ACTION_TYPE_COLORS[ACTION_TYPE.ADVISORY];
  const atLabel  = ACTION_TYPE_LABELS[rec.actionType] || rec.actionType;
  const ps       = PRIORITY_STYLES[rec.priority] || PRIORITY_STYLES.medium;

  const isPairing = rec.goal?.includes('pairing');
  const isSpec    = rec.goal?.includes('specialization') && rec.actionType === ACTION_TYPE.MULTI_PATH;

  function handleAction(actionKey, r, opts = {}) {
    setActionError(null);

    if (actionKey === 'ask_curator' || actionKey === 'ask_for_more_info') {
      const prompt = `Tell me more about this recommendation: "${r.title}". ${r.whyItMatters || ''} What should I do?`;
      if (onAskCurator) onAskCurator(prompt);
      return;
    }

    if (actionKey === 'treat_individually') {
      setShowSpecReview(true);
      return;
    }

    if (actionKey === 'view_details') {
      setShowDetails((v) => !v);
      return;
    }

    if (actionKey === 'view_items') {
      setShowDetails((v) => !v);
      return;
    }

    if (actionKey === 'acknowledge') {
      setDone(true);
      setDoneMessage('Acknowledged — this recommendation has been noted.');
      return;
    }

    // Delegate mutating actions to parent
    if (onAction) {
      setApplying(true);
      Promise.resolve(onAction(actionKey, r, opts))
        .then((result) => {
          setDone(true);
          setDoneMessage(result?.message || 'Fix applied successfully.');
        })
        .catch((err) => {
          setActionError(err?.message || 'Action failed. Please try again.');
        })
        .finally(() => setApplying(false));
    }
  }

  function handleSpecReviewDone(results) {
    setShowSpecReview(false);
    const accepted = Object.values(results || {}).filter((r) => r.status === 'accepted').length;
    if (accepted > 0) {
      setDone(true);
      setDoneMessage(`${accepted} specialization${accepted > 1 ? 's' : ''} applied.`);
    }
  }

  if (done) {
    return (
      <div
        className="rounded-xl px-4 py-3"
        style={{ background: 'rgba(74,124,92,0.08)', border: '1px solid rgba(74,124,92,0.25)' }}
      >
        <SuccessOverlay message={doneMessage} />
      </div>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: `1px solid ${ps.border}`, background: 'rgba(255,255,255,0.025)' }}
    >
      {/* Card body */}
      <div className="px-4 pt-3.5 pb-3 space-y-2.5">

        {/* Badge row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider"
            style={{ background: atColors.bg, color: atColors.text, border: `1px solid ${atColors.border}` }}
          >
            {atLabel}
          </span>
          {rec.priority !== 'low' && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider"
              style={{ background: ps.bg, color: ps.text, border: `1px solid ${ps.border}` }}
            >
              {ps.label}
            </span>
          )}
          {rec.moduleKey && rec.moduleKey !== 'multi' && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(224,216,200,0.4)', border: '1px solid rgba(140,105,65,0.15)' }}
            >
              {rec.moduleKey}
            </span>
          )}
        </div>

        {/* Title */}
        <p className="text-sm font-bold leading-tight" style={{ color: '#F5F1E7' }}>
          {rec.title}
        </p>

        {/* Why it matters */}
        {rec.whyItMatters && (
          <p className="text-xs leading-relaxed" style={{ color: 'rgba(224,216,200,0.55)' }}>
            {rec.whyItMatters}
          </p>
        )}

        {/* Item preview — for non-pairing recommendations */}
        {!isPairing && rec.items?.length > 0 && (
          <CuratorItemPreviewList items={rec.items} maxPreview={4} />
        )}

        {/* Pairing results */}
        {isPairing && rec.items?.length > 0 && (
          <>
            <CuratorPairingResults pairings={rec.items.slice(0, 3)} />
            {rec.items.length > 3 && (
              <p className="text-xs" style={{ color: 'rgba(224,216,200,0.4)' }}>
                +{rec.items.length - 3} more pairing suggestions
              </p>
            )}
          </>
        )}

        {/* Inline specialization review */}
        {showSpecReview && isSpec && (
          <CuratorSpecializationReview
            pipeItems={rec.items}
            onDone={handleSpecReviewDone}
            onAskCurator={onAskCurator}
          />
        )}

        {/* Inline detail expansion */}
        {showDetails && !showSpecReview && (
          <div
            className="rounded-lg p-3 space-y-1.5"
            style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(140,105,65,0.12)' }}
          >
            {rec.summary && (
              <p className="text-xs" style={{ color: 'rgba(224,216,200,0.6)' }}>{rec.summary}</p>
            )}
            {rec.recommendationText && (
              <p className="text-xs" style={{ color: 'rgba(224,216,200,0.5)' }}>{rec.recommendationText}</p>
            )}
            {rec.items?.length > 4 && (
              <div className="pt-1.5">
                <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'rgba(224,216,200,0.35)' }}>
                  All items ({rec.items.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {rec.items.map((item, idx) => (
                    <span
                      key={item.id || idx}
                      className="text-[11px] px-2 py-0.5 rounded"
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(224,216,200,0.6)', border: '1px solid rgba(140,105,65,0.15)' }}
                    >
                      {item.recordName || item.itemName || item.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {actionError && (
          <p className="text-xs" style={{ color: 'rgba(210,100,80,1)' }}>{actionError}</p>
        )}

        {/* Action row */}
        {!showSpecReview && (
          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            <ActionButtons rec={rec} onAction={handleAction} applying={applying} />
          </div>
        )}
      </div>
    </div>
  );
}
