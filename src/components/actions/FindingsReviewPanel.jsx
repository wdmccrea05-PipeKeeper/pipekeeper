import React, { useEffect, useMemo, useState } from 'react';
import FindingRow from './FindingRow';
import ActionReviewDialog from './ActionReviewDialog';
import ActionResultSummary from './ActionResultSummary';
import useActionExecution from '@/hooks/useActionExecution';
import { applySelectedLabel } from '@/lib/actions/actionLabels';
import { createAction, effectiveTargets } from '@/lib/actions/actionModel';
import { useTranslation } from '@/components/i18n/safeTranslation';

const MAX_ACTION_TARGETS = 200;

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
  const { t } = useTranslation();
  const [selections, setSelections] = useState({});
  const [alternatives, setAlternatives] = useState({});
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

  const selected = visible.filter((finding) => selections[finding.key] && finding.actions?.length > 0);
  const eligible = visible.filter((finding) => finding.actions?.length > 0);
  const needsChoice = selected.some((finding) =>
    finding.actions.some((action) => action.alternatives?.length &&
      !action.alternatives.some((entry) => entry.id === alternatives[action.id]))
  );

  const storageActions = selected.flatMap((finding) => finding.actions || []);
  const sharedLocations = storageActions.length > 1 && storageActions.every((action) => action.type === 'storage_assign')
    ? (storageActions[0].alternatives || []).filter((alternative) =>
        storageActions.every((action) => action.alternatives?.some(
          (entry) => JSON.stringify(entry.patch) === JSON.stringify(alternative.patch)
        ))
      )
    : [];

  const applyLocationToSelection = (value) => {
    const selectedLocation = sharedLocations.find((entry) => entry.id === value);
    setAlternatives((previous) => {
      const next = { ...previous };
      for (const action of storageActions) {
        const match = selectedLocation && action.alternatives.find(
          (entry) => JSON.stringify(entry.patch) === JSON.stringify(selectedLocation.patch)
        );
        if (match) next[action.id] = match.id;
        else delete next[action.id];
      }
      return next;
    });
  };

  const sharedChoice = sharedLocations.find((location) =>
    storageActions.every((action) => action.alternatives.some((entry) =>
      entry.id === alternatives[action.id] && JSON.stringify(entry.patch) === JSON.stringify(location.patch)
    ))
  );

  const review = () => {
    const actions = selected.flatMap((finding) => finding.actions || []);
    const firstAlternative = actions[0]?.alternatives?.find((entry) => entry.id === alternatives[actions[0].id]);
    const sameStorage = actions.length > 1 && firstAlternative && actions.every((action) => {
      const choice = action.alternatives?.find((entry) => entry.id === alternatives[action.id]);
      return action.type === 'storage_assign' && choice?.patch && !choice.targets &&
        !action.customField && !action.dependsOn?.length &&
        JSON.stringify(choice.patch) === JSON.stringify(firstAlternative.patch);
    });
    if (!sameStorage) {
      setReviewing(actions);
      return;
    }

    const batches = [];
    const modules = new Set(actions.map((action) => action.module));
    for (const module of modules) {
      const targets = actions.filter((action) => action.module === module)
        .flatMap((action) => effectiveTargets(action, alternatives[action.id]));
      for (let index = 0; index < targets.length; index += MAX_ACTION_TARGETS) {
        const batch = targets.slice(index, index + MAX_ACTION_TARGETS);
        batches.push(createAction({
          type: 'storage_assign',
          origin: 'collection_health',
          module,
          title: t('collectionIntelligence.storageBatchTitle', { count: batch.length }),
          proposedValues: [{ label: t('collectionIntelligence.storageLabel'), to: firstAlternative.label }],
          targets: batch,
        }));
      }
    }
    setReviewing(batches);
  };

  const confirm = async () => {
    const actions = reviewing;
    if (actions.length === 0 || needsChoice) {
      setReviewing([]);
      return;
    }

    await execute(actions, {
      selections: Object.fromEntries(actions.map((action) => [action.id, true])),
      alternatives,
    });

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

      {eligible.length > 1 && (
        <button type="button" disabled={busy} onClick={() => {
          const allSelected = eligible.every((finding) => selections[finding.key]);
          setSelections(allSelected ? {} : Object.fromEntries(eligible.map((finding) => [finding.key, true])));
        }} className="rounded-xl px-3 py-2 text-[12.5px] min-h-[40px]"
        style={{ color: '#E0D8C8', border: '1px solid rgba(180,140,75,0.3)' }}>
          {eligible.every((finding) => selections[finding.key])
            ? t('collectionIntelligence.clearFindings')
            : t('collectionIntelligence.selectFindings')}
        </button>
      )}

      {sharedLocations.length > 0 && (
        <label className="block text-[12.5px]" style={{ color: '#E0D8C8' }}>
          {t('collectionIntelligence.locationForSelected')}
          <select
            value={sharedChoice?.id || ''}
            onChange={(event) => applyLocationToSelection(event.target.value)}
            disabled={busy}
            className="mt-1 block w-full rounded-lg p-2 text-sm"
            style={{ background: '#241913', color: '#F5F1E7', border: '1px solid rgba(180,140,75,0.3)' }}
          >
            <option value="">{t('collectionIntelligence.chooseLocation')}</option>
            {sharedLocations.map((location) => <option key={location.id} value={location.id}>{location.label}</option>)}
          </select>
        </label>
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
            alternatives={alternatives}
            onAlternative={(id, choice) => setAlternatives((prev) => ({ ...prev, [id]: choice }))}
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
            onClick={review}
            disabled={busy || needsChoice}
            className="rounded-xl px-3 py-2 text-[12.5px] font-semibold min-h-[40px]"
            style={{ background: '#A35C5C', color: '#fff', border: 'none' }}
          >
            {applySelectedLabel(selected.length)}
          </button>
          <span className="text-[11.5px]" style={{ color: 'rgba(224,216,200,0.55)' }}>
            {needsChoice ? 'Choose a location for each selected record.' : 'You will see exactly what changes before anything is saved.'}
          </span>
        </div>
      )}

      <ActionReviewDialog
        open={reviewing.length > 0}
        actions={reviewing}
        alternatives={alternatives}
        busy={busy}
        error={error}
        onConfirm={confirm}
        onCancel={() => setReviewing([])}
      />
    </section>
  );
}