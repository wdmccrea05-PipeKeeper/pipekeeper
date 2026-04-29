import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { Cigarette, Plus, BarChart3, BookOpen, Grid3X3, AlertTriangle, TrendingDown, Clock, Droplets } from 'lucide-react';
import ModulePageShell from '@/components/modules/ModulePageShell';

const CURATOR_ICON = "https://media.base44.com/images/public/694956e18d119cc497192525/dda113b4e_inappcurator.png";
import { base44 } from '@/api/base44Client';
import CigarKeeperModuleNav from '@/components/modules/CigarKeeperModuleNav';
import ModuleQuickLaunch from '@/components/modules/ModuleQuickLaunch';
import CigarHighlightCard from '@/components/cigars/CigarHighlightCard';
import CigarSessionModal from '@/components/cigars/CigarSessionModal';
import { getCigarHighlights } from '@/components/cigars/getCigarHighlights';
import ModuleHighlightsSection from '@/components/modules/ModuleHighlightsSection';
import { useCurrency } from '@/lib/currency/useCurrency';
import { getCollectionInsights } from '@/platform/cigarInsights';
import {
  daysBetween,
  getNextCheckDate,
  getNextReplacementDate,
  getHumidorMaintenanceStatus,
  humidorNeedsAttention,
} from '@/components/cigars/humidorMaintenanceUtils';

function formatDate(value, locale) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale || undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function RecentSessionCard({ session, t, locale }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(140,107,63,0.28)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: '#F5F1E7' }}>
            {session.external_cigar_name || session.cigar_name || t('cigars.unnamedCigar')}
          </p>
          <p className="text-xs mt-1" style={{ color: 'rgba(224,216,200,0.6)' }}>
            {formatDate(session.date, locale)}
            {session.occasion ? ` · ${session.occasion}` : ''}
          </p>
          {session.notes && (
            <p
              className="text-xs mt-2 line-clamp-2"
              style={{ color: 'rgba(224,216,200,0.72)' }}
            >
              {session.notes}
            </p>
          )}
        </div>
        {session.overall_enjoyment > 0 && (
          <div className="shrink-0 text-right">
            <span className="text-base font-bold" style={{ color: '#D4A574' }}>
              {session.overall_enjoyment}
            </span>
            <span className="text-xs" style={{ color: 'rgba(224,216,200,0.5)' }}>/5</span>
          </div>
        )}
      </div>
    </div>
  );
}

function HumidorAlertCard({ humidor, onManage, t }) {
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const status = getHumidorMaintenanceStatus(humidor);
  const nextCheck = getNextCheckDate(humidor);
  const nextReplacement = getNextReplacementDate(humidor);
  const checkDays = daysBetween(nextCheck, now);
  const replaceDays = daysBetween(nextReplacement, now);

  const isOverdue = status === 'overdue';
  const borderColor = isOverdue ? 'rgba(224,85,85,0.35)' : 'rgba(212,165,116,0.35)';
  const bgColor = isOverdue ? 'rgba(224,85,85,0.07)' : 'rgba(212,165,116,0.07)';
  const Icon = isOverdue ? AlertTriangle : Clock;
  const iconColor = isOverdue ? '#E05555' : '#D4A574';

  return (
    <div
      className="rounded-xl p-3 flex items-start gap-3"
      style={{ background: bgColor, border: `1px solid ${borderColor}` }}
    >
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: iconColor }} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#F5F1E7]">{humidor.name}</p>
        <div className="flex flex-wrap gap-3 mt-1 text-xs" style={{ color: 'rgba(224,216,200,0.6)' }}>
          {checkDays !== null && checkDays <= 3 && (
            <span className="flex items-center gap-1">
              <Droplets className="w-3 h-3" />
              {checkDays < 0
                ? t('cigars.checkOverdue', { days: Math.abs(checkDays) })
                : checkDays === 0
                  ? t('cigars.checkDueToday')
                  : t('cigars.checkInDays', { days: checkDays })}
            </span>
          )}
          {replaceDays !== null && replaceDays <= 3 && (
            <span>
              {replaceDays < 0
                ? t('cigars.aidReplaceOverdue', { days: Math.abs(replaceDays) })
                : replaceDays === 0
                  ? t('cigars.replaceAidToday')
                  : t('cigars.replaceAidInDays', { days: replaceDays })}
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onManage}
        className="text-xs px-2 py-1 rounded-lg flex-shrink-0 transition-opacity hover:opacity-80"
        style={{ background: 'rgba(180,140,75,0.15)', border: '1px solid rgba(180,140,75,0.25)', color: '#D4A574' }}
      >
        {t('cigars.manage')}
      </button>
    </div>
  );
}

function CigarKeeperInner() {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { formatFromBase } = useCurrency();
  const [sessionModalOpen, setSessionModalOpen] = useState(false);

  const { data: cigars = [] } = useQuery({
    queryKey: ['cigars-summary', user?.email],
    queryFn: async () => {
      const result = await base44.entities.Cigar.filter(
        { created_by: user?.email },
        '-created_date'
      ).catch(() => []);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['cigar-sessions-summary', user?.email],
    queryFn: async () => {
      const result = await base44.entities.CigarSession.filter(
        { created_by: user?.email },
        '-date',
        100
      ).catch(() => []);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const { data: humidors = [] } = useQuery({
    queryKey: ['humidors-summary', user?.email],
    queryFn: async () => {
      const result = await base44.entities.HumidorLocation.filter(
        { created_by: user?.email }
      ).catch(() => []);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const recentSessions = sessions.slice(0, 5);

  const insights = useMemo(
    () => getCollectionInsights(cigars, humidors, sessions),
    [cigars, humidors, sessions]
  );

  const highlights = useMemo(
    () => getCigarHighlights(cigars, formatFromBase).map((h) => ({
      ...h,
      onClick: h.cigarId
        ? () => navigate(`/Cigars?highlight=${encodeURIComponent(h.cigarId)}`)
        : undefined,
    })),
    [cigars, formatFromBase, navigate]
  );

  const actionItems = [
    insights.runningLow.length > 0 && {
      key: 'runningLow',
      icon: TrendingDown,
      color: '#D4A574',
      bg: 'rgba(180,140,75,0.1)',
      border: 'rgba(180,140,75,0.25)',
      label: t('cigars.runningLow', { count: insights.runningLow.length }),
      onClick: () => navigate('/Cigars'),
    },
    insights.neglected.length > 0 && {
      key: 'neglected',
      icon: Clock,
      color: 'rgba(224,216,200,0.6)',
      bg: 'rgba(255,255,255,0.04)',
      border: 'rgba(140,107,63,0.2)',
      label: t('cigars.neglectedFavorites', { count: insights.neglected.length }),
      onClick: () => navigate('/Cigars'),
    },
  ].filter(Boolean);

  const alertHumidors = humidors.filter(humidorNeedsAttention).sort((a, b) => {
    const sa = getHumidorMaintenanceStatus(a);
    const sb = getHumidorMaintenanceStatus(b);
    if (sa === 'overdue' && sb !== 'overdue') return -1;
    if (sb === 'overdue' && sa !== 'overdue') return 1;
    return 0;
  });

  const quickLaunchActions = [
    {
      key: 'addCigar',
      Icon: Plus,
      label: t('cigars.addCigar'),
      onClick: () => navigate('/Cigars?action=add'),
    },
    {
      key: 'browseCollection',
      Icon: Cigarette,
      label: t('cigars.collection'),
      onClick: () => navigate('/Cigars'),
    },
    {
      key: 'logSession',
      Icon: BookOpen,
      label: t('cigars.logSession'),
      onClick: () => setSessionModalOpen(true),
    },
    {
      key: 'humidorManager',
      Icon: Grid3X3,
      label: t('cigars.humidors'),
      onClick: () => navigate('/Cigars?tab=humidors'),
    },
    {
      key: 'insights',
      Icon: BarChart3,
      label: t('nav.insights'),
      onClick: () => navigate('/CigarInsights'),
    },
    {
      key: 'curator',
      iconImage: CURATOR_ICON,
      label: t('quickActions.collectionCurator'),
      onClick: () => navigate('/Curator'),
    },
  ];

  const cigarStats = [
    { label: t('cigars.totalCigars'), value: cigars.length },
    { label: t('cigars.totalSticks'), value: insights.totalSticks ?? cigars.reduce((s, c) => s + (c.quantity || 1), 0) },
    { label: t('cigars.humidors'), value: humidors.length },
    { label: t('cigars.sessionsLogged'), value: sessions.length },
  ];

  return (
    <ModulePageShell
      title={t('cigarkeeper.title')}
      subtitle={t('cigarkeeper.description')}
      icon={
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="#D4A574" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="10" width="16" height="4" rx="2" />
          <line x1="18" y1="10" x2="22" y2="10" />
          <line x1="18" y1="14" x2="22" y2="14" />
          <path d="M20 7 Q21 5 19 3" />
          <path d="M17 8 Q18 6 16 4" />
        </svg>
      }
      accentColor="#8C6B3F"
      onBackToHub={() => navigate('/CollectionHub')}
      stats={cigarStats}
      moduleNav={<CigarKeeperModuleNav currentPageName={null} onLogSession={() => setSessionModalOpen(true)} />}
      actions={<ModuleQuickLaunch actions={quickLaunchActions} />}
    >
      <CigarHighlightCard cigars={cigars} sessions={sessions} humidors={humidors} />

      {actionItems.length > 0 && (
        <div className="space-y-2">
          {actionItems.map(({ key, icon: Icon, color, bg, border, label, onClick }) => (
            <button
              key={key}
              type="button"
              onClick={onClick}
              className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all hover:brightness-110"
              style={{ background: bg, border: `1px solid ${border}` }}
            >
              <Icon className="w-4 h-4 shrink-0" style={{ color }} />
              <span className="text-sm font-medium" style={{ color: '#F5F1E7' }}>{label}</span>
            </button>
          ))}
        </div>
      )}

      {highlights.length > 0 && (
        <ModuleHighlightsSection highlights={highlights} />
      )}

      {/* Humidor alerts */}
      {alertHumidors.length > 0 && (
        <div>
          <h2
            className="text-xs font-semibold uppercase tracking-[0.14em] mb-3"
            style={{ color: 'rgba(224,85,85,0.8)' }}
          >
            {t('cigars.humidorsNeedingAttention')}
          </h2>
          <div className="space-y-2">
            {alertHumidors.map((h) => (
                <HumidorAlertCard
                  key={h.id}
                  humidor={h}
                  t={t}
                  onManage={() => navigate('/Cigars?tab=humidors')}
                />
            ))}
          </div>
        </div>
      )}

      {recentSessions.length > 0 && (
        <div>
          <h2
            className="text-xs font-semibold uppercase tracking-[0.14em] mb-4"
            style={{ color: 'rgba(180,140,75,0.8)' }}
          >
            {t('cigars.recentSessions')}
          </h2>
          <div className="space-y-3">
            {recentSessions.map((session) => (
              <RecentSessionCard key={session.id} session={session} t={t} locale={lang} />
            ))}
          </div>
        </div>
      )}

      <CigarSessionModal
        isOpen={sessionModalOpen}
        onClose={() => setSessionModalOpen(false)}
        onSessionSaved={() => setSessionModalOpen(false)}
      />
    </ModulePageShell>
  );
}

// LockedModuleGuard is already applied by App.jsx's CigarReleaseRoute wrapper
export default function CigarKeeper() {
  return <CigarKeeperInner />;
}