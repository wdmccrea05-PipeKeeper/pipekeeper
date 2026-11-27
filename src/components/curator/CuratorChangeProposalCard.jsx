import React from 'react';
import { Check, X, Undo2, AlertTriangle, Loader2 } from 'lucide-react';

/**
 * Confirmation surface for a change Curator proposes.
 *
 * Shows the recorded value beside the proposed one, and nothing is written
 * until Confirm is pressed. Once applied, the same card offers a reversal.
 */
export default function CuratorChangeProposalCard({
  proposal,
  state = 'proposed',
  result = null,
  onConfirm,
  onCancel,
  onUndo,
}) {
  if (!proposal) return null;

  const busy = state === 'applying';
  const heading =
    state === 'applied' ? 'Change applied'
    : state === 'cancelled' ? 'Change cancelled'
    : state === 'failed' ? 'Change not applied'
    : state === 'undone' ? 'Change reversed'
    : 'Proposed change';

  const failedReason = result?.error || result?.skipped?.[0]?.reason || null;

  return (
    <div
      className="mt-3 rounded-[14px] p-3 sm:p-4 min-w-0"
      style={{ background: 'rgba(198,161,91,0.07)', border: '1px solid rgba(198,161,91,0.24)' }}
    >
      <div className="text-[11px] uppercase tracking-[0.12em] mb-2" style={{ color: '#C6A15B' }}>
        {heading}
      </div>

      <div className="space-y-2">
        {(proposal.changes || []).map((change, index) => (
          <div
            key={`${change.field}-${index}`}
            className="grid grid-cols-1 sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-1 sm:gap-3 text-[13px] sm:text-[14px]"
          >
            <div className="font-semibold break-words" style={{ color: '#F5F1E7' }}>
              {change.label}
            </div>
            <div className="flex flex-wrap items-center gap-2 min-w-0 break-words">
              <span className="line-through" style={{ color: '#8A8578' }}>{change.from}</span>
              <span style={{ color: '#8A8578' }}>→</span>
              <span className="font-semibold break-words" style={{ color: '#C6A15B' }}>{change.to}</span>
            </div>
          </div>
        ))}
      </div>

      {proposal.bulk && proposal.recordNames?.length > 1 && (
        <div className="mt-3 text-[12px] leading-6 break-words" style={{ color: '#B8B2A5' }}>
          Applies to {proposal.recordNames.length} records: {proposal.recordNames.join(', ')}
        </div>
      )}

      {state === 'failed' && (
        <div className="mt-3 flex items-start gap-2 text-[13px] leading-6" style={{ color: '#E0A0A0' }}>
          <AlertTriangle className="w-4 h-4 mt-1 shrink-0" />
          <span className="break-words">
            The change was not saved{failedReason ? `: ${failedReason}` : '.'} Your record is unchanged.
          </span>
        </div>
      )}

      {state === 'cancelled' && (
        <div className="mt-3 text-[13px] leading-6" style={{ color: '#B8B2A5' }}>
          Nothing was written. Your record is exactly as it was.
        </div>
      )}

      {state === 'undone' && (
        <div className="mt-3 text-[13px] leading-6" style={{ color: '#B8B2A5' }}>
          The previous values were restored.
        </div>
      )}

      <div className="mt-3 flex flex-col sm:flex-row gap-2">
        {state === 'proposed' && (
          <>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold w-full sm:w-auto min-h-[44px]"
              style={{ background: '#A35C5C', color: '#fff' }}
            >
              <Check className="w-4 h-4" /> Confirm change
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold w-full sm:w-auto min-h-[44px]"
              style={{ background: 'transparent', color: '#E0D8C8', border: '1px solid rgba(180,140,75,0.35)' }}
            >
              <X className="w-4 h-4" /> Cancel
            </button>
          </>
        )}

        {state === 'applying' && (
          <div className="inline-flex items-center gap-2 text-[13px] min-h-[44px]" style={{ color: '#C6A15B' }}>
            <Loader2 className="w-4 h-4 animate-spin" /> Applying…
          </div>
        )}

        {(state === 'applied' || state === 'undone') && proposal.undoable && state === 'applied' && (
          <button
            type="button"
            onClick={onUndo}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold w-full sm:w-auto min-h-[44px]"
            style={{ background: 'transparent', color: '#E0D8C8', border: '1px solid rgba(180,140,75,0.35)' }}
          >
            <Undo2 className="w-4 h-4" /> Undo this change
          </button>
        )}
      </div>
    </div>
  );
}