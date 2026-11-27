import React, { useEffect, useMemo, useState } from 'react';
import FindingRow from './FindingRow';
import ActionReviewDialog from './ActionReviewDialog';
import ActionResultSummary from './ActionResultSummary';
import useActionExecution from '@/hooks/useActionExecution';
import { applySelectedLabel } from '@/lib/actions/actionLabels';

/**
 * Reviewing findings, wherever they were found: collection health, a report or a
 * module panel.
 *
 * Findings that can be fixed here are selectable, individually or in bulk; the
 * selection is reviewed once and executed once, through the same executor and
 * audit trail as every other action. Findings that can only be documented on the
 * record carry links instead. Defer and dismiss are always available.
 */
export default function FindingsReviewPanel({
  findings = [],
  states = {},
  onStateChange,
  onApplied,
  title = '',
  description = '',
  emptyMessage = 'Nothing needs your attention here.',
}) {
  const [selections, setSelections] = useState({});
  const [reviewing, setReviewing] = useState([]);
  const { status, result, error, execute, undo, reset } = useActionExecution({ onApplied });

  const busy = status === 'executing';

  // Dismissed and resolved findings leave the list; deferred ones stay visible
  // with their own badge, because the collector chose to come back to them.
  const visible = useMemo(
    () =>
      findings.filter((finding) => {
        const current = states[finding.key]?.status;
        return current !== 'dismissed' && current !== 'resolved';
      }),
    [findings, states]
  );

  // A selection never survives a change of list.
  useEffect(() => {
    setSelections((prev) => {
      const next = {};
      let changed = false;
      for (const finding of visible) {
        if (prev[finding.key]) next[finding.key] = true;
        if (Boolean(prev[finding.key]) !== Boolean(next[finding.key])) changed = true;
      }
      if (!changed && Object.keys(prev).length !== Object.keys(next).length) changed = true;
      return changed ? next : prev;
    });
  }, [visible]);

  const alternatives = useMemo(() => {
    const out = {};
    for (const finding of visible) {
      for (const action of finding.actions || []) {
        if (action.alternatives?.length) out[action.id] = action.alternatives[0].id;
      }
    }
    return out;
  }, [visible]);

  const selected = visible.filter((finding) => selections[finding.key] && finding.actions?.length > 0);

  const confirm = async () => {
    const actions = reviewing.flatMap((finding) => finding.actions || []);
    if (actions.length === 0) {
      setReviewing([]);
      return;
    }

    const outcome = await execute(actions, {
      selections: Object.fromEntries(actions.map((action) => [action.id, true])),
      alternatives,
    });

    if (outcome?.completed > 0 && onStateChange) {
      const completedActionIds = new Set(
        (outcome.rows || []).filter((row) => row.status === 'completed').map((row) => row.actionId)
      );
      for (const finding of reviewing) {
        if ((finding.actions || []).some((action) => completedActionIds.has(action.id))) {
          await onStateChange(finding, 'resolved');
        }
      }
    }

    setReviewing([]);
    setSelections({});
  };

  return (
    <section className="space-y-3 min-w-0">
      {(title || description) && (
        <div className="min-w-0">
          {title && (
            <h2 className="text-base font-semibold break-words" style={{ color: '#F5F1E7' }}>
              {title}
            </h2>
          )}
          {description && (
            <p className="text-[12.5px] leading-6 break-words mt-1" style={{ color: 'rgba(224,216,200,0.6)' }}>
              {description}
            </p>
          )}
        </div>
      )}

      {result && (
        <ActionResultSummary result={result} onUndo={undo} undoBusy={busy} onDismiss={reset} />
      )}

      {error && (
        <p className="text-[12.5px] break-words" style={{ color: '#E0A0A0' }} role="alert">
          {error}
        </p>
      )}

      {visible.length === 0 ? (
        <p className="text-[13px] py-3 break-words" style={{ color: 'rgba(224,216,200,0.55)' }}>
          {emptyMessage}
        </p>
      ) : (
        visible.map((finding) => (
          <FindingRow
            key={finding.key}
            finding={finding}
            selected={Boolean(selections[finding.key])}
            onSelect={
              finding.actions?.length
                ? (next) => setSelections((prev) => ({ ...prev, [finding.key]: next }))
                : undefined
            }
            status={states[finding.key]?.status || null}
            busy={busy}
            onDefer={onStateChange ? (entry) => onStateChange(entry, 'deferred') : undefined}
            onDismiss={onStateChange ? (entry) => onStateChange(entry, 'dismissed') : undefined}
          />
        ))
      )}

      {selected.length > 0 && (
        <div
          className="sticky bottom-2 rounded-xl p-2.5 flex flex-wrap items-center gap-2"
          style={{ background: 'rgba(36,25,19,0.96)', border: '1px solid rgba(180,140,75,0.3)' }}
        >
          <button
            type="button"
            onClick={() => setReviewing(selected)}
            disabled={busy}
            className="rounded-xl px-3 py-2 text-[12.5px] font-semibold min-h-[40px]"
            style={{ background: '#A35C5C', color: '#fff', border: 'none' }}
          >
            {applySelectedLabel(selected.length)}
          </button>
          <span className="text-[11.5px]" style={{ color: 'rgba(224,216,200,0.55)' }}>
            You will see exactly what changes before anything is saved.
          </span>
        </div>
      )}

      <ActionReviewDialog
        open={reviewing.length > 0}
        actions={reviewing.flatMap((finding) => finding.actions || [])}
        alternatives={alternatives}
        busy={busy}
        error={error}
        onConfirm={confirm}
        onCancel={() => setReviewing([])}
      />
    </section>
  );
}