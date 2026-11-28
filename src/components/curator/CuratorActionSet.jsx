import React, { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import ActionCard from '@/components/actions/ActionCard';
import ActionReviewDialog from '@/components/actions/ActionReviewDialog';
import ActionResultSummary from '@/components/actions/ActionResultSummary';
import { withCustomValue } from '@/lib/curator/curatorActionPresenter';

/**
 * The actions Curator found, inside the conversation.
 *
 * Same primitives as every other surface (card → preview → execute → result →
 * undo), so an accepted suggestion behaves identically whether it was raised in
 * chat, on a dashboard or in a report. Selection and option state live on the
 * message, which is what lets a spoken reply ("apply the second option") act on
 * exactly the same actions the card is showing.
 */
export default function CuratorActionSet({ message, onUpdate, onApply, onUndo }) {
  const [reviewing, setReviewing] = useState([]);
  const [customOpen, setCustomOpen] = useState({});
  const [customDraft, setCustomDraft] = useState({});

  const actions = message?.actions || [];
  const selections = message?.actionSelections || {};
  const alternatives = message?.actionAlternatives || {};
  const deferred = message?.actionDeferred || {};
  const rejected = message?.actionRejected || {};
  const result = message?.actionResult || null;
  const state = message?.actionState || 'idle';
  const busy = state === 'applying';

  const selected = useMemo(
    () => actions.filter((action) => selections[action.id] && !deferred[action.id] && !rejected[action.id]),
    [actions, selections, deferred, rejected]
  );

  if (actions.length === 0) return null;

  const update = (patch) => onUpdate && onUpdate(patch);
  const setSelection = (action, next) => update({ actionSelections: { ...selections, [action.id]: next } });
  const setAlternative = (action, id) => update({ actionAlternatives: { ...alternatives, [action.id]: id } });
  const defer = (action) => update({ actionDeferred: { ...deferred, [action.id]: true } });
  const reject = (action) => update({ actionRejected: { ...rejected, [action.id]: true } });

  const saveCustom = (action) => {
    const value = customDraft[action.id];
    if (!value || !String(value).trim()) return;
    update({
      actions: actions.map((entry) => (entry.id === action.id ? withCustomValue(entry, value) : entry)),
      actionSelections: { ...selections, [action.id]: true },
    });
    setCustomOpen((prev) => ({ ...prev, [action.id]: false }));
  };

  const confirmReview = () => {
    const nextSelections = { ...selections };
    for (const action of reviewing) nextSelections[action.id] = true;
    setReviewing([]);
    if (onApply) onApply({ selections: nextSelections });
  };

  // Once everything applied cleanly the cards would only repeat the result.
  // A partial or failed run keeps them, so the collector can retry the rest.
  const showCards = !(state === 'applied' && result && (result.failed || 0) === 0);

  return (
    <div className="mt-3 space-y-2.5 min-w-0">
      {result && (
        <ActionResultSummary
          result={result}
          onUndo={onUndo ? (executionId) => onUndo(executionId) : undefined}
          undoBusy={busy}
        />
      )}

      {message?.actionError && (
        <p className="text-[12.5px] leading-5 break-words" style={{ color: '#E0A0A0' }}>
          {message.actionError}
        </p>
      )}

      {showCards && actions.map((action) => (
        <div key={action.id} className="min-w-0">
          <ActionCard
            action={action}
            mode="checkbox"
            selected={Boolean(selections[action.id])}
            onSelect={(next) => setSelection(action, next)}
            alternativeId={alternatives[action.id] || null}
            onAlternative={(id) => setAlternative(action, id)}
            onReview={(entry) => setReviewing([entry])}
            onDefer={defer}
            onReject={reject}
            deferred={Boolean(deferred[action.id])}
            rejected={Boolean(rejected[action.id])}
            disabled={busy}
          />

          {action.customField && !deferred[action.id] && !rejected[action.id] && (
            customOpen[action.id] ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <input
                  value={customDraft[action.id] ?? ''}
                  onChange={(event) => setCustomDraft((prev) => ({ ...prev, [action.id]: event.target.value }))}
                  placeholder={`Different ${action.customLabel || 'value'}`}
                  aria-label={`Different ${action.customLabel || 'value'}`}
                  className="flex-1 min-w-[150px] px-3 rounded-xl text-[13px]"
                  style={{ border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#F5F1E7', minHeight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => saveCustom(action)}
                  className="rounded-xl px-3 text-[12.5px] font-semibold"
                  style={{ background: 'rgba(198,161,91,0.16)', color: '#E8D3A8', border: '1px solid rgba(198,161,91,0.3)', minHeight: 40 }}
                >
                  Use this value
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCustomOpen((prev) => ({ ...prev, [action.id]: true }))}
                className="mt-1.5 text-[12px] font-semibold"
                style={{ color: '#C6A15B', background: 'transparent', border: 'none', padding: 0, minHeight: 36 }}
              >
                Use a different {action.customLabel || 'value'}
              </button>
            )
          )}
        </div>
      ))}

      {showCards && selected.length > 0 && (
        <div
          className="sticky bottom-2 rounded-xl p-2.5 flex flex-wrap items-center gap-2"
          style={{ background: 'rgba(36,25,19,0.96)', border: '1px solid rgba(180,140,75,0.3)' }}
        >
          <button
            type="button"
            onClick={() => setReviewing(selected)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 text-[12.5px] font-semibold"
            style={{ background: '#705d39', color: '#fff', border: 'none', minHeight: 40 }}
          >
            <Check className="w-3.5 h-3.5" /> Accept {selected.length} selected
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
        busy={busy}
        error={message?.actionError || ''}
        onConfirm={confirmReview}
        onCancel={() => setReviewing([])}
      />
    </div>
  );
}