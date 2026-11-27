import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { History, Loader2 } from 'lucide-react';
import { formatDate } from '@/components/utils/localeFormatters';

/**
 * Dated history of a pipe's specialization.
 *
 * Reads the append-only CollectionActivity rows written whenever the
 * specialization changes, so the record shows how it was classified over time
 * rather than only its current badge.
 */
export default function SpecializationHistory({ pipeId, refreshKey = 0 }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!pipeId) return undefined;
    setLoading(true);
    base44.entities.CollectionActivity
      .filter(
        { record_entity: 'Pipe', record_id: pipeId, event_type: 'specialization_changed' },
        { sort: '-occurred_at', limit: 50 },
      )
      .then((page) => {
        if (!cancelled) setEntries(page?.items || []);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [pipeId, refreshKey]);

  return (
    <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.18)' }}>
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4" style={{ color: 'rgba(180,140,75,0.9)' }} />
        <span className="text-sm font-semibold" style={{ color: '#E0D8C8' }}>Specialization history</span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(224,216,200,0.6)' }}>
          <Loader2 className="w-4 h-4 animate-spin" /> Loading history…
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm" style={{ color: 'rgba(224,216,200,0.55)' }}>
          No specialization changes recorded yet. Every future change is dated and kept here.
        </p>
      ) : (
        <ol className="space-y-3">
          {entries.map((entry) => (
            <li key={entry.id} className="pl-3" style={{ borderLeft: '2px solid rgba(180,140,75,0.28)' }}>
              <p className="text-sm break-words" style={{ color: '#E0D8C8' }}>{entry.summary}</p>
              {entry.detail && (
                <p className="text-xs mt-1 break-words" style={{ color: 'rgba(224,216,200,0.55)' }}>{entry.detail}</p>
              )}
              <p className="text-[11px] mt-1" style={{ color: 'rgba(224,216,200,0.4)' }}>
                {formatDate(entry.occurred_at, 'medium')}
                {entry.actor_email ? ` · ${entry.actor_email}` : ''}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}