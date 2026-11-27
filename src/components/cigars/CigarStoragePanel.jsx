import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { MapPin, Clock, MoveRight } from 'lucide-react';
import {
  monthsAged,
  agingStartDate,
  describePosition,
  buildHumidorMovements,
} from '@/lib/cigars/humidorInventory';
import { buildDrilldownQuery } from '@/lib/cigars/cigarDashboard';

function asList(result) {
  if (Array.isArray(result)) return result;
  return Array.isArray(result?.items) ? result.items : [];
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function agingLabel(months) {
  if (months === null) return 'No aging date recorded';
  if (months < 1) return 'Less than a month documented';
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} documented`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return `${years} year${years === 1 ? '' : 's'}${rest ? ` ${rest} month${rest === 1 ? '' : 's'}` : ''} documented`;
}

/**
 * Storage assignment, documented aging and movement history for one cigar.
 * Read-only: assignment changes happen in the collection record editor.
 */
export default function CigarStoragePanel({ cigar, humidors = [] }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!cigar?.id) return;
    setLoading(true);
    const result = await base44.entities.CollectionActivity.filter(
      { record_entity: 'Cigar', record_id: cigar.id, event_type: 'storage_change' },
      { sort: '-occurred_at', limit: 50 }
    ).catch(() => []);
    setActivities(asList(result));
    setLoading(false);
  }, [cigar?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const humidor = useMemo(
    () => humidors.find((h) => h.id === cigar?.humidor_id) || null,
    [humidors, cigar?.humidor_id]
  );
  const movements = useMemo(
    () => buildHumidorMovements(activities, { cigarIds: [cigar?.id].filter(Boolean) }),
    [activities, cigar?.id]
  );
  const months = monthsAged(agingStartDate(cigar || {}));

  return (
    <div className="space-y-3">
      <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.18)' }}>
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#D4A574' }} />
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: '#F5F1E7' }}>
              {humidor ? humidor.name : 'Not assigned to a humidor'}
            </p>
            <p className="text-xs" style={{ color: 'rgba(224,216,200,0.62)' }}>
              {[describePosition(cigar || {}), cigar?.storage_notes].filter(Boolean).join(' · ') ||
                'No tray, shelf or drawer documented'}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.18)' }}>
        <div className="flex items-start gap-2">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#D4A574' }} />
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: '#F5F1E7' }}>Aging documented</p>
            <p className="text-xs" style={{ color: 'rgba(224,216,200,0.62)' }}>
              {agingLabel(months)}
              {agingStartDate(cigar || {}) ? ` · since ${formatDate(agingStartDate(cigar || {}))}` : ''}
            </p>
            {cigar?.condition || cigar?.condition_notes ? (
              <p className="mt-1 text-xs" style={{ color: 'rgba(224,216,200,0.72)' }}>
                Condition: {[cigar?.condition, cigar?.condition_notes].filter(Boolean).join(' · ')}
              </p>
            ) : (
              <p className="mt-1 text-xs" style={{ color: 'rgba(224,216,200,0.45)' }}>No condition observation recorded.</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.18)' }}>
        <div className="mb-2 flex items-center gap-2">
          <MoveRight className="h-4 w-4" style={{ color: '#D4A574' }} />
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(224,216,200,0.72)' }}>
            Storage history
          </p>
        </div>
        {loading ? (
          <p className="text-xs" style={{ color: 'rgba(224,216,200,0.55)' }}>Loading…</p>
        ) : movements.length === 0 ? (
          <p className="text-xs" style={{ color: 'rgba(224,216,200,0.55)' }}>
            No storage movements recorded. Movements are added when this record&apos;s humidor assignment changes.
          </p>
        ) : (
          <div className="space-y-2">
            {movements.slice(0, 12).map((move) => (
              <div key={move.id}>
                <p className="text-xs" style={{ color: '#F5F1E7' }}>{move.summary}</p>
                <p className="text-[11px]" style={{ color: 'rgba(224,216,200,0.55)' }}>
                  {formatDate(move.occurredAt)}
                  {move.detail ? ` · ${move.detail}` : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <a
        href={`/Cigars?${buildDrilldownQuery(humidor ? { humidor: humidor.id } : { preset: 'unassigned' })}`}
        className="inline-block text-xs underline"
        style={{ color: '#D4A574' }}
      >
        {humidor ? `Open everything stored in ${humidor.name}` : 'Open unassigned records'}
      </a>
    </div>
  );
}