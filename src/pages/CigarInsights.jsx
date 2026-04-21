import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { base44 } from '@/api/base44Client';
import CigarKeeperModuleNav from '@/components/modules/CigarKeeperModuleNav';
import CigarInsights from '@/components/cigars/CigarInsights';
import { Calendar } from '@/components/ui/calendar';
import { buildSessionCalendarData } from '@/lib/sessionHistory/calendarData';
import { toLocalDateYmd } from '@/components/utils/schemaCompatibility';

function CigarInsightsInner() {
  const { t } = useTranslation();
  const { user } = useCurrentUser();

  const { data: cigars = [], isLoading: cigarsLoading } = useQuery({
    queryKey: ['cigars-insights', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const result = await base44.entities.Cigar.filter(
        { created_by: user?.email },
        '-created_date'
      ).catch(() => []);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['cigar-sessions-insights', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const result = await base44.entities.CigarSession.filter(
        { created_by: user?.email },
        '-date'
      ).catch(() => []);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const { data: humidors = [] } = useQuery({
    queryKey: ['humidors-insights', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const result = await base44.entities.HumidorLocation.filter(
        { created_by: user?.email }
      ).catch(() => []);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const { data: valueSnapshots = [] } = useQuery({
    queryKey: ['cigar-value-snapshots-insights', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const result = await base44.entities.ItemValueSnapshot.filter(
        { created_by: user?.email, module_key: 'cigarkeeper', item_type: 'cigar' },
        '-snapshot_date',
        1000
      ).catch(() => []);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const isLoading = cigarsLoading || sessionsLoading;

  const [activeTab, setActiveTab] = useState('insights');
  const [calSelectedDate, setCalSelectedDate] = useState(toLocalDateYmd(new Date()));

  const cigarSessionRows = useMemo(() => (sessions || []).map(s => ({
    id: `cigar_${s.id}`,
    moduleType: 'cigar',
    date: s.date,
    itemLabel: s.cigar_name || [s.external_cigar_brand, s.external_cigar_name].filter(Boolean).join(' ') || 'Cigar session',
    rating: s.overall_enjoyment ?? null,
    notes: s.notes || '',
  })), [sessions]);

  const { byDate: cigarByDate, highlightedDates: cigarHighlights } = useMemo(
    () => buildSessionCalendarData(cigarSessionRows, 'cigar'),
    [cigarSessionRows]
  );
  const cigarSelectedDayRows = useMemo(() => cigarByDate[calSelectedDate] || [], [cigarByDate, calSelectedDate]);

  return (
    <div className="space-y-6 text-[#F5F1E7]">
      <CigarKeeperModuleNav currentPageName="CigarInsights" />

      <div>
        <h1 className="text-4xl font-bold" style={{ fontFamily: "'Georgia', serif" }}>
          {t('nav.insights', 'Cigar Insights')}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(224,216,200,0.6)' }}>
          {t('cigars.insightsDescription', 'Analytics and trends from your cigar collection and sessions')}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2" style={{ borderBottom: '1px solid rgba(180,140,75,0.2)' }}>
        {[{ key: 'insights', label: 'Insights' }, { key: 'sessions', label: 'Sessions' }].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="px-4 py-2 text-sm font-medium transition-all"
            style={{
              color: activeTab === key ? '#F5F1E7' : 'rgba(224,216,200,0.6)',
              borderBottom: activeTab === key ? '2px solid #D4A574' : '2px solid transparent',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'insights' && (
        isLoading ? (
          <p style={{ color: 'rgba(224,216,200,0.6)' }}>Loading…</p>
        ) : (
          <CigarInsights user={user} cigars={cigars} sessions={sessions} humidors={humidors} snapshots={valueSnapshots} />
        )
      )}

      {activeTab === 'sessions' && (
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <div className="rounded-2xl border border-[rgba(180,140,75,0.2)] bg-[rgba(25,17,11,0.7)] p-3">
            <Calendar
              mode="single"
              selected={new Date(`${calSelectedDate}T12:00:00`)}
              onSelect={(date) => { if (date) setCalSelectedDate(toLocalDateYmd(date)); }}
              modifiers={{ hasSessions: cigarHighlights }}
              modifiersClassNames={{ hasSessions: 'ring-1 ring-[#B48C4B] ring-offset-0' }}
            />
          </div>
          <div className="rounded-2xl border border-[rgba(180,140,75,0.2)] bg-[rgba(25,17,11,0.7)] p-5">
            <h2 className="text-lg font-semibold mb-3 text-[#F5F1E7]">{calSelectedDate}</h2>
            {cigarSelectedDayRows.length === 0 ? (
              <p style={{ color: 'rgba(224,216,200,0.6)' }}>No sessions logged for this day.</p>
            ) : (
              <div className="space-y-3">
                {cigarSelectedDayRows.map((row) => (
                  <div key={row.id} className="rounded-xl p-3 border border-[rgba(180,140,75,0.2)] bg-[rgba(255,255,255,0.03)]">
                    <p className="text-sm font-semibold text-[#F5F1E7]">{row.itemLabel}</p>
                    {row.rating != null && <p className="text-xs text-[#D8C7A6]/70 mt-1">Rating: {row.rating}</p>}
                    {row.notes ? <p className="text-sm text-[#E0D8C8] mt-2 whitespace-pre-wrap">{row.notes}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// LockedModuleGuard is already applied by App.jsx's CigarReleaseRoute wrapper
export default function CigarInsightsPage() {
  return <CigarInsightsInner />;
}