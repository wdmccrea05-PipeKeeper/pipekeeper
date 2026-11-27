import React from 'react';
import { CheckCircle2, XCircle, MinusCircle, Ban, Undo2, Loader2 } from 'lucide-react';
import { describeReason } from '@/lib/actions/actionModel';
import { ACTION_LABELS } from '@/lib/actions/actionLabels';

/**
 * What actually happened, per record.
 *
 * Completed, failed, skipped and blocked are counted separately and a partial
 * failure is never rounded up to a success. Undo is offered only for the runs the
 * server reported as reversible.
 */
export default function ActionResultSummary({ result, onUndo, undoBusy = false, onDismiss }) {
  if (!result) return null;

  const counts = [
    { key: 'completed', label: 'Applied', value: result.completed, color: '#8FCFAF', Icon: CheckCircle2 },
    { key: 'failed', label: 'Failed', value: result.failed, color: '#E0A0A0', Icon: XCircle },
    { key: 'skipped', label: 'No change needed', value: result.skipped, color: 'rgba(224,216,200,0.6)', Icon: MinusCircle },
    { key: 'blocked', label: 'Blocked', value: result.blocked, color: 'rgba(224,216,200,0.6)', Icon: Ban },
  ].filter((entry) => entry.value > 0);

  const problems = (result.rows || []).filter((row) => row.status === 'failed' || row.status === 'skipped');

  return (
    <div
      className="rounded-[14px] p-3 sm:p-4 min-w-0"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(180,140,75,0.2)' }}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {counts.length === 0 ? (
          <span className="text-[13px]" style={{ color: '#B8B2A5' }}>Nothing was changed.</span>
        ) : (
          counts.map(({ key, label, value, color, Icon }) => (
            <span key={key} className="inline-flex items-center gap-1.5 text-[12.5px]" style={{ color }}>
              <Icon className="w-3.5 h-3.5" /> {value} {label.toLowerCase()}
            </span>
          ))
        )}
        {result.duplicates > 0 && (
          <span className="text-[12px]" style={{ color: 'rgba(224,216,200,0.55)' }}>
            Already applied earlier — not repeated.
          </span>
        )}
      </div>

      {result.undone && (
        <p className="mt-2 text-[12.5px]" style={{ color: '#8FCFAF' }}>
          {result.undoMessage || 'The change was reversed.'}
        </p>
      )}

      {problems.length > 0 && (
        <div className="mt-2 space-y-1">
          {problems.slice(0, 6).map((row, index) => (
            <p key={`${row.recordId}-${index}`} className="text-[12px] leading-5 break-words" style={{ color: 'rgba(224,216,200,0.6)' }}>
              {row.name ? `${row.name}: ` : ''}
              {describeReason(row.reason) || row.status}
            </p>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {onUndo && (result.undoableExecutionIds || []).map((executionId) => (
          <button
            key={executionId}
            type="button"
            onClick={() => onUndo(executionId)}
            disabled={undoBusy || result.undone}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12.5px] font-semibold min-h-[40px]"
            style={{ background: 'transparent', color: '#E0D8C8', border: '1px solid rgba(180,140,75,0.35)' }}
          >
            {undoBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />}
            {ACTION_LABELS.undo}
          </button>
        ))}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-[12px] font-semibold"
            style={{ color: 'rgba(224,216,200,0.6)', background: 'transparent', border: 'none' }}
          >
            {ACTION_LABELS.done}
          </button>
        )}
      </div>
    </div>
  );
}