import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import ProvenanceFields from '@/components/collection/ProvenanceFields';
import AttachmentManager from '@/components/collection/AttachmentManager';
import ActivityTimeline from '@/components/collection/ActivityTimeline';
import {
  MODULE_CONFIG,
  buildDocumentationPatch,
  computeDocumentationCompleteness,
  recordDisplayName,
  resolveAcquisition,
  resolveLifecycleStatus,
} from '@/lib/collection/itemRecord';

const TABS = [
  { key: 'documentation', label: 'Provenance & acquisition' },
  { key: 'documents', label: 'Documents' },
  { key: 'history', label: 'History' },
];

/**
 * The shared collection item detail experience.
 *
 * Mounted by PipeKeeper, CigarKeeper, WhiskeyKeeper and WineKeeper so that
 * acquisition, provenance, documents and change history look and behave the
 * same everywhere. Module-specific fields and forms are untouched and stay in
 * the page around this section.
 */
export default function CollectionRecordDetails({ entityName, record, onRecordUpdated }) {
  const { user } = useCurrentUser();
  const config = MODULE_CONFIG[entityName];
  const [tab, setTab] = useState('documentation');
  const [draft, setDraft] = useState({});
  const [localRecord, setLocalRecord] = useState(record || null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    setLocalRecord(record || null);
    setDraft(record ? { ...record } : {});
    setStatus('');
  }, [record?.id]);

  // The panel keeps its own copy of the record so it stays correct on pages
  // that do not hand back a setter.
  const applyPatch = (patch) => {
    setLocalRecord((prev) => ({ ...(prev || {}), ...patch }));
    if (onRecordUpdated) onRecordUpdated(patch);
  };

  const completeness = useMemo(() => computeDocumentationCompleteness(localRecord), [localRecord]);
  const acquisition = useMemo(() => resolveAcquisition(localRecord), [localRecord]);

  if (!localRecord?.id || !config) return null;

  const handleSave = async () => {
    const patch = buildDocumentationPatch(localRecord, draft);
    if (Object.keys(patch).length === 0) {
      setStatus('No changes to save.');
      return;
    }

    setSaving(true);
    setStatus('');
    try {
      await base44.entities[entityName].update(localRecord.id, patch);
      try {
        await base44.entities.CollectionActivity.create({
          record_entity: entityName,
          record_id: localRecord.id,
          record_name: recordDisplayName(localRecord, entityName),
          module_key: config.moduleKey,
          event_type: patch.purchase_date || patch.purchase_price || patch.purchase_source
            ? 'acquisition_recorded'
            : 'updated',
          summary: `Updated ${Object.keys(patch).join(', ')}`,
          changed_fields: Object.keys(patch),
          actor_email: user?.email || null,
          occurred_at: new Date().toISOString(),
        });
      } catch {
        // History is supplementary; a failed log must not fail the save.
      }
      applyPatch(patch);
      setStatus('Saved.');
      setTab('history');
    } catch (saveError) {
      setStatus(saveError?.message || 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  const lifecycle = resolveLifecycleStatus(localRecord);

  return (
    <section
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(42,31,24,0.96)', border: '1px solid rgba(180,140,75,0.18)' }}
    >
      <div className="px-4 sm:px-5 pt-4 pb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-bold break-words" style={{ color: '#F5F1E7' }}>
            Documentation & provenance
          </h2>
          <p className="text-xs mt-0.5 break-words" style={{ color: 'rgba(224,216,200,0.6)' }}>
            {acquisition.date ? `Acquired ${acquisition.date}` : 'Acquisition date not recorded'}
            {acquisition.cost !== null ? ` · ${acquisition.cost}` : ''}
            {acquisition.source ? ` · ${acquisition.source}` : ''}
            {lifecycle !== 'active' ? ` · ${lifecycle}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${completeness.score}%`, background: '#D4A574' }}
            />
          </div>
          <span className="text-xs whitespace-nowrap" style={{ color: 'rgba(224,216,200,0.6)' }}>
            {completeness.score}% documented
          </span>
        </div>
      </div>

      <div className="px-4 sm:px-5 flex gap-1 overflow-x-auto" style={{ borderBottom: '1px solid rgba(180,140,75,0.15)' }}>
        {TABS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setTab(entry.key)}
            className="px-3 py-2 text-sm font-semibold whitespace-nowrap rounded-t-lg"
            style={{
              color: tab === entry.key ? '#D4A574' : 'rgba(224,216,200,0.6)',
              borderBottom: tab === entry.key ? '2px solid #D4A574' : '2px solid transparent',
              background: 'transparent',
            }}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-5">
        {tab === 'documentation' && (
          <div className="space-y-4">
            <ProvenanceFields draft={draft} onChange={setDraft} disabled={saving} />
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save documentation'}
              </Button>
              {status && (
                <span className="text-xs" style={{ color: status === 'Saved.' ? '#8FCFAF' : 'rgba(224,216,200,0.7)' }}>
                  {status}
                </span>
              )}
            </div>
            {completeness.missing.length > 0 && (
              <p className="text-xs break-words" style={{ color: 'rgba(224,216,200,0.45)' }}>
                Optional fields still empty: {completeness.missing.slice(0, 4).join(', ')}
                {completeness.missing.length > 4 ? ` and ${completeness.missing.length - 4} more` : ''}.
              </p>
            )}
          </div>
        )}

        {tab === 'documents' && (
          <AttachmentManager
            entityName={entityName}
            record={localRecord}
            disabled={saving}
            onDocumentsChange={(documents) => applyPatch({ documents })}
          />
        )}

        {tab === 'history' && <ActivityTimeline entityName={entityName} recordId={localRecord.id} />}
      </div>
    </section>
  );
}