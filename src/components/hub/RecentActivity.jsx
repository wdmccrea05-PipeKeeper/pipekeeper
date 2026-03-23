import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
}

export default function RecentActivity({ onSelect }) {
  const { user } = useCurrentUser();

  const { data: smokeLogs = [] } = useQuery({
    queryKey: ['hub-recent-activity', user?.email],
    enabled: !!user?.email,
    staleTime: 2 * 60 * 1000,
    queryFn: () => base44.entities.SmokingLog.filter({ created_by: user.email }, '-date', 5).catch(() => []),
  });

  if (!smokeLogs.length) return null;

  return (
    <div className="space-y-3">
      {smokeLogs.map((log) => (
        <button
          key={log.id}
          type="button"
          onClick={() => onSelect?.(log)}
          className="w-full rounded-[22px] p-4 flex items-center gap-4 text-left"
          style={{
            background: 'linear-gradient(145deg, rgba(40,28,18,0.92), rgba(24,17,11,0.98))',
            border: '1px solid rgba(180,140,75,0.18)',
          }}
        >
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(180,140,75,0.14)', border: '1px solid rgba(180,140,75,0.24)' }}
          >
            <Activity className="w-5 h-5" style={{ color: '#D4A574' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold truncate" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
              {log.blend_name || 'Recent session'}
            </p>
            <p className="text-sm mt-1 truncate" style={{ color: 'rgba(224,216,200,0.7)' }}>
              {log.pipe_name ? `In ${log.pipe_name}` : 'Pipe session'}{log.date ? ` • ${formatDate(log.date)}` : ''}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 shrink-0" style={{ color: '#D4A574' }} />
        </button>
      ))}
    </div>
  );
}