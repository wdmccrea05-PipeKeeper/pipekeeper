import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { History } from 'lucide-react';

const EVENT_LABELS = {
  created: 'Record created',
  updated: 'Record updated',
  acquisition_recorded: 'Acquisition documented',
  ownership_transfer: 'Ownership recorded',
  condition_change: 'Condition recorded',
  maintenance: 'Maintenance recorded',
  storage_change: 'Storage changed',
  attachment_added: 'Document attached',
  attachment_removed: 'Document removed',
  bulk_updated: 'Bulk documentation update',
  merged: 'Duplicate merged',
  archived: 'Archived',
  restored: 'Restored',
  transferred: 'Transferred',
  gifted: 'Gifted',
};

/**
 * Record-level activity and change history for one collection record.
 * Read-only: entries are written when a change is saved, never edited here.
 */
export default function ActivityTimeline({ entityName, recordId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!recordId) return undefined;

    setLoading(true);
    base44.entities.CollectionActivity.filter(
      { record_entity: entityName, record_id: recordId },
      { sort: '-occurred_at', limit: 50 }
    )
      .then((page) => {
        if (!cancelled) setEvents(page?.items || []);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [entityName, recordId]);

  if (loading) {
    return <p className="text-sm py-3" style={{ color: 'rgba(224,216,200,0.5)' }}>Loading history…</p>;
  }

  if (events.length === 0) {
    return (
      <p className="text-sm py-3" style={{ color: 'rgba(224,216,200,0.45)' }}>
        No recorded changes yet. Changes you make to this record will appear here.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {events.map((event) => (
        <li key={event.id} className="flex gap-3">
          <div
            className="mt-1 w-6 h-6 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(212,165,116,0.15)', border: '1px solid rgba(212,165,116,0.3)' }}
          >
            <History className="w-3 h-3" style={{ color: '#D4A574' }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm" style={{ color: '#F5F1E7' }}>
              {EVENT_LABELS[event.event_type] || event.event_type}
            </p>
            {event.summary && (
              <p className="text-xs break-words" style={{ color: 'rgba(224,216,200,0.65)' }}>{event.summary}</p>
            )}
            <p className="text-[11px]" style={{ color: 'rgba(224,216,200,0.4)' }}>
              {event.occurred_at ? new Date(event.occurred_at).toLocaleString() : ''}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}