import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { fetchAllEntities } from '@/lib/base44/fetchAllEntities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import BulkEditPanel from '@/components/collection/BulkEditPanel';
import DuplicateReviewPanel from '@/components/collection/DuplicateReviewPanel';
import { Download, Loader2, Search, Copy, PencilLine } from 'lucide-react';
import { createAction } from '@/lib/actions/actionModel';
import useActionExecution from '@/hooks/useActionExecution';
import ActionReviewDialog from '@/components/actions/ActionReviewDialog';
import ActionResultSummary from '@/components/actions/ActionResultSummary';
import {
  COLLECTION_ENTITY_NAMES,
  LIFECYCLE_OPTIONS,
  MODULE_CONFIG,
  isInactiveRecord,
  recordDisplayName,
  resolveAcquisition,
  resolveLifecycleStatus,
} from '@/lib/collection/itemRecord';

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'acquisition', label: 'Acquisition date' },
];

function toCsv(rows) {
  const header = ['name', 'maker', 'acquisition_date', 'acquisition_cost', 'acquisition_source', 'serial_number', 'batch_number', 'condition', 'tags', 'lifecycle', 'documents'];
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return [
    header.join(','),
    ...rows.map((row) => header.map((key) => escape(row[key])).join(',')),
  ].join('\n');
}

/**
 * Collection tools: bulk documentation editing, duplicate review and inventory
 * export across all four collection modules.
 */
export default function CollectionTools() {
  const { user, isLoading: userLoading } = useCurrentUser();
  // A drill-down from a finding opens the tab and module it pointed at.
  const [entityName, setEntityName] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get('module');
    return ['Pipe', 'TobaccoBlend', 'Cigar', 'Bottle', 'Wine'].includes(requested) ? requested : 'Pipe';
  });
  const [tab, setTab] = useState(() =>
    new URLSearchParams(window.location.search).get('tab') === 'duplicates' ? 'duplicates' : 'bulk'
  );
  const [search, setSearch] = useState('');
  const [lifecycleFilter, setLifecycleFilter] = useState('active');
  const [sort, setSort] = useState('newest');
  const [selected, setSelected] = useState([]);
  const [pendingAction, setPendingAction] = useState(null);
  const [message, setMessage] = useState('');

  const config = MODULE_CONFIG[entityName];
  const email = user?.email;
  const { data: records = [], isLoading: loading, error: loadError, refetch: load } = useQuery({
    queryKey: ['collection-tools', email, entityName],
    enabled: Boolean(email),
    queryFn: async () => {
      const rows = await fetchAllEntities(
        base44.entities[entityName], { created_by: email }, '-created_date', 500, 200, undefined, { strict: true }
      );
      return rows.filter((record) => record.created_by === email);
    },
  });

  useEffect(() => {
    setSelected([]);
    setSearch('');
    setPendingAction(null);
    setMessage('');
  }, [entityName, email]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    let rows = records.filter((record) => {
      const status = resolveLifecycleStatus(record);
      if (lifecycleFilter === 'active' && status !== 'active') return false;
      if (lifecycleFilter === 'inactive' && !isInactiveRecord(record)) return false;
      if (lifecycleFilter !== 'active' && lifecycleFilter !== 'inactive' && status !== lifecycleFilter) return false;
      if (!term) return true;
      const haystack = [
        record.name,
        ...config.makerFields.map((key) => record[key]),
        record.serial_number,
        ...(Array.isArray(record.tags) ? record.tags : []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });

    rows = [...rows].sort((a, b) => {
      if (sort === 'name') return String(a.name || '').localeCompare(String(b.name || ''));
      if (sort === 'acquisition') {
        return String(resolveAcquisition(a).date || '').localeCompare(String(resolveAcquisition(b).date || ''));
      }
      const aDate = a.created_date ? new Date(a.created_date).getTime() : 0;
      const bDate = b.created_date ? new Date(b.created_date).getTime() : 0;
      return sort === 'oldest' ? aDate - bDate : bDate - aDate;
    });

    return rows;
  }, [records, search, lifecycleFilter, sort, config]);

  const toggle = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]));
  };

  // The same executor and the same preview as every other surface: a bulk edit
  // is built as one action, reviewed, then accepted — never written on press.
  const { status, result, error, execute, undo, reset } = useActionExecution({ onApplied: load });
  const busy = status === 'executing';

  const reviewBulk = (patch) => {
    const fields = Object.keys(patch);
    setMessage('');
    setPendingAction(
      { ...createAction({
        type: fields.every((field) => field === 'storage_location_id' || field === 'humidor_id')
          ? 'storage_assign'
          : 'record_update',
        origin: 'collection_tools',
        module: entityName,
        title: `Update ${fields.length} field${fields.length === 1 ? '' : 's'} on ${selected.length} record${selected.length === 1 ? '' : 's'}`,
        targets: selected.map((id) => ({ entity: entityName, recordId: id, patch })),
        proposedValues: fields.map((field) => ({
          label: field.replace(/_/g, ' '),
          to: Array.isArray(patch[field]) ? patch[field].join(', ') : patch[field],
        })),
      }), scope: `${email}:${entityName}` }
    );
  };

  const confirmBulk = async () => {
    if (!pendingAction || pendingAction.scope !== `${email}:${entityName}`) return;
    const outcome = await execute([pendingAction], { selections: { [pendingAction.id]: true } });
    setPendingAction(null);
    if (outcome && outcome.completed > 0) setSelected([]);
  };

  const exportCsv = () => {
    const rows = visible.map((record) => {
      const acquisition = resolveAcquisition(record);
      return {
        name: record.name || '',
        maker: config.makerFields.map((key) => record[key]).find(Boolean) || '',
        acquisition_date: acquisition.date || '',
        acquisition_cost: acquisition.cost ?? '',
        acquisition_source: acquisition.source || '',
        serial_number: record.serial_number || '',
        batch_number: record.batch_number || '',
        condition: record.condition || record.condition_notes || '',
        tags: Array.isArray(record.tags) ? record.tags.join('; ') : '',
        lifecycle: resolveLifecycleStatus(record),
        documents: Array.isArray(record.documents) ? record.documents.length : 0,
      };
    });

    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${entityName.toLowerCase()}-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (userLoading) {
    return (
      <div className="flex items-center gap-2 py-10" style={{ color: 'rgba(224,216,200,0.6)' }}>
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold break-words" style={{ color: '#F5F1E7' }}>
          Collection tools
        </h1>
        <p className="text-sm mt-1 break-words" style={{ color: 'rgba(224,216,200,0.6)' }}>
          Bulk documentation editing, duplicate review and inventory export across every collection module.
        </p>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {COLLECTION_ENTITY_NAMES.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setEntityName(name)}
            className="px-3 py-2 rounded-lg text-sm font-semibold"
            style={{
              background: entityName === name ? 'rgba(212,165,116,0.18)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${entityName === name ? 'rgba(212,165,116,0.45)' : 'rgba(180,140,75,0.15)'}`,
              color: entityName === name ? '#D4A574' : 'rgba(224,216,200,0.75)',
            }}
          >
            {MODULE_CONFIG[name].label}
          </button>
        ))}
      </div>

      <div className="flex gap-1 overflow-x-auto" style={{ borderBottom: '1px solid rgba(180,140,75,0.15)' }}>
        {[
          { key: 'bulk', label: 'Bulk edit', icon: PencilLine },
          { key: 'duplicates', label: 'Duplicates', icon: Copy },
        ].map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setTab(entry.key)}
            className="px-3 py-2 text-sm font-semibold whitespace-nowrap inline-flex items-center gap-1.5"
            style={{
              color: tab === entry.key ? '#D4A574' : 'rgba(224,216,200,0.6)',
              borderBottom: tab === entry.key ? '2px solid #D4A574' : '2px solid transparent',
              background: 'transparent',
            }}
          >
            <entry.icon className="w-4 h-4" />
            {entry.label}
          </button>
        ))}
      </div>

      {tab === 'duplicates' ? (
        <DuplicateReviewPanel
          entityName={entityName}
          entityLabel={config.label}
          onMerged={load}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="relative sm:col-span-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(224,216,200,0.4)' }} />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, maker, serial or tag"
                className="pl-9 bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
              />
            </div>
            <select
              value={lifecycleFilter}
              onChange={(e) => setLifecycleFilter(e.target.value)}
              className="w-full rounded-lg px-3 text-sm bg-[rgba(255,255,255,0.05)] border border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
              style={{ minHeight: '2.65rem' }}
            >
              <option value="active" style={{ background: '#241913' }}>Active only</option>
              <option value="inactive" style={{ background: '#241913' }}>Inactive only</option>
              {LIFECYCLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} style={{ background: '#241913' }}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full rounded-lg px-3 text-sm bg-[rgba(255,255,255,0.05)] border border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
              style={{ minHeight: '2.65rem' }}
            >
              {SORTS.map((option) => (
                <option key={option.value} value={option.value} style={{ background: '#241913' }}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelected(selected.length === visible.length ? [] : visible.map((record) => record.id))}
                disabled={visible.length === 0}
              >
                {selected.length === visible.length && visible.length > 0 ? 'Clear selection' : 'Select all'}
              </Button>
              <span className="text-xs" style={{ color: 'rgba(224,216,200,0.55)' }}>
                {visible.length} shown · {selected.length} selected
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={visible.length === 0}>
              <Download className="w-4 h-4 mr-1" /> Export CSV
            </Button>
          </div>

          {result && <ActionResultSummary result={result} onUndo={undo} onDismiss={reset} />}

          {(message || error || loadError) && (
            <p className="text-xs" style={{ color: error || loadError ? '#E0A0A0' : 'rgba(224,216,200,0.75)' }} role={error || loadError ? 'alert' : undefined}>
              {error || loadError?.message || message}
            </p>
          )}

          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(180,140,75,0.18)' }}>
            {loading ? (
              <div className="flex items-center gap-2 p-4 text-sm" style={{ color: 'rgba(224,216,200,0.6)' }}>
                <Loader2 className="w-4 h-4 animate-spin" /> Loading {config.label} records…
              </div>
            ) : visible.length === 0 ? (
              <p className="p-4 text-sm" style={{ color: 'rgba(224,216,200,0.5)' }}>
                No records match these filters.
              </p>
            ) : (
              visible.map((record) => {
                const acquisition = resolveAcquisition(record);
                return (
                  <label
                    key={record.id}
                    className="flex items-start gap-3 px-3 py-2.5 cursor-pointer"
                    style={{ borderBottom: '1px solid rgba(180,140,75,0.1)', background: 'rgba(255,255,255,0.02)' }}
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(record.id)}
                      onChange={() => toggle(record.id)}
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold break-words" style={{ color: '#F5F1E7' }}>
                        {recordDisplayName(record, entityName)}
                      </p>
                      <p className="text-[11px] break-words" style={{ color: 'rgba(224,216,200,0.55)' }}>
                        {[
                          acquisition.date ? `Acquired ${acquisition.date}` : 'No acquisition date',
                          acquisition.cost !== null ? `Cost ${acquisition.cost}` : null,
                          Array.isArray(record.documents) && record.documents.length
                            ? `${record.documents.length} doc(s)`
                            : null,
                          resolveLifecycleStatus(record) !== 'active' ? resolveLifecycleStatus(record) : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                  </label>
                );
              })
            )}
          </div>

          <BulkEditPanel selectedCount={selected.length} onApply={reviewBulk} busy={busy} />

          <ActionReviewDialog
            open={Boolean(pendingAction && pendingAction.scope === `${email}:${entityName}`)}
            actions={pendingAction ? [pendingAction] : []}
            busy={busy}
            error={error}
            onConfirm={confirmBulk}
            onCancel={() => setPendingAction(null)}
          />
        </>
      )}
    </div>
  );
}