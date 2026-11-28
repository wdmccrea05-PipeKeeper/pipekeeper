import React, { useEffect, useMemo, useState } from 'react';
import ActionCard from './ActionCard';
import ActionReviewDialog from './ActionReviewDialog';
import ActionResultSummary from './ActionResultSummary';
import useActionExecution from '@/hooks/useActionExecution';
import { applySelectedLabel } from '@/lib/actions/actionLabels';

/**
 * A set of proposals from any feature, handled the same way everywhere.
 *
 * Independent actions are selected with checkboxes, mutually exclusive ones with
 * radio buttons, and high-impact actions start unselected. Accepting opens the
 * preview; nothing is written until the preview is confirmed.
 */
export default function ActionList({
  actions = [],
  title = '',
  description = '',
  emptyMessage = 'Nothing needs your attention right now.',
  onComplete,
}) {
  const [selections, setSelections] = useState(() => {
    const initial = {};
    for (const action of actions) initial[action.id] = Boolean(action.defaultSelected);
    return initial;
  });
  const [alternatives, setAlternatives] = useState(() => {
    const initial = {};
    for (const action of actions) {
      if (action.alternatives?.length > 0) initial[action.id] = action.alternatives[0].id;
    }
    return initial;
  });
  const [deferred, setDeferred] = useState({});
  const [rejected, setRejected] = useState({});
  const [applied, setApplied] = useState({});
  const [reviewing, setReviewing] = useState([]);

  const { status, result, error, execute, undo, reset } = useActionExecution({
    onApplied: () => onComplete && onComplete(),
  });

  // A new set of proposals arriving from the server must not inherit the
  // previous selection state.
  useEffect(() => {
    setSelections((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const action of actions) {
        if (next[action.id] === undefined) {
          next[action.id] = Boolean(action.defaultSelected);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [actions]);

  const visible = actions.filter((action) => !applied[action.id]);

  const selectedActions = useMemo(
    () => visible.filter((action) => selections[action.id] && !deferred[action.id] && !rejected[action.id]),
    [visible, selections, deferred, rejected]
  );

  const groupCounts = useMemo(() => {
    const counts = {};
    for (const action of visible) {
      if (!action.selectionGroup) continue;
      counts[action.selectionGroup] = (counts[action.selectionGroup] || 0) + 1;
    }
    return counts;
  }, [visible]);

  const toggle = (action, next) => {
    setSelections((prev) => {
      const updated = { ...prev, [action.id]: next };
      // A mutually exclusive group behaves like one radio group.
      if (next && action.selectionGroup && (groupCounts[action.selectionGroup] || 0) > 1) {
        for (const sibling of visible) {
          if (sibling.id !== action.id && sibling.selectionGroup === action.selectionGroup) {
            updated[sibling.id] = false;
          }
        }
      }
      return updated;
    });
  };

  const confirm = async () => {
    // Reviewing an action is accepting it: a card that starts unselected (a
    // high-impact one, or one reached by its own review button) must still be
    // the action that runs, never a silent no-op.
    const accepted = { ...selections };
    for (const action of reviewing) accepted[action.id] = true;

    const outcome = await execute(reviewing, { selections: accepted, alternatives });
    if (outcome && outcome.completed > 0) {
      setApplied((prev) => {
        const updated = { ...prev };
        for (const row of outcome.rows || []) {
          if (row.status === 'completed' || row.status === 'skipped') {
            const action = reviewing.find((entry) => entry.id === row.actionId);
            if (action) updated[action.id] = true;
          }
        }
        return updated;
      });
    }
    setReviewing([]);
  };

  if (actions.length === 0) {
    return (
      <p className="text-[13px] py-3 break-words" style={{ color: 'rgba(224,216,200,0.55)' }}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-3 min-w-0">
      {(title || description) && (
        <div className="min-w-0">
          {title && (
            <p className="text-[13px] font-semibold break-words" style={{ color: '#F5F1E7' }}>{title}</p>
          )}
          {description && (
            <p className="text-[12px] leading-5 break-words" style={{ color: 'rgba(224,216,200,0.55)' }}>{description}</p>
          )}
        </div>
      )}

      {result && (
        <ActionResultSummary
          result={result}
          onUndo={undo}
          undoBusy={status === 'executing'}
          onDismiss={reset}
        />
      )}

      {error && (
        <p className="text-[12.5px] break-words" style={{ color: '#E0A0A0' }}>{error}</p>
      )}

      {visible.map((action) => {
        const mode = action.selectionGroup && (groupCounts[action.selectionGroup] || 0) > 1 ? 'radio' : 'checkbox';
        return (
          <ActionCard
            key={action.id}
            action={action}
            mode={mode}
            selected={Boolean(selections[action.id])}
            onSelect={(next) => toggle(action, next)}
            alternativeId={alternatives[action.id] || null}
            onAlternative={(id) => setAlternatives((prev) => ({ ...prev, [action.id]: id }))}
            onReview={(entry) => setReviewing([entry])}
            onDefer={(entry) => setDeferred((prev) => ({ ...prev, [entry.id]: true }))}
            onReject={(entry) => setRejected((prev) => ({ ...prev, [entry.id]: true }))}
            deferred={Boolean(deferred[action.id])}
            rejected={Boolean(rejected[action.id])}
            disabled={status === 'executing'}
          />
        );
      })}

      {selectedActions.length > 0 && (
        <div
          className="sticky bottom-2 rounded-xl p-2.5 flex flex-wrap items-center gap-2"
          style={{ background: 'rgba(36,25,19,0.96)', border: '1px solid rgba(180,140,75,0.3)' }}
        >
          <button
            type="button"
            onClick={() => setReviewing(selectedActions)}
            disabled={status === 'executing'}
            className="rounded-xl px-3 py-2 text-[12.5px] font-semibold min-h-[40px]"
            style={{ background: '#705d39', color: '#fff', border: 'none' }}
          >
            {applySelectedLabel(selectedActions.length)}
          </button>
          <span className="text-[11.5px]" style={{ color: 'rgba(224,216,200,0.55)' }}>
            You will see exactly what changes before anything is saved.
          </span>
        </div>
      )}

      <ActionReviewDialog
        open={reviewing.length > 0}
        actions={reviewing}
        alternatives={alternatives}
        busy={status === 'executing'}
        error={error}
        onConfirm={confirm}
        onCancel={() => setReviewing([])}
      />
    </div>
  );
}