import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, GitMerge, AlertTriangle } from 'lucide-react';
import ActionReviewDialog from '@/components/actions/ActionReviewDialog';
import ActionResultSummary from '@/components/actions/ActionResultSummary';
import useActionExecution from '@/hooks/useActionExecution';
import { createAction } from '@/lib/actions/actionModel';

const MODULE_FOR_ENTITY = {
  Pipe: 'pipekeeper',
  TobaccoBlend: 'tobacco',
  Cigar: 'cigarkeeper',
  Bottle: 'whiskeykeeper',
  Wine: 'winekeeper',
};

/**
 * Duplicate review and controlled merge, through the Universal Action Framework.
 *
 * Duplicates are only ever suggested. A merge is a high-impact action: it is
 * built as a framework action, previewed in the shared review dialog, executed by
 * the single server executor (which re-checks ownership) and reported per record.
 * The duplicates are archived with a pointer to the survivor rather than deleted.
 */
export default function DuplicateReviewPanel({ entityName, entityLabel, onMerged }) {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [scanned, setScanned] = useState(0);
  const [error, setError] = useState('');
  const [survivors, setSurvivors] = useState({});
  const [reviewing, setReviewing] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await base44.functions.invoke('collectionItemDuplicates', { entityName });
      const data = response?.data || {};
      setGroups(data.groups || []);
      setScanned(data.scanned || 0);
    } catch (scanError) {
      setError(scanError?.message || 'Could not scan for duplicates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityName]);

  const { status, result, error: executionError, execute, reset } = useActionExecution();
  const busy = status === 'executing';

  const buildMergeAction = (group) => {
    const survivorId = survivors[group.signature] || group.records[0]?.id;
    const survivor = group.records.find((record) => record.id === survivorId);
    const duplicates = group.records.filter((record) => record.id !== survivorId);

    return createAction({
      type: 'record_merge',
      origin: 'duplicates',
      module: MODULE_FOR_ENTITY[entityName] || null,
      title: `Merge ${duplicates.length} duplicate ${duplicates.length === 1 ? 'record' : 'records'} into "${survivor?.name || 'the selected record'}"`,
      description: 'The record you keep keeps its identity and takes any documentation the duplicates have. Duplicates are archived, not deleted.',
      targets: [
        { entity: entityName, recordId: survivorId, name: survivor?.name || '', role: 'survivor' },
        ...duplicates.map((record) => ({
          entity: entityName,
          recordId: record.id,
          name: record.name,
          role: 'source',
        })),
      ],
      recordLinks: [{ label: 'Open collection tools', to: '/CollectionTools' }],
    });
  };

  const confirmMerge = async () => {
    if (!reviewing) return;
    setError('');
    // The merge is the action being reviewed, so it is the action that runs —
    // high-impact actions start unselected, and an unselected action is dropped
    // before the request is built.
    const outcome = await execute([reviewing], { selections: { [reviewing.id]: true } });
    setReviewing(null);
    if (outcome && outcome.completed > 0) {
      await load();
      if (onMerged) onMerged();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm" style={{ color: 'rgba(224,216,200,0.6)' }}>
        <Loader2 className="w-4 h-4 animate-spin" /> Scanning {entityLabel} records…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs" style={{ color: 'rgba(224,216,200,0.6)' }}>
          {scanned} record{scanned === 1 ? '' : 's'} scanned · {groups.length} possible duplicate
          {groups.length === 1 ? '' : 's'}
        </p>
        <Button variant="outline" size="sm" onClick={load}>Scan again</Button>
      </div>

      {error && <p className="text-xs" style={{ color: '#E39A9A' }}>{error}</p>}
      {result && <ActionResultSummary result={result} onDismiss={reset} />}

      {groups.length === 0 ? (
        <p className="text-sm py-4" style={{ color: 'rgba(224,216,200,0.5)' }}>
          No possible duplicates found. Records are matched on name, maker and serial number.
        </p>
      ) : (
        groups.map((group) => (
          <div
            key={group.signature}
            className="rounded-xl p-3 space-y-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(180,140,75,0.18)' }}
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#D4A574' }} />
              <div className="min-w-0">
                <p className="text-sm font-semibold break-words" style={{ color: '#F5F1E7' }}>{group.label}</p>
                <p className="text-xs" style={{ color: 'rgba(224,216,200,0.55)' }}>
                  {group.count} records share this identity
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              {group.records.map((record) => (
                <label
                  key={record.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer"
                  style={{ background: 'rgba(0,0,0,0.15)' }}
                >
                  <input
                    type="radio"
                    name={`survivor-${group.signature}`}
                    checked={(survivors[group.signature] || group.records[0]?.id) === record.id}
                    onChange={() => setSurvivors((prev) => ({ ...prev, [group.signature]: record.id }))}
                  />
                  <span className="text-xs min-w-0 break-words" style={{ color: '#F5F1E7' }}>
                    {record.name}
                    {record.maker ? ` · ${record.maker}` : ''}
                    {record.purchase_date ? ` · ${record.purchase_date}` : ''}
                    {` · ${record.attachment_count} doc(s) · ${record.completeness} fields`}
                  </span>
                </label>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => setReviewing(buildMergeAction(group))}>
                <GitMerge className="w-3.5 h-3.5 mr-1" />
                Keep selected, merge the rest
              </Button>
              <span className="text-[11px]" style={{ color: 'rgba(224,216,200,0.45)' }}>
                You will see the merge before it happens. Duplicates are archived, not deleted.
              </span>
            </div>
          </div>
        ))
      )}

      <ActionReviewDialog
        open={Boolean(reviewing)}
        actions={reviewing ? [reviewing] : []}
        busy={busy}
        error={error || executionError}
        onConfirm={confirmMerge}
        onCancel={() => setReviewing(null)}
      />
    </div>
  );
}